import { Check, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/common/Button';
import { useCommerce } from '@/contexts';
import { menuFor } from '@/services/cartItems';
import { approvePayment, failure, settleAttempt, type Failure, type Outcome, type PaymentRequest } from '@/services/mockPayment';
import { formatPrice } from '@/utils/menu';
import { lineName } from '@/utils/order';
import { approvalNumber, installmentLabel, paymentTiming } from '@/utils/payment';

export type CloseReason = 'cancel' | 'instrument' | 'cart';

type Phase =
  | { step: 'confirm' | 'verify' | 'approving' }
  | { step: 'approved'; orderId: string }
  | { step: 'failed'; failure: Failure };

interface Props {
  request: PaymentRequest;
  /** 승인 요청을 보내고 결과를 기다리는 중이거나 이미 승인된 동안 true */
  onBusyChange(busy: boolean): void;
  onClose(reason: CloseReason): void;
  /** 승인되었지만 결제창이 이미 사라진 경우에도 장바구니를 새로 읽게 한다 */
  onOrphaned(): void;
  onDone(orderId: string): void;
}

function Countdown({ onExpire }: { onExpire(): void }) {
  const [left, setLeft] = useState(Math.ceil(paymentTiming.verify / 1000));
  const expire = useRef(onExpire);
  useEffect(() => { expire.current = onExpire; });
  useEffect(() => {
    // 탭이 뒤로 가면 타이머가 늦어지므로 남은 시간은 시계로 계산한다.
    const end = Date.now() + paymentTiming.verify;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) { clearInterval(timer); expire.current(); }
    }, 250);
    return () => clearInterval(timer);
  }, []);
  return (
    <p role="timer" aria-live="off" className="mt-3 text-sm tabular-nums text-ink-soft">
      남은 시간 {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </p>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid gap-2 sm:grid-cols-2">{children}</div>;
}

export default function PaymentDialog({ request, onBusyChange, onClose, onOrphaned, onDone }: Props) {
  const { api } = useCommerce();
  const { instrument, months, total, items, userId } = request;
  const [phase, setPhase] = useState<Phase>({ step: 'confirm' });
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const dismissed = useRef(false);
  const { step } = phase;
  const busy = step === 'approving' || step === 'approved';
  const orderId = step === 'approved' ? phase.orderId : null;

  useLayoutEffect(() => {
    const modal = dialog.current!;
    mounted.current = true;
    modal.showModal();
    return () => { mounted.current = false; modal.close(); };
  }, []);

  // 단계가 바뀔 때마다 새 제목으로 초점을 옮긴다. 버튼이 아니므로 Enter 연타가 다음 단계를 누르지 않는다.
  useLayoutEffect(() => { heading.current?.focus(); }, [step]);

  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (!orderId) return;
    const timer = setTimeout(() => onDone(orderId), paymentTiming.approved);
    return () => clearTimeout(timer);
  }, [orderId, onDone]);

  async function run(task: () => Promise<Outcome>) {
    if (locked.current) return;
    locked.current = true;
    setPhase({ step: 'approving' });
    const outcome = await task();
    locked.current = false;
    if (mounted.current) setPhase('orderId' in outcome ? { step: 'approved', orderId: outcome.orderId } : { step: 'failed', failure: outcome.failure });
    else if ('orderId' in outcome) onOrphaned();
  }

  const approve = () => void run(() => approvePayment(api, request, () => mounted.current));
  const recheck = () => void run(async () => await settleAttempt(api, userId)
    ?? { failure: failure('rejected', '승인되지 않은 것을 확인했어요. 다시 결제해도 괜찮아요.') });

  function close(reason: CloseReason) {
    // Esc 하나에 keydown과 cancel이 함께 올 수 있다. 방문 기록을 두 칸 되돌리지 않게 한 번만 닫는다.
    if (dismissed.current) return;
    dismissed.current = true;
    onClose(reason);
  }

  function dismiss() {
    if (orderId) onDone(orderId);
    else if (!busy) close(step === 'failed' && (phase.failure.code === 'changed' || phase.failure.code === 'consumed') ? 'cart' : 'cancel');
  }

  function escape(event: KeyboardEvent) {
    // 브라우저가 창을 강제로 닫지 않게 Esc를 직접 처리한다.
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (!event.repeat) dismiss();
  }

  function ignoreRepeatedClick(event: MouseEvent) {
    // 단계가 바뀌면 같은 자리에 다음 단계의 버튼이 온다. 더블클릭의 두 번째 클릭이 그 버튼을 누르지 않게 한다.
    if (event.detail > 1) { event.preventDefault(); event.stopPropagation(); }
  }

  const first = items[0]!;
  const goods = lineName(menuFor(first.menuId).name, first.temperature) + (items.length > 1 ? ` 외 ${items.length - 1}건` : '');
  const titleClass = 'font-serif text-xl font-bold text-forest outline-none';

  return (
    <dialog ref={dialog} aria-labelledby="payment-title" aria-describedby="payment-notice" aria-busy={step === 'approving'}
      onClickCapture={ignoreRepeatedClick} onKeyDown={escape} onCancel={event => { event.preventDefault(); dismiss(); }}
      onClose={() => { if (mounted.current && !dialog.current?.open) { dialog.current?.showModal(); dismiss(); } }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-leaf bg-ivory text-ink shadow-lift backdrop:bg-ink/50">
      <div className="bg-forest px-6 py-4 text-ivory">
        <h2 id="payment-title" className="text-sm">하루의 잎 결제</h2>
        <p className="font-serif text-2xl font-bold tabular-nums">결제 금액 {formatPrice(total)}</p>
      </div>
      <p id="payment-notice" className="bg-walnut-soft px-6 py-2 text-sm text-walnut">모의 결제예요. 실제 결제는 이루어지지 않아요.</p>
      <div className="p-6">
        {step === 'confirm' && (
          <>
            <h3 ref={heading} tabIndex={-1} className={titleClass}>결제 내용 확인</h3>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="text-ink-soft">상품</dt><dd>{goods}</dd>
              <dt className="text-ink-soft">결제수단</dt><dd>{instrument.name}</dd>
              {instrument.kind === 'card' && <><dt className="text-ink-soft">할부</dt><dd>{installmentLabel(months)}</dd></>}
            </dl>
            <Actions>
              <Button variant="secondary" onClick={dismiss}>취소</Button>
              <Button onClick={() => setPhase({ step: 'verify' })}>인증 요청하기</Button>
            </Actions>
          </>
        )}
        {step === 'verify' && (
          <>
            <h3 ref={heading} tabIndex={-1} className={titleClass}>{instrument.name} 앱 인증</h3>
            <div className="mt-4 rounded-leaf border border-line bg-cream p-4">
              <p className="font-semibold">{instrument.name} 가상 앱</p>
              <p>하루의 잎에서 {formatPrice(total)} 결제를 요청했어요. 승인할까요?</p>
              <Countdown onExpire={() => setPhase({ step: 'failed', failure: failure('expired') })} />
            </div>
            <Actions>
              <Button variant="secondary" onClick={() => setPhase({ step: 'failed', failure: failure('refused') })}>거절하기</Button>
              <Button onClick={approve}>인증하고 결제하기</Button>
            </Actions>
          </>
        )}
        {step === 'approving' && (
          <div className="py-6 text-center">
            <LoaderCircle aria-hidden className="mx-auto mb-4 size-10 animate-spin text-sage" />
            <h3 ref={heading} tabIndex={-1} className={titleClass}>승인을 요청하고 있어요</h3>
            <p role="status" className="mt-2 text-ink-soft">창을 닫거나 새로고침하지 말고 잠시 기다려 주세요.</p>
          </div>
        )}
        {step === 'approved' && (
          <div className="text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-leaf-sm bg-sprout text-forest-deep"><Check aria-hidden className="size-7" /></span>
            <h3 ref={heading} tabIndex={-1} className={titleClass}>결제가 승인됐어요</h3>
            <p className="mt-2 tabular-nums">승인 번호 {approvalNumber(phase.orderId)}</p>
            <Button className="mt-6 w-full" onClick={() => onDone(phase.orderId)}>주문 확인하기</Button>
          </div>
        )}
        {step === 'failed' && (
          <>
            <TriangleAlert aria-hidden className="mb-3 size-8 text-walnut" />
            <h3 ref={heading} tabIndex={-1} className={titleClass}>{phase.failure.title}</h3>
            <p role="alert" className="mt-2">{phase.failure.message}</p>
            {!['consumed', 'unconfirmed'].includes(phase.failure.code) && (
              <p className="mt-1 text-sm text-ink-soft">주문은 접수되지 않았고 장바구니는 그대로예요.</p>
            )}
            <Actions>
              {['consumed', 'unconfirmed'].includes(phase.failure.code)
                ? <ButtonLink to="/orders" variant="secondary">주문 내역 보기</ButtonLink>
                : <Button variant="secondary" onClick={dismiss}>결제 그만두기</Button>}
              {phase.failure.code === 'limit' || phase.failure.code === 'balance'
                ? <Button onClick={() => close('instrument')}>다른 결제수단 고르기</Button>
                : phase.failure.code === 'changed'
                  ? <Button onClick={() => close('cart')}>금액 다시 확인하기</Button>
                  : phase.failure.code === 'unconfirmed'
                    ? <Button onClick={recheck}>결과 다시 확인하기</Button>
                    : phase.failure.code === 'consumed'
                      ? <Button onClick={() => close('cart')}>닫기</Button>
                      : <Button onClick={() => setPhase({ step: 'confirm' })}>다시 시도하기</Button>}
            </Actions>
          </>
        )}
      </div>
    </dialog>
  );
}
