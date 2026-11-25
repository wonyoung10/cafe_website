import type { CommerceApi } from '@/services/commerceApi';
import { changeCart } from '@/services/cartItems';
import { CommerceError } from '@/services/errors';
import type { CartItem } from '@/types/commerce';
import type { CartState } from './cart';
import { guestKey, readGuestCart, withGuestCart } from './guestCart';

// undefined = resolving auth, null = guest, string = member.
type Owner = string | null | undefined;
export function createCartStore(cart: CommerceApi['cart']) {
  let owner: Owner;
  let generation = 0;
  let queue = Promise.resolve();
  let hideRetainedGuest = false;
  let state: CartState = { status: 'loading', items: [] };
  const listeners = new Set<() => void>();

  function publish(status: CartState['status'], items: CartItem[]) {
    state = { status, items };
    listeners.forEach(listener => listener());
  }

  function schedule(work: (current: () => boolean) => Promise<void>) {
    const ticket = generation;
    const current = () => ticket === generation;
    const task = queue.then(async () => {
      if (!current()) throw new CommerceError('not-authenticated');
      try { await work(current); }
      catch (error) {
        if (current()) publish('error', state.items);
        throw error;
      }
    });
    queue = task.catch(() => {});
    return task;
  }

  function reload() {
    return schedule(async current => {
      if (owner === undefined) return;
      if (owner === null) {
        publish('ready', hideRetainedGuest ? [] : readGuestCart());
        return;
      }
      await withGuestCart(async () => {
        const guest = readGuestCart();
        if (!current() || !guest.length) return;
        await cart.merge(guest);
        localStorage.removeItem(guestKey);
      });
      if (!current()) return;
      const items = await cart.list();
      if (current()) publish('ready', items);
    });
  }

  function mutate(item: CartItem, mode: 'add' | 'set' | 'remove') {
    return schedule(async current => {
      if (owner === undefined) throw new CommerceError('not-authenticated');
      if (owner === null) {
        await withGuestCart(() => {
          if (!current()) return;
          const lines = readGuestCart();
          changeCart(lines, item, mode);
          localStorage.setItem(guestKey, JSON.stringify(lines));
          hideRetainedGuest = false;
          publish('ready', lines);
        });
        return;
      }
      if (mode === 'add') await cart.add(item);
      else if (mode === 'set') await cart.setQuantity(item);
      else await cart.remove(item.menuId, item.temperature);
      if (!current()) return;
      const lines = await cart.list();
      if (current()) publish('ready', lines);
    });
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    activate(next: Owner) {
      if (next === owner) return;
      hideRetainedGuest = typeof owner === 'string' && next === null;
      owner = next;
      generation++;
      // An old account's slow list must never delay a new account's first read.
      queue = Promise.resolve();
      if (typeof next === 'string') {
        publish('loading', []);
        void reload().catch(() => {});
      } else {
        publish(next === null ? 'ready' : 'loading', next === null && !hideRetainedGuest ? readGuestCart() : []);
      }
    },
    actions: {
      reload,
      add: (item: CartItem) => mutate(item, 'add'),
      setQuantity: (item: CartItem) => mutate(item, 'set'),
      remove: (menuId: string, temperature: CartItem['temperature']) => mutate({ menuId, temperature, quantity: 1 }, 'remove'),
    },
  };
}
