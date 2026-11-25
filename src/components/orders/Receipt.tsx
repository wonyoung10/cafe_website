import { readReceipt } from '@/services/paymentRecords';
import type { Order } from '@/types/commerce';
import { formatPrice } from '@/utils/menu';
import { formatDateTime } from '@/utils/order';
import { approvalNumber, installmentLabel, instrumentFor } from '@/utils/payment';

/** 온라인(모의) 결제 영수증. 금액·승인 시각은 저장된 주문 값이고, 결제수단은 결제한 브라우저에만 남아 있다. */
export default function Receipt({ order }: { order: Order }) {
  const choice = readReceipt(order.id);
  const instrument = instrumentFor(choice?.instrumentId);
  return (
    <section aria-labelledby="receipt-heading" className="mt-8 rounded-leaf border border-line bg-cream p-5 sm:p-7">
      <h2 id="receipt-heading" className="font-serif text-xl font-bold text-forest">영수증</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-dashed border-ink-soft/40 py-4 [&>dd]:text-right [&>dt]:text-ink-soft">
        <dt>결제수단</dt><dd>{instrument?.name ?? '온라인 결제'}</dd>
        {choice && instrument?.kind === 'card' && <><dt>할부</dt><dd>{installmentLabel(choice.months)}</dd></>}
        <dt>승인 번호</dt><dd className="tabular-nums">{approvalNumber(order.id)}</dd>
        <dt>승인 시각</dt><dd><time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time></dd>
        <dt>승인 금액</dt><dd className="font-semibold tabular-nums">{formatPrice(order.total)}</dd>
      </dl>
      <p className="mt-3 text-sm text-walnut">모의 결제 영수증이에요. 실제 결제는 이루어지지 않았고 결제 증빙으로 쓸 수 없어요.</p>
    </section>
  );
}
