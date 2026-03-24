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
