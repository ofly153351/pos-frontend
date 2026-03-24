export type InvoiceDiscountType = "amount" | "percent";
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | string;

export type InvoiceItemInput = {
  discount_type?: InvoiceDiscountType;
  discount_value?: number;
  product_id: string;
  quantity: number;
};

export type CreateInvoiceInput = {
  customer_id: string;
  due_at?: string;
  items: InvoiceItemInput[];
  note?: string;
  vat_included?: boolean;
  vat_percent?: number;
};

export type CreateInvoicePaymentInput = {
  note?: string;
  paid_amount: number;
  payment_method: string;
  proof?: File | null;
};

export type InvoiceItem = {
  discount_amount_per_unit?: number | null;
  discount_type?: InvoiceDiscountType | null;
  discount_value?: number | null;
  id?: string;
  line_discount_total?: number | null;
  line_subtotal?: number | null;
  line_total?: number | null;
  product_id: string;
  product_image_url?: string | null;
  product_name?: string | null;
  quantity: number;
  unit_price?: number;
};

export type InvoicePayment = {
  created_at?: string;
  id?: string;
  is_voided?: boolean;
  note?: string | null;
  paid_amount: number;
  payment_method: string;
  proof_file_name?: string | null;
  proof_mime_type?: string | null;
  proof_url?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by_user_id?: string | null;
};

export type Invoice = {
  balance_amount?: number;
  created_at: string;
  customer_id: string;
  customer_name?: string | null;
  discount_amount?: number;
  due_at?: string | null;
  id: string;
  items?: InvoiceItem[];
  note?: string | null;
  paid_amount?: number;
  payments?: InvoicePayment[];
  status?: InvoiceStatus;
  subtotal_amount?: number;
  total_amount?: number;
  vat_amount?: number;
  vat_included?: boolean;
  vat_percent?: number;
};
