export type DocumentType =
  | "INVOICE"
  | "RECEIPT"
  | "TAX_INVOICE"
  | "QUOTATION"
  | "BILL"
  | "CREDIT_NOTE"
  | "DELIVERY_ORDER";

export type DocumentStatus =
  | "DRAFT"
  | "PENDING"
  | "OVERDUE"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID";

export interface DocumentItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_type: "" | "PERCENT" | "AMOUNT";
  discount_value: number;
  amount: number;
}

export interface Document {
  id: string;
  document_no: string;
  document_no_full: string;
  type: DocumentType;
  status: DocumentStatus;
  payment_status: PaymentStatus;
  customer_id: string;
  customer_name: string;
  customer_tax_id?: string;
  staff_id: string;
  staff_name: string;
  document_date: string;
  due_date?: string;
  valid_until?: string;
  items: DocumentItem[];
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes?: string;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_tax_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem {
  id: string;
  document_no: string;
  document_no_full: string;
  type: DocumentType;
  status: DocumentStatus;
  payment_status: PaymentStatus;
  customer_name: string;
  staff_name: string;
  document_date: string;
  due_date?: string;
  total_amount: number;
  source_document_id?: string;
}

export interface RelatedDocument {
  id: string;
  document_no: string;
  document_no_full: string;
  type: DocumentType;
  status: DocumentStatus;
  payment_status: PaymentStatus;
  document_date: string;
  total_amount: number;
  source_document_id?: string;
}

export interface DocumentStats {
  total: number;
  pending_payment: number;
  overdue: number;
  paid: number;
}

export interface DocumentListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  stats: DocumentStats;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: DocumentType | "";
  status?: DocumentStatus | "";
  payment_status?: PaymentStatus | "";
  customer_id?: string;
  staff_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateDocumentPayload {
  type: DocumentType;
  customer_id: string;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  document_date: string;
  due_date?: string;
  valid_until?: string;
  delivery_date?: string;
  delivery_address?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  sales_zone?: string;
  salesperson_name?: string;
  invoice_ref_no?: string;
  po_ref_no?: string;
  shipping_fee?: number;
  credit_term_days?: number;
  items: {
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_type: "" | "PERCENT" | "AMOUNT";
    discount_value: number;
  }[];
  vat_rate: number;
  notes?: string;
}

export interface UpdateDocumentStatusPayload {
  status: DocumentStatus;
}

export interface UpdateDocumentPaymentStatusPayload {
  payment_status: PaymentStatus;
}

export interface BulkActionPayload {
  ids: string[];
  action: "DELETE" | "SET_STATUS";
  status?: DocumentStatus;
}
