import { useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { menuFor } from '@/services/cartItems';
import { useAuth } from './auth';
import { useCommerce } from './commerce';
import { CartContext } from './cart';
import { createCartStore } from './cartStore';

export function CartProvider({ children }: { children: ReactNode }) {
  const { api } = useCommerce();
  const { user, status } = useAuth();
  const owner = status === 'loading' ? undefined : user?.id ?? null;
  const store = useMemo(() => createCartStore(api.cart), [api]);
  useLayoutEffect(() => { store.activate(owner); }, [store, owner]);
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  const count = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.items.reduce((sum, item) => sum + menuFor(item.menuId).price * item.quantity, 0);
  return <CartContext.Provider value={{ ...state, ...store.actions, count, total }}>{children}</CartContext.Provider>;
}
