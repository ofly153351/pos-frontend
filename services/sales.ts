import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest, authorizedRawRequest } from "@/services/api";
import type {
  CreateSaleInput,
  Sale,
  VatCalculateInput,
  VatCalculateSummary,
} from "@/types/sale";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

export function listSales() {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Sale[]>(`/api/stores/${currentStoreId}/sales`);
}

export function getSaleById(saleId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Sale>(`/api/stores/${currentStoreId}/sales/${saleId}`);
}

// Phase W4B: the optional idempotency key makes a network-retried checkout safe — the
// backend returns the original sale instead of creating a second sale / second payment /
// second stock deduction. The sale deducts from input.location_id (the active sale point).
export function createSale(input: CreateSaleInput, idempotencyKey?: string) {
  const currentStoreId = ensureStoreId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return authorizedApiRequest<Sale>(`/api/stores/${currentStoreId}/sales`, {
    body: input,
    headers,
    method: "POST",
  });
}

export function calculateVat(input: VatCalculateInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<{ summary: VatCalculateSummary }>(
    `/api/stores/${currentStoreId}/vat/calculate`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function getSaleReceiptHtml(saleId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRawRequest<string>(
    `/api/stores/${currentStoreId}/sales/${saleId}/receipt`,
    {
      method: "GET",
      responseType: "text",
    },
  );
}

export function getSaleReceiptPreviewHtml(saleId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRawRequest<string>(
    `/api/stores/${currentStoreId}/sales/${saleId}/receipt/preview`,
    {
      method: "GET",
      responseType: "text",
    },
  );
}

// Renders a sale through a shared document template (the same forms the Documents
// module prints). docType: TAX_INVOICE | QUOTATION | DELIVERY_ORDER | INVOICE | BILL …
export function getSaleDocumentHtml(saleId: string, docType: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRawRequest<string>(
    `/api/stores/${currentStoreId}/sales/${saleId}/document?type=${encodeURIComponent(docType)}`,
    {
      method: "GET",
      responseType: "text",
    },
  );
}

// Issues a PERSISTED document (default TAX_INVOICE) from a sale. The backend copies the
// sale's authoritative stored totals — subtotal, discount, VAT, grand total — so the
// document matches the receipt exactly. This replaces the old client-side reconstruction
// that recomputed from gross prices (which dropped bill discounts and forced VAT).
export function createDocumentFromSale(saleId: string, type: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<{ id: string; document_no: string }>(
    `/api/stores/${currentStoreId}/sales/${saleId}/documents`,
    {
      body: { type },
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function voidSale(saleId: string, input: { reason?: string; type: "void" | "return" }) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Sale>(`/api/stores/${currentStoreId}/sales/${saleId}/void`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export type CreateReturnInput = {
  refund_method: string;
  reason?: string;
  items: { sale_item_id?: string; product_id?: string; quantity: number }[];
};

// Partial return — records a return WITHOUT voiding the sale. Returns the
// refreshed sale (updated status + returns history).
export function createSaleReturn(saleId: string, input: CreateReturnInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Sale>(`/api/stores/${currentStoreId}/sales/${saleId}/returns`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

// --- Parked Bills (Hold Bill) ---

export type ParkedBillItem = {
  product_id: string;
  product_name?: string;
  product_sku?: string;
  price?: number;
  quantity: number;
  discount_type?: string;
  discount_value?: number;
};

export type CreateParkedBillInput = {
  label: string;
  items: ParkedBillItem[];
  bill_discount_amount: number;
  bill_discount_type: "amount" | "percent";
  bill_discount_percent: number;
  selectedCustomerId: string;
  customerSettlementMode: string;
  paymentMethod: string;
  note: string;
  applyVat: boolean;
};

export type ParkedBill = {
  id: string;
  store_id: string;
  label: string;
  items: ParkedBillItem[];
  bill_discount_amount: number;
  bill_discount_type: "amount" | "percent";
  bill_discount_percent: number;
  selectedCustomerId: string;
  customerSettlementMode: string;
  paymentMethod: string;
  note: string;
  applyVat: boolean;
  created_at: string;
};

export function createParkedBill(input: CreateParkedBillInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ParkedBill>(
    `/api/stores/${currentStoreId}/parked-bills`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function listParkedBills() {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ParkedBill[]>(
    `/api/stores/${currentStoreId}/parked-bills`,
  );
}

export function getParkedBill(billId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<ParkedBill>(
    `/api/stores/${currentStoreId}/parked-bills/${billId}`,
  );
}

export function deleteParkedBill(billId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<{ success: boolean }>(
    `/api/stores/${currentStoreId}/parked-bills/${billId}`,
    {
      method: "DELETE",
    },
  );
}
