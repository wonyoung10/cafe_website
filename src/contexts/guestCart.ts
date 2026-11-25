import { changeCart } from '@/services/cartItems';
import type { CartItem } from '@/types/commerce';

export const guestKey = 'haru-leaf:guest-cart';

export function readGuestCart(): CartItem[] {
  const lines: CartItem[] = [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(guestKey) ?? '[]');
    if (Array.isArray(raw)) {
      for (const item of raw) {
        try { changeCart(lines, item, 'add'); } catch { /* Ignore invalid stored lines. */ }
      }
    }
  } catch { /* Storage can be unavailable or contain invalid JSON. */ }
  return lines;
}

let pending = Promise.resolve();

export async function withGuestCart<T>(action: () => Promise<T> | T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(guestKey, action);
  const task = pending.then(action);
  pending = task.then(() => {}, () => {});
  return task;
}
