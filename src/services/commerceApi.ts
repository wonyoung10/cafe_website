import type { CartItem, Order, PaymentMethod, PhotoChange, ReceiveMethod, ReviewInput, ReviewSort, ReviewView, SessionUser } from '@/types/commerce';
import type { Temperature } from '@/types/menu';

export interface CommerceApi {
  auth: {
    getSession(): Promise<SessionUser | null>;
    onChange(cb: (u: SessionUser | null) => void): () => void;
    signUp(loginId: string, password: string): Promise<SessionUser>;
    logIn(loginId: string, password: string): Promise<SessionUser>;
    logOut(): Promise<void>;
  };
  cart: {
    list(): Promise<CartItem[]>;
    add(item: CartItem): Promise<void>;
    setQuantity(item: CartItem): Promise<void>;
    remove(menuId: string, temperature: Temperature | null): Promise<void>;
    merge(items: CartItem[]): Promise<void>;
  };
  orders: {
    place(r: ReceiveMethod, p: PaymentMethod): Promise<string>;
    list(): Promise<Order[]>;
    get(id: string): Promise<Order | null>;
  };
  reviews: {
    list(q: { menuId?: string; mineOnly?: boolean; sort?: ReviewSort }): Promise<ReviewView[]>;
    create(p: { orderId: string; menuId: string } & ReviewInput, photo: Blob | null): Promise<string>;
    update(id: string, input: ReviewInput, photo: PhotoChange): Promise<void>;
    remove(id: string): Promise<void>;
  };
}
