export type UserRole = "admin" | "cashier";
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type PayMethod =
  | "bank_transfer"
  | "ewallet"
  | "qris"
  | "credit_card"
  | "cod"
  | "cash"
  | "card";
export type PayStatus = "pending" | "success" | "failed" | "expired";

// ─── Row types (what Supabase returns) ───────────────────────

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  shift: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  image_url: string | null;
  description: string | null;
  stock: number;
  sold: number;
  rating: number;
  badge: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  notes: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: OrderStatus;
  pay_method: PayMethod | null;
  pay_status: PayStatus;
  snap_token: string | null;
  payment_url: string | null;
  midtrans_order_id: string | null;
  cashier_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url: string | null;
}

// ─── Database type for Supabase client generics ───────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
      };
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProductRow, "id" | "created_at">>;
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OrderRow, "id" | "created_at">>;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Omit<OrderItemRow, "id">;
        Update: Partial<Omit<OrderItemRow, "id">>;
      };
    };
  };
}
