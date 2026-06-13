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
  discount_bill?: number; // deprecated: kept during rollout, treated as manual_discount by the backend
  manual_discount?: number;
  promo_discount?: number;
  promotion_ids?: string[];
  items: SaleItemInput[];
  note?: string;
  paid_amount: number;
  payment_method: SalePaymentMethod;
  vat_included?: boolean;
  vat_percent?: number;
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
  sku?: string | null;
  total_amount?: number;
  unit_price?: number;
  unit_type?: string | null;
};

export type Sale = {
  bill_discount_amount?: number;
  cashier_name?: string | null;
  change_amount?: number;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  created_at: string;
  discount_amount?: number;
  id: string;
  items?: SaleItem[];
  note?: string | null;
  paid_amount?: number;
  payment_method: SalePaymentMethod;
  sale_number?: string | null;
  store_address?: string | null;
  store_name?: string | null;
  store_phone?: string | null;
  store_tax_id?: string | null;
  subtotal_amount?: number;
  total_amount?: number;
  vat_amount?: number;
  vat_included?: boolean;
  vat_percent?: number;
};

export type VatCalculateItemInput = {
  code?: string;
  discount_per_unit?: number;
  name?: string;
  price: number;
  qty: number;
};

export type VatCalculateInput = {
  discount_bill?: number;
  items: VatCalculateItemInput[];
  vat_included?: boolean;
  vat_percent?: number;
};

export type VatCalculateSummary = {
  after_discount: number;
  discount_bill: number;
  discount_item: number;
  grand_total: number;
  subtotal: number;
  vat_amount: number;
  vat_included: boolean;
  vat_percent: number;
};
