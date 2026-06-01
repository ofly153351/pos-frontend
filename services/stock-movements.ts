import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type AddStockItem = {
  product_id: string;
  quantity: number;
  note?: string;
};

export type AddStockInput = {
  items: AddStockItem[];
};

export type StockMovement = {
  id: string;
  store_id: string;
  product_id: string;
  quantity_change: number;
  type: string;
  reference_id: string | null;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  product_name: string;
  product_sku: string;
};

export type MovementListResponse = {
  items: StockMovement[];
  total: number;
  page: number;
  limit: number;
  last_page: number;
};

export type AdditionResult = {
  movements: StockMovement[];
};

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function addStock(input: AddStockInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<AdditionResult>(
    `/api/stores/${currentStoreId}/stock/add`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function adjustStock(productId: string, physicalQty: number, note?: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest(
    `/api/stores/${currentStoreId}/stock/adjust`,
    {
      body: { product_id: productId, physical_quantity: physicalQty, note: note?.trim() || undefined },
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function listMovements(productId?: string, page = 1, limit = 20) {
  const currentStoreId = ensureStoreId();
  const params = new URLSearchParams();
  if (productId) params.set("product_id", productId);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return authorizedApiRequest<MovementListResponse>(
    `/api/stores/${currentStoreId}/stock/movements?${params.toString()}`,
  );
}
