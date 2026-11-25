import { useId, useRef, useState } from 'react';
import { Button } from '@/components/common/Button';
import { useCart } from '@/contexts';
import { mapError } from '@/services/errors';
import type { MenuItem, Temperature } from '@/types/menu';
import { lineName } from '@/utils/order';

export default function AddToCart({ item }: { item: MenuItem }) {
  const { add, status, items } = useCart();
  const group = useId();
  const [temperature, setTemperature] = useState<Temperature | null>(item.temperatures[0] ?? null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  async function addOne() {
    if (lock.current || status === 'loading') return;
    const name = lineName(item.name, temperature);
    setError('');
    if (items.some(line => line.menuId === item.id && line.temperature === temperature && line.quantity >= 20)) {
      setMessage(name + ' 메뉴는 최대 20개까지 담을 수 있어요.');
      return;
    }
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      await add({ menuId: item.id, temperature, quantity: 1 });
      setMessage(name + ' 메뉴를 장바구니에 담았어요.');
    } catch (cause) {
      setError(mapError(cause).message);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {item.temperatures.length > 1 && (
          <fieldset disabled={pending} className="mr-auto flex min-w-0 gap-1">
            <legend className="sr-only">{item.name} 온도</legend>
            {item.temperatures.map(option => (
              <label key={option} className="relative cursor-pointer">
                <input type="radio" name={group} value={option} checked={temperature === option}
                  onChange={() => { setTemperature(option); setMessage(''); setError(''); }} className="peer sr-only" />
                <span className="grid size-11 place-items-center rounded-leaf-sm border border-line text-xs font-semibold text-ink-soft peer-checked:border-forest peer-checked:bg-sage-soft peer-checked:text-forest peer-focus-visible:outline-2 peer-focus-visible:outline-forest">
                  {option.toUpperCase()}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {/* disabled로 바꾸면 키보드 초점이 사라지므로 aria-disabled로 알리고 addOne이 중복을 막는다 */}
        <Button aria-disabled={pending || status === 'loading'} className="aria-disabled:opacity-50" onClick={() => void addOne()}>담기</Button>
      </div>
      <p role={message ? 'status' : undefined} aria-live="polite" aria-atomic="true" className="mt-2 text-sm text-forest empty:sr-only">{message}</p>
      {error && <p role="alert" className="mt-2 text-sm text-walnut">{error}</p>}
    </div>
  );
}
