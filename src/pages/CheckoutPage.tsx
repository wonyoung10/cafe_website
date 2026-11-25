import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import CartContents from '@/components/cart/CartContents';
import MethodGroup from '@/components/checkout/MethodGroup';
import MockPaymentDialog from '@/components/checkout/MockPaymentDialog';
import { Button, ButtonLink } from '@/components/common/Button';
import CommerceScreen from '@/components/orders/CommerceScreen';
import OrderSummary from '@/components/orders/OrderSummary';
import { useAuth, useCart, useCommerce } from '@/contexts';
import { menuFor } from '@/services/cartItems';
import { mapError } from '@/services/errors';
import type { PaymentMethod, ReceiveMethod } from '@/types/commerce';
import { paymentLabels, receiveLabels } from '@/utils/order';

function focusAlert(node: HTMLParagraphElement | null) {
  node?.focus();
}

function CheckoutForm() {
  const { api } = useCommerce();
  const { items, total, status, reload } = useCart();
  const navigate = useNavigate();
  const [receive, setReceive] = useState<ReceiveMethod | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [cartChecked, setCartChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const receiveRadio = useRef<HTMLInputElement>(null);
  const paymentRadio = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const active = useRef(false);

  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    // The cart store queues this read behind edits started before checkout.
    let current = true;
    const finish = () => { if (current) setCartChecked(true); };
    void reload().then(finish, finish);
    return () => { current = false; };
  }, [reload]);

  async function placeOrder() {
    if (locked.current || !receive || !payment || status !== 'ready' || !items.length) return;
    locked.current = true;
    setPending(true);
    setError('');
    let id: string;
    try {
      id = await api.orders.place(receive, payment);
    } catch (cause) {
      locked.current = false;
      if (active.current) {
        setPending(false);
        setDialogOpen(false);
        setError(mapError(cause).message);
      }
      return;
    }
    // The order is committed. A stale header count can be reloaded independently.
    void reload().catch(() => {});
    if (active.current) void navigate('/orders/' + encodeURIComponent(id), { replace: true });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || dialogOpen || status !== 'ready') return;
    setSubmitted(true);
    if (!receive || !payment) {
      (!receive ? receiveRadio : paymentRadio).current?.focus();
      return;
    }
    setError('');
    if (payment === 'online') setDialogOpen(true);
    else void placeOrder();
  }

  if (!cartChecked) return <p role="status">주문할 메뉴를 확인하고 있어요.</p>;
  const lines = items.map(item => {
    const { name, price } = menuFor(item.menuId);
    return { ...item, name, unitPrice: price };
  });
  return (
    <CartContents>
      <OrderSummary lines={lines} total={total} />
      <form noValidate onSubmit={submit} className="mt-8 space-y-6">
        <MethodGroup legend="받는 방법" options={receiveLabels} selected={receive} onChange={setReceive}
          disabled={pending} firstRadio={receiveRadio} error={submitted && !receive ? '받는 방법을 선택해 주세요.' : null} />
        <MethodGroup legend="결제 방법" options={paymentLabels} selected={payment} onChange={setPayment}
          disabled={pending} firstRadio={paymentRadio} error={submitted && !payment ? '결제 방법을 선택해 주세요.' : null} />
        <p className="border-l-2 border-sage pl-3 text-sm text-ink-soft">모의 주문이에요. 어떤 결제 방법을 선택해도 실제 결제는 이루어지지 않아요.</p>
        {error && (
          <div>
            <p role="alert" tabIndex={-1} ref={focusAlert} className="text-walnut">{error}</p>
            <ButtonLink to="/orders" variant="ghost" className="min-h-11">주문 내역 확인</ButtonLink>
          </div>
        )}
        <Button type="submit" size="lg" disabled={pending || status !== 'ready'}>
          {pending ? '주문 처리 중' : payment === 'online' ? '모의 결제하기' : '주문하기'}
        </Button>
      </form>
      {dialogOpen && <MockPaymentDialog total={total} pending={pending} onCancel={() => setDialogOpen(false)} onApprove={() => void placeOrder()} />}
    </CartContents>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  return <CommerceScreen title="결제"><CheckoutForm key={user?.id} /></CommerceScreen>;
}
