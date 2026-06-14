import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type AddStockItem = {
  product_id: string;
  quantity: number;
  location_id?: string;
  reason?: string;
  idempotency_key?: string;
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

export type RemoveStockInput = {
  product_id: string;
  location_id: string;
  quantity: number;
  reason?: string;
  idempotency_key?: string;
  note?: string;
};

// Deduct stock at a specific location (delta-based OUT movement). The backend
// guards against over-removal (rejects if it would go negative) and writes the
// movement + stock change atomically.
export function removeStock(input: RemoveStockInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<StockMovement>(
    `/api/stores/${currentStoreId}/stock/out`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export type AdjustStockInput = {
  productId: string;
  physicalQty: number;
  note?: string;
  reason?: string;
  idempotencyKey?: string;
  referenceId?: string;
  movementType?: string;
  locationId?: string;
};

export function adjustStock(input: AdjustStockInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest(
    `/api/stores/${currentStoreId}/stock/adjust`,
    {
      body: {
        product_id: input.productId,
        physical_quantity: input.physicalQty,
        note: input.note?.trim() || undefined,
        reason: input.reason?.trim() || undefined,
        idempotency_key: input.idempotencyKey?.trim() || undefined,
        reference_id: input.referenceId?.trim() || undefined,
        movement_type: input.movementType?.trim() || undefined,
        location_id: input.locationId?.trim() || undefined,
      },
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
