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
  note?: string;
  due_date: string;
  created_at: string;
  created_by: string;
  status: CreditSaleStatus;
  payments: CreditSalePayment[];
};
