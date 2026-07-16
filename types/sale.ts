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
  location_id?: string; // Phase W4B: the active sale-point location to deduct from (else store default)
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
  returned_quantity?: number; // migration 052 — running returned tally per line
  sku?: string | null;
  total_amount?: number;
  unit_price?: number;
  unit_type?: string | null;
};

export type SaleReturnItem = {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string;
  product_name?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  line_refund: number;
};

export type SaleReturn = {
  id: string;
  sale_id: string;
  return_number: string;
  refund_method: string;
  refund_amount: number;
  reason?: string | null;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
  items?: SaleReturnItem[];
};

export type SaleStatus =
  | "completed"
  | "voided"
  | "partially_returned"
  | "fully_returned"
  | string;

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
  returns?: SaleReturn[]; // migration 052 — partial-return history
  location_id?: string | null; // Phase W4B: the sale-point location this sale deducted from
  note?: string | null;
  paid_amount?: number;
  payment_method: SalePaymentMethod;
  sale_number?: string | null;
  status?: SaleStatus; // migration 042: completed | voided
  store_address?: string | null;
  store_name?: string | null;
  store_phone?: string | null;
  store_tax_id?: string | null;
  subtotal_amount?: number;
  total_amount?: number;
  total_items?: number; // total piece count (Σ item quantity); returned by list + detail
  vat_amount?: number;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  void_type?: string | null; // "void" | "return"
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
