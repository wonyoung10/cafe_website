import { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/menu';

interface Props {
  total: number;
  pending: boolean;
  onApprove(): void;
  onCancel(): void;
}

export default function MockPaymentDialog({ total, pending, onApprove, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="payment-title" aria-describedby="payment-amount"
      onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}
      className="fixed inset-0 m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-leaf bg-ivory p-6 text-ink shadow-lift backdrop:bg-ink/50">
      <h2 id="payment-title" className="font-serif text-2xl font-bold text-forest">모의 결제</h2>
      <p className="mt-2 text-ink-soft">승인하면 주문이 접수돼요. 실제 결제는 이루어지지 않아요.</p>
      <p id="payment-amount" className="my-5 font-semibold">결제 금액 {formatPrice(total)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>취소</Button>
        <Button disabled={pending} onClick={onApprove}>{pending ? '주문 처리 중' : '모의 결제 승인'}</Button>
      </div>
    </dialog>
  );
}
