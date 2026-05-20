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

export function createSale(input: CreateSaleInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<Sale>(`/api/stores/${currentStoreId}/sales`, {
    body: input,
    headers: {
      "Content-Type": "application/json",
    },
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
