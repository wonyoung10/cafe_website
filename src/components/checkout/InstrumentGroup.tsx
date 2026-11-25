import { useId, type Ref } from 'react';
import { INSTALLMENT_MINIMUM, INSTRUMENTS, type Instrument, type InstrumentKind } from '@/data/payments';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/menu';
import { installmentLabel, installmentOptions } from '@/utils/payment';

const kinds: [InstrumentKind, string][] = [['card', '카드'], ['wallet', '간편결제']];

interface Props {
  selected: Instrument | null;
  months: number;
  total: number;
  error: string | null;
  disabled: boolean;
  firstRadio: Ref<HTMLInputElement>;
  onSelect(id: string): void;
  onMonths(months: number): void;
}

export default function InstrumentGroup({ selected, months, total, error, disabled, firstRadio, onSelect, onMonths }: Props) {
  const id = useId();
  const options = installmentOptions(selected, total);
  return (
    <div>
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="font-serif text-xl font-bold text-forest">결제수단</legend>
        <p className="mb-3 text-sm text-ink-soft">모두 이 사이트에서만 쓰는 가상 결제수단이에요. 카드번호는 입력하지 않아요.</p>
        {kinds.map(([kind, label]) => (
          <div key={kind} className="mb-4">
            <p id={id + kind} className="mb-2 text-sm font-semibold text-ink-soft">{label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {INSTRUMENTS.filter(instrument => instrument.kind === kind).map(instrument => (
                <label key={instrument.id} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-leaf-sm border border-line px-4 py-2 has-checked:border-forest has-checked:bg-sage-soft">
                  <input ref={instrument === INSTRUMENTS[0] ? firstRadio : undefined} required type="radio" name={id} value={instrument.id}
                    aria-label={instrument.name} aria-invalid={Boolean(error)}
                    aria-describedby={cn(id + instrument.id, id + kind, error && id + '-error')}
                    checked={selected?.id === instrument.id} onChange={() => onSelect(instrument.id)} className="accent-forest" />
                  <span aria-hidden className={cn('h-7 w-11 shrink-0 rounded-leaf-sm border border-ink/10', instrument.face)} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{instrument.name}</span>
                    <span id={id + instrument.id} className="block text-sm text-ink-soft">{instrument.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {error && <p role="alert" id={id + '-error'} className="text-sm text-walnut">{error}</p>}
      </fieldset>
      {selected?.kind === 'card' && (options.length > 1 ? (
        <label className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">할부</span>
          <select value={months} disabled={disabled} onChange={event => onMonths(Number(event.target.value))}
            className="h-11 rounded-leaf-sm border border-line bg-ivory px-4">
            {options.map(value => <option key={value} value={value}>{installmentLabel(value)}</option>)}
          </select>
        </label>
      ) : (
        <p className="text-sm text-ink-soft">
          일시불로 결제해요. {selected.installments ? `할부는 ${formatPrice(INSTALLMENT_MINIMUM)}부터 고를 수 있어요.` : '체크카드는 할부를 쓸 수 없어요.'}
        </p>
      ))}
    </div>
  );
}
