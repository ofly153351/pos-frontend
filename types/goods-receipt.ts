export type GoodsReceiptStatus = "draft" | "confirmed" | "cancelled";

export type GoodsReceiptAudit = {
  action: string;
  actor_id: string;
  actor_name?: string;
  created_at: string;
  description?: string;
  id: string;
  receipt_id: string;
};

export type GoodsReceiptAttachment = {
  attachment_mime_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_url?: string;
  id: string;
  updated_at?: string;
};

export type GoodsReceiptItemDraft = {
  barcode?: string;
  created_at: string;
  discount_amount: number;
  discount_type?: string;
  discount_value?: number | null;
  id: string;
  line_net: number;
  line_subtotal: number;
  location_id: string;
  location_name?: string;
  floor_name?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  receipt_id: string;
  sku?: string;
  unit_name?: string;
  unit_price: number;
  updated_at: string;
  warehouse_id: string;
  zone_name?: string;
};

export type GoodsReceiptStockImpact = {
  after_quantity: number;
  after_value: number;
  before_quantity: number;
  before_value: number;
  item_id: string;
  location_id: string;
  location_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  value_change: number;
};

export type GoodsReceiptPrintDocument = {
  content_type: string;
  document_no?: string;
  file_name?: string;
  html: string;
  receipt_id: string;
};

export type GoodsReceiptDraft = {
  attachment_mime_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_url?: string;
  audits: GoodsReceiptAudit[];
  cancelled_at?: string | null;
  cancelled_by?: string;
  cancelled_by_name?: string;
  confirmed_at?: string | null;
  confirmed_by?: string;
  confirmed_by_name?: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  document_no: string;
  discount_amount: number;
  id: string;
  items: GoodsReceiptItemDraft[];
  net_amount: number;
  note?: string;
  purchase_order_id?: string;
  purchase_order_no?: string;
  received_at: string;
  reference_no?: string;
  status: GoodsReceiptStatus;
  stock_preview: GoodsReceiptStockImpact[];
  store_id: string;
  subtotal_amount: number;
  supplier_id?: string;
  supplier_name?: string;
  total_amount: number;
  total_items: number;
  updated_at: string;
  vat_amount: number;
  vat_included: boolean;
  vat_percent: number;
  warehouse_id: string;
  warehouse_name?: string;
};

export type GoodsReceiptListPage = {
  has_next: boolean;
  has_prev: boolean;
  items: GoodsReceiptDraft[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
};

export type GenerateGoodsReceiptDocumentNoInput = {
  store_id: string;
};

export type GenerateGoodsReceiptDocumentNoResponse = {
  document_no: string;
};

export type CreateGoodsReceiptDraftInput = {
  document_no?: string;
  note?: string;
  purchase_order_id?: string;
  received_at?: string;
  reference_no?: string;
  store_id: string;
  supplier_id?: string;
  vat_included?: boolean;
  vat_percent?: number;
  warehouse_id: string;
};

export type UpdateGoodsReceiptDraftInput = Partial<{
  document_no: string;
  note: string;
  purchase_order_id: string;
  received_at: string;
  reference_no: string;
  supplier_id: string;
  vat_included: boolean;
  vat_percent: number;
  warehouse_id: string;
}>;

export type UpsertGoodsReceiptItemsInput = {
  items: Array<{
    discount_type?: string;
    discount_value?: number | null;
    location_id: string;
    product_id: string;
    quantity: number;
    unit_price?: number;
  }>;
  replace_existing?: boolean;
};
