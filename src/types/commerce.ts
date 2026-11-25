import type { Temperature } from '@/types/menu';

export interface SessionUser {
  id: string;
  loginId: string;
}

export interface CartItem {
  menuId: string;
  temperature: Temperature | null;
  quantity: number;
}

export type ReceiveMethod = 'takeout' | 'dine-in';
export type PaymentMethod = 'onsite' | 'online';
export type PaymentStatus = 'onsite-due' | 'mock-paid';

export interface OrderLine {
  menuId: string;
  name: string;
  temperature: Temperature | null;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNo: string;
  lines: OrderLine[];
  total: number;
  receiveMethod: ReceiveMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface ReviewInput {
  rating: number;
  text: string;
}

export type PhotoChange = 'keep' | 'remove' | Blob;
export type ReviewSort = 'latest' | 'rating-high' | 'rating-low';

export interface ReviewView extends ReviewInput {
  id: string;
  orderId: string | null;
  menuId: string;
  photoUrl: string | null;
  authorMasked: string;
  isMine: boolean;
  createdAt: string;
  updatedAt: string | null;
}
