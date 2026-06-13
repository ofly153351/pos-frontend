import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { Campaign } from "@/components/promotions/promotion-types";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

// Promotions/campaigns are stored server-side (the full campaign JSON round-trips).
export function listPromotions() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Campaign[]>(`/api/stores/${storeId}/promotions`);
}

export function createPromotion(input: Campaign) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Campaign>(`/api/stores/${storeId}/promotions`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function updatePromotion(id: string, input: Campaign) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Campaign>(`/api/stores/${storeId}/promotions/${id}`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

export function deletePromotion(id: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<null>(`/api/stores/${storeId}/promotions/${id}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}
