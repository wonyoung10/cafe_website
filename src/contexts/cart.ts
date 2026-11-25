import { createContext, useContext } from 'react';
import type { CommerceApi } from '@/services/commerceApi';
import type { CartItem } from '@/types/commerce';
import { CommerceError } from '@/services/errors';

export type CartState = { status: 'loading' | 'ready' | 'error'; items: CartItem[] };
type Cart = CartState & Pick<CommerceApi['cart'], 'add' | 'setQuantity' | 'remove'> & {
  reload(): Promise<void>;
  count: number;
  total: number;
};
const unavailable = async () => { throw new CommerceError('not-configured'); };
export const CartContext = createContext<Cart>({
  status: 'ready', items: [], count: 0, total: 0, add: unavailable, setQuantity: unavailable, remove: unavailable, reload: async () => {},
});
export const useCart = () => useContext(CartContext);
