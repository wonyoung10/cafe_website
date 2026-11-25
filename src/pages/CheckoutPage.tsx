import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CartContents from '@/components/cart/CartContents';
import InstrumentGroup from '@/components/checkout/InstrumentGroup';
import MethodGroup from '@/components/checkout/MethodGroup';
import PaymentDialog, { type CloseReason } from '@/components/checkout/PaymentDialog';
import { Button, ButtonLink } from '@/components/common/Button';
import CommerceScreen from '@/components/orders/CommerceScreen';
import OrderSummary from '@/components/orders/OrderSummary';
import { useAuth, useCart, useCommerce } from '@/contexts';
import { menuFor } from '@/services/cartItems';
import { mapError } from '@/services/errors';
import { settleAttempt, type PaymentRequest } from '@/services/mockPayment';
import { readAttempt, readDraft, saveDraft } from '@/services/paymentRecords';
import type { PaymentMethod, ReceiveMethod } from '@/types/commerce';
import { formatPrice } from '@/utils/menu';
import { paymentLabels, receiveLabels } from '@/utils/order';
import { installmentOptions, instrumentFor } from '@/utils/payment';

function focusAlert(node: HTMLParagraphElement | null) {
  node?.focus();
}

function payWindowOf(state: unknown): string | null {
  return state && typeof state === 'object' && 'payWindow' in state ? String(state.payWindow) : null;
}

