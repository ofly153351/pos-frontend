export type SalePaymentMethod = "cash" | "transfer" | "card" | string;
export type SaleDiscountType = "amount" | "percent";

export type SaleItemInput = {
  discount_type?: SaleDiscountType;
  discount_value?: number;
  product_id: string;
  quantity: number;
};

export type CreateSaleInput = {
  customer_id?: string;
  items: SaleItemInput[];
  note?: string;
  paid_amount: number;
  payment_method: SalePaymentMethod;
};

export type SaleItem = {
  discount_amount_per_unit?: number | null;
  discount_type?: SaleDiscountType | null;
  discount_value?: number | null;
  id?: string;
  line_discount_total?: number | null;
  line_subtotal?: number | null;
  line_total?: number | null;
  product_id: string;
  product_image_url?: string | null;
  product_name?: string | null;
  quantity: number;
  total_amount?: number;
  unit_price?: number;
};

export type Sale = {
  change_amount?: number;
  customer_id?: string | null;
  customer_name?: string | null;
  created_at: string;
  discount_amount?: number;
  id: string;
  items?: SaleItem[];
  note?: string | null;
  paid_amount?: number;
  payment_method: SalePaymentMethod;
  subtotal_amount?: number;
  total_amount?: number;
};
