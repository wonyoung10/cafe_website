import type { OrderLine } from '@/types/commerce';
import { formatPrice } from '@/utils/menu';
import { lineKey, lineName } from '@/utils/order';

export default function OrderSummary({ lines, total }: { lines: OrderLine[]; total: number }) {
  return (
    <section aria-label="주문 요약" className="rounded-leaf border border-line bg-cream p-5 sm:p-7">
      <h2 className="font-serif text-xl font-bold text-forest">주문 요약</h2>
      <ul className="mt-3 divide-y divide-line">
        {lines.map(line => (
          <li key={lineKey(line)} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
            <div><p>{lineName(line.name, line.temperature)}</p>
              <p className="text-sm text-ink-soft">{formatPrice(line.unitPrice)} × {line.quantity}개</p>
            </div>
            <span className="tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 font-serif text-xl font-bold text-forest">
        <span>합계</span><span>{formatPrice(total)}</span>
      </p>
    </section>
  );
}
