export type CreditSaleType = "credit" | "loan";

export type CreditSaleStatus =
  | "pending"
  | "partial"
  | "completed"
  | "overdue"
  | "cancelled";

export type CreditSaleItem = {
  id: string;
  product_id?: string;
  product_name: string;
  unit?: string;
  price: number;
  quantity: number;
  total: number;
};

export type CreditSalePayment = {
  id: string;
  amount: number;
  method: "cash" | "transfer";
  note?: string;
  paid_at: string;
};

export type CreditSale = {
  id: string;
  document_number: string;
  type: CreditSaleType;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_member_code?: string;
  items: CreditSaleItem[];
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  note?: string;
  due_date: string;
  created_at: string;
  created_by: string;
  status: CreditSaleStatus;
  payments: CreditSalePayment[];
};

// ── API request payloads ─────────────────────────────────────────────────────

export type CreateCreditItemInput = {
  product_id: string;
  quantity: number;
  discount_type?: "amount" | "percent";
  discount_value?: number;
};

export type CreateCreditSaleInput = {
  type: CreditSaleType;
  customer_id: string;
  due_date: string;
  note?: string;
  down_payment: number;
  items: CreateCreditItemInput[];
};

export type AddCreditPaymentInput = {
  amount: number;
  method: "cash" | "transfer";
  note?: string;
};

export type CreditDebtSummary = {
  total_outstanding: number;
  open_count: number;
  overdue_count: number;
  overdue_amount: number;
};
