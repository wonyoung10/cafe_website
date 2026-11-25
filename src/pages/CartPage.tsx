import { useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button, ButtonLink } from '@/components/common/Button';
import CartContents from '@/components/cart/CartContents';
import CommerceScreen from '@/components/orders/CommerceScreen';
import { useAuth, useCart } from '@/contexts';
import { menuFor } from '@/services/cartItems';
import type { CartItem } from '@/types/commerce';
import { formatPrice } from '@/utils/menu';
import { lineKey, lineName } from '@/utils/order';

function CartLines() {
  const cart = useCart();
  const { status } = useAuth();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  // 처리 중이거나 한도에 닿아도 버튼을 disabled로 바꾸지 않는다. 누른 버튼의 키보드 초점이 사라지기 때문이다.
  const locked = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusAfter = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (busy) return;
    if (confirm) cancelButton.current?.focus();
    else if (focusAfter.current !== null) {
      const target = removeButtons.current.get(focusAfter.current) ?? list.current?.querySelector<HTMLAnchorElement>('a[href="/menu"]');
      target?.focus();
      focusAfter.current = null;
    }
  }, [confirm, busy]);

  async function change(item: CartItem, quantity: number | 'remove') {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice('');
    const name = lineName(menuFor(item.menuId).name, item.temperature);
    try {
      if (quantity === 'remove') {
        const index = cart.items.indexOf(item);
        const next = cart.items[index + 1] ?? cart.items[index - 1];
        await cart.remove(item.menuId, item.temperature);
        focusAfter.current = next ? lineKey(next) : '';
        setConfirm(null);
        setNotice(name + ' 메뉴를 삭제했어요.');
      } else {
        await cart.setQuantity({ ...item, quantity });
        setNotice(name + ' 수량을 ' + quantity + '개로 변경했어요.');
      }
    } catch {
      // CartContents announces the store error and offers a fresh read.
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div ref={list}>
      <CartContents>
        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map(item => {
            const key = lineKey(item);
            const menu = menuFor(item.menuId);
            const name = lineName(menu.name, item.temperature);
            return (
              <li key={key} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xl font-bold text-forest">{name}</h2>
                  <strong className="tabular-nums">{formatPrice(menu.price * item.quantity)}</strong>
                </div>
                <p className="text-sm text-ink-soft">개당 {formatPrice(menu.price)}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div role="group" aria-label={name + ' 수량'} className="inline-flex items-center rounded-leaf-sm border border-line">
                    <button type="button" aria-label={name + ' 수량 줄이기'} aria-disabled={busy || item.quantity <= 1}
                      onClick={() => { if (item.quantity > 1) void change(item, item.quantity - 1); }} className="grid size-11 place-items-center text-forest aria-disabled:opacity-40">
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="min-w-8 text-center tabular-nums">{item.quantity}개</span>
                    <button type="button" aria-label={name + ' 수량 늘리기'} aria-disabled={busy || item.quantity >= 20}
                      onClick={() => { if (item.quantity < 20) void change(item, item.quantity + 1); }} className="grid size-11 place-items-center text-forest aria-disabled:opacity-40">
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                  <button type="button" ref={node => { if (node) removeButtons.current.set(key, node); else removeButtons.current.delete(key); }}
                    aria-label={name + ' 삭제'} aria-disabled={busy} onClick={() => { if (!busy) setConfirm(key); }}
                    className="min-h-11 min-w-11 text-sm text-walnut underline underline-offset-4">삭제</button>
                </div>
                {confirm === key && (
                  <div role="group" aria-label={name + ' 삭제 확인'} className="mt-3 rounded-leaf bg-cream p-4">
                    <p id="remove-prompt">{name} 메뉴를 장바구니에서 삭제할까요?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" ref={cancelButton} disabled={busy} aria-describedby="remove-prompt"
                        className="min-h-11 min-w-11 rounded-leaf-sm text-forest" onClick={() => { focusAfter.current = key; setConfirm(null); }}>취소</button>
                      <Button variant="secondary" disabled={busy} onClick={() => void change(item, 'remove')}>삭제하기</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="my-5 flex flex-wrap items-baseline justify-between gap-2 font-serif text-xl font-bold text-forest">
          <span>합계</span><span>{formatPrice(cart.total)}</span>
        </p>
        {busy || cart.status !== 'ready' || status === 'loading' ? <Button disabled>결제하기</Button> : (
          <ButtonLink to={status === 'guest' ? '/login?next=/checkout' : '/checkout'}>결제하기</ButtonLink>
        )}
      </CartContents>
      <p role="status" className="mt-2 text-sm text-forest empty:sr-only">{notice}</p>
    </div>
  );
}

export default function CartPage() {
  const { user } = useAuth();
  return <CommerceScreen title="장바구니"><CartLines key={user?.id} /></CommerceScreen>;
}