function CheckoutForm({ userId }: { userId: string }) {
  const { api } = useCommerce();
  const { items, total, status, reload } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [draft] = useState(() => readDraft(userId));
  const [receive, setReceive] = useState<ReceiveMethod | null>(draft?.receive ?? null);
  const [payment, setPayment] = useState<PaymentMethod | null>(draft?.payment ?? null);
  const [instrumentId, setInstrumentId] = useState(draft?.instrumentId ?? null);
  const [pickedMonths, setMonths] = useState(draft?.months ?? 0);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [paying, setPaying] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  // 결제창은 방문 기록 한 칸을 쓴다. 뒤로 가기로 닫히고, 새로고침 뒤에는 표시가 맞지 않아 열리지 않는다.
  const [token] = useState(() => Math.random().toString(36).slice(2));
  const payWindow = payWindowOf(location.state);
  const inPayWindow = payWindow === token;
  const dialogOpen = request !== null && (inPayWindow || paying);
  const receiveRadio = useRef<HTMLInputElement>(null);
  const paymentRadio = useRef<HTMLInputElement>(null);
  const instrumentRadio = useRef<HTMLInputElement>(null);
  const focusInstrument = useRef(false);
  const locked = useRef(false);
  const opening = useRef(false);
  const active = useRef(false);
  const leftStaleWindow = useRef(false);

  const instrument = instrumentFor(instrumentId);
  const months = installmentOptions(instrument, total).includes(pickedMonths) ? pickedMonths : 0;

  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => { saveDraft(userId, { receive, payment, instrumentId, months: pickedMonths }); }, [userId, receive, payment, instrumentId, pickedMonths]);

  useEffect(() => {
    // The cart store queues this read behind edits started before checkout.
    let current = true;
    async function prepare() {
      const interrupted = readAttempt(userId) !== null;
      await reload().catch(() => {});
      const outcome = interrupted ? await settleAttempt(api, userId) : null;
      if (!current) return;
      if (outcome && 'orderId' in outcome) {
        // 새로고침 전에 승인된 결제다. 다시 결제하지 않고 영수증을 연다.
        saveDraft(userId, null);
        void reload().catch(() => {});
        void navigate('/orders/' + encodeURIComponent(outcome.orderId), { replace: true, state: { completed: true } });
        return;
      }
      if (outcome) setNotice('이전 결제의 결과를 확인하지 못했어요. 주문 내역을 먼저 확인해 주세요.');
      else if (interrupted) setNotice('이전 결제는 승인되지 않았어요. 결제 내용을 확인하고 다시 시도해 주세요.');
      setReady(true);
    }
    void prepare();
    return () => { current = false; };
    // navigate는 주소 상태가 바뀔 때마다 새로 만들어지므로 처음 한 번만 확인한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, userId, reload]);

  useEffect(() => { if (inPayWindow) opening.current = false; }, [inPayWindow, location.key]);

  useEffect(() => {
    // 새로고침·앞으로 가기로 되살아난 결제창 기록은 건너뛴다.
    if (!payWindow || inPayWindow || leftStaleWindow.current) return;
    leftStaleWindow.current = true;
    void navigate(-1);
  }, [payWindow, inPayWindow, navigate]);

  useEffect(() => {
    // 승인을 기다리는 동안 뒤로 가기를 누르면 결제창 기록을 다시 쌓아 결과를 끝까지 보여 준다.
    if (paying && !placed && !inPayWindow) void navigate(location.pathname, { state: { payWindow: token } });
  }, [paying, placed, inPayWindow, navigate, location.pathname, token]);

  useEffect(() => {
    if (!paying || placed) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [paying, placed]);

  useEffect(() => {
    // 결제창 기록을 먼저 빼고 결제 화면을 주문 화면으로 바꾼다. 주문 화면에서 뒤로 가면 장바구니로 돌아간다.
    if (!placed) return;
    if (inPayWindow) void navigate(-1);
    else void navigate('/orders/' + encodeURIComponent(placed), { replace: true, state: { completed: true } });
  }, [placed, inPayWindow, location.key, navigate]);

  useEffect(() => {
    if (dialogOpen || !focusInstrument.current) return;
    focusInstrument.current = false;
    instrumentRadio.current?.focus();
  }, [dialogOpen]);

  const refreshCart = useCallback(() => { void reload().catch(() => {}); }, [reload]);

  const finish = useCallback((orderId: string) => {
    // The order is committed. A stale header count can be reloaded independently.
    refreshCart();
    saveDraft(userId, null);
    setPlaced(orderId);
  }, [refreshCart, userId]);

  async function placeOnsite(method: ReceiveMethod) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError('');
    try {
      const id = await api.orders.place(method, 'onsite');
      if (active.current) finish(id);
      else refreshCart();
    } catch (cause) {
      locked.current = false;
      if (active.current) {
        setPending(false);
        setError(mapError(cause).message);
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || opening.current || dialogOpen || placed || status !== 'ready' || !items.length) return;
    setSubmitted(true);
    if (!receive) receiveRadio.current?.focus();
    else if (!payment) paymentRadio.current?.focus();
    else if (payment === 'onsite') void placeOnsite(receive);
    else if (!instrument) instrumentRadio.current?.focus();
    else {
      setError('');
      setNotice('');
      // 주소는 조금 늦게 바뀐다. 더블클릭으로 방문 기록이 두 칸 쌓이지 않게 막는다.
      opening.current = true;
      setRequest({ userId, receive, instrument, months, total, items });
      void navigate(location.pathname, { state: { payWindow: token } });
    }
  }

  function closeDialog(reason: CloseReason) {
    if (reason === 'cart') refreshCart();
    focusInstrument.current = reason === 'instrument';
    opening.current = false;
    setRequest(null);
    if (inPayWindow) void navigate(-1);
  }

  if (!ready) return <p role="status">주문할 메뉴를 확인하고 있어요.</p>;
  const lines = items.map(item => {
    const { name, price } = menuFor(item.menuId);
    return { ...item, name, unitPrice: price };
  });
  return (
    <>
      {notice && (
        <div className="mb-6 rounded-leaf bg-walnut-soft p-4 text-walnut">
          <p role="alert">{notice}</p>
          <ButtonLink to="/orders" variant="ghost" className="min-h-11">주문 내역 확인</ButtonLink>
        </div>
      )}
      <CartContents>
        <OrderSummary lines={lines} total={total} />
        <form noValidate onSubmit={submit} className="mt-8 space-y-6">
          <MethodGroup legend="받는 방법" options={receiveLabels} selected={receive} onChange={setReceive}
            disabled={pending} firstRadio={receiveRadio} error={submitted && !receive ? '받는 방법을 선택해 주세요.' : null} />
          <MethodGroup legend="결제 방법" options={paymentLabels} selected={payment} onChange={setPayment}
            disabled={pending} firstRadio={paymentRadio} error={submitted && !payment ? '결제 방법을 선택해 주세요.' : null} />
          {payment === 'online' && (
            <InstrumentGroup selected={instrument} months={months} total={total} disabled={pending} firstRadio={instrumentRadio}
              error={submitted && !instrument ? '결제수단을 선택해 주세요.' : null} onSelect={setInstrumentId} onMonths={setMonths} />
          )}
          <p className="border-l-2 border-sage pl-3 text-sm text-ink-soft">모의 주문이에요. 어떤 결제 방법을 선택해도 실제 결제는 이루어지지 않아요.</p>
          {error && (
            <div>
              <p role="alert" tabIndex={-1} ref={focusAlert} className="text-walnut">{error}</p>
              <ButtonLink to="/orders" variant="ghost" className="min-h-11">주문 내역 확인</ButtonLink>
            </div>
          )}
          <Button type="submit" size="lg" disabled={pending || status !== 'ready'}>
            {pending ? '주문 처리 중' : payment === 'online' ? formatPrice(total) + ' 결제하기' : '주문하기'}
          </Button>
        </form>
      </CartContents>
      {dialogOpen && request && (
        <PaymentDialog request={request} onBusyChange={setPaying} onClose={closeDialog} onOrphaned={refreshCart} onDone={finish} />
      )}
    </>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  return <CommerceScreen title="결제">{user && <CheckoutForm key={user.id} userId={user.id} />}</CommerceScreen>;
}
