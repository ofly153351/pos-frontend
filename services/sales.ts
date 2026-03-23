import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { CreateSaleInput, Sale } from "@/types/sale";

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
