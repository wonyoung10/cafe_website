import type { PaymentMethod, PaymentStatus, ReceiveMethod, ReviewSort } from '@/types/commerce';
import type { Temperature } from '@/types/menu';

type Table<Row, Insert = never, Update = never, Relationships = []> = { Row: Row; Insert: Insert; Update: Update; Relationships: Relationships };
type Rpc<Args, Returns = undefined> = { Args: Args; Returns: Returns };

type CartRow = { menu_id: string; temperature: Temperature | ''; quantity: number };
type CartArgs = { p_menu_id: string; p_temperature: string; p_quantity: number };
type LineRow = CartRow & { order_id: string; name: string; unit_price: number };
type ReviewFields = { rating: number; body: string; photo_path: string | null };
type ReviewInsert = ReviewFields & { order_id: string; menu_id: string; user_id: string };
type ReviewDates = { id: string; created_at: string; updated_at: string | null };
type PublicReview = ReviewFields & ReviewDates & { order_id: string | null; menu_id: string; author_masked: string; is_mine: boolean };

export type OrderRow = {
  id: string; order_no: string; total: number; receive_method: ReceiveMethod; payment_method: PaymentMethod;
  payment_status: PaymentStatus; created_at: string;
};
export type OrderWithLines = OrderRow & { order_lines: Omit<LineRow, 'order_id'>[] };

export type Database = {
  public: {
    Tables: {
      cart_items: Table<CartRow & { user_id: string }>;
      orders: Table<OrderRow & { user_id: string }>;
      order_lines: Table<LineRow, never, never, [{
        foreignKeyName: 'order_lines_order_id_fkey'; columns: ['order_id']; referencedRelation: 'orders'; referencedColumns: ['id'];
      }]>;
      reviews: Table<ReviewDates & ReviewInsert, ReviewInsert, Partial<ReviewFields>>;
    };
    Views: Record<never, never>;
    Functions: {
      add_cart_item: Rpc<CartArgs>;
      set_cart_quantity: Rpc<CartArgs>;
      merge_cart: Rpc<{ p_items: CartRow[] }>;
      place_order: Rpc<{ p_receive_method: ReceiveMethod; p_payment_method: PaymentMethod }, string>;
      list_reviews: Rpc<{ p_menu_id: string | null; p_mine: boolean; p_sort: ReviewSort }, PublicReview[]>;
    };
  };
};
