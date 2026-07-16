import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  DeletionAssessment,
  DeletionOutcome,
  DeletionSuggestedAction,
} from "@/types/lifecycle";
import type {
  AddWarehouseProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  UpdateWarehouseProductInput,
  Warehouse,
  WarehouseInventoryItem,
  WarehouseProduct,
} from "@/types/warehouse";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

// listWarehouses defaults to live rows only (the backend excludes archived unless asked).
// Pass { includeArchived: true } for the management "Archived" filter — archived rows carry
// a deleted_at timestamp so the caller can partition them.
export function listWarehouses(options?: { includeArchived?: boolean }) {
  const storeId = ensureStoreId();
  const qs = options?.includeArchived ? "?include_archived=true" : "";
  return authorizedApiRequest<Warehouse[]>(
    `/api/stores/${storeId}/warehouses${qs}`,
    {},
    { requireToken: true },
  );
}

// getWarehouseDeletionAssessment is the read-only pre-check that drives the adaptive
// delete/archive modal: it reports whether the warehouse can be hard-deleted, archived, or is
// blocked (and by what), aggregated across all of its child locations.
export function getWarehouseDeletionAssessment(warehouseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<DeletionAssessment>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/deletion-assessment`,
    {},
    { requireToken: true },
  );
}

export function listWarehousesForStore(targetStoreId: string) {
  return authorizedApiRequest<Warehouse[]>(
    `/api/stores/${targetStoreId}/warehouses`,
    {},
    { requireToken: true },
  );
}

export function getWarehouseById(warehouseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Warehouse>(
    `/api/stores/${storeId}/warehouses/${warehouseId}`,
    {},
    { requireToken: true },
  );
}

export function createWarehouse(input: CreateWarehouseInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Warehouse>(
    `/api/stores/${storeId}/warehouses`,
    {
      body: input,
      method: "POST",
    },
    { requireToken: true },
  );
}

export function updateWarehouse(warehouseId: string, input: UpdateWarehouseInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Warehouse>(
    `/api/stores/${storeId}/warehouses/${warehouseId}`,
    {
      body: input,
      method: "PUT",
    },
    { requireToken: true },
  );
}

// deleteWarehouse runs the smart delete: the backend resolves the safe action (archive vs
// permanent delete) under a row lock and returns { action, assessment }. `expected` is the
// action the user confirmed against the pre-check assessment; if the locked re-assessment
// disagrees the backend returns 409 ENTITY_STATE_CHANGED (carried in ApiError.details) so the
// caller can re-confirm against fresh state. A hard blocker likewise returns 409 with the
// blocker code + assessment in details.
export function deleteWarehouse(warehouseId: string, expected?: DeletionSuggestedAction) {
  const storeId = ensureStoreId();
  const qs = expected ? `?expected=${encodeURIComponent(expected)}` : "";
  return authorizedApiRequest<DeletionOutcome>(
    `/api/stores/${storeId}/warehouses/${warehouseId}${qs}`,
    { method: "DELETE", allowEmptyData: true },
    { requireToken: true },
  );
}

// Warehouse-Product association

export function listWarehouseProducts(warehouseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseProduct[]>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/products`,
    {},
    { requireToken: true },
  );
}

export function addWarehouseProduct(warehouseId: string, input: AddWarehouseProductInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseProduct>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/products`,
    {
      body: input,
      method: "POST",
    },
    { requireToken: true },
  );
}

export function removeWarehouseProduct(warehouseId: string, productId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<void>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/products/${productId}`,
    { method: "DELETE", allowEmptyData: true },
    { requireToken: true },
  );
}

// Phase W4A §11: the legacy warehouse-level transfer (transferWarehouseProduct →
// /warehouses/:id/transfer) is removed. It performed unsafe auto source selection,
// cross-store product cloning, and warehouse/location auto-creation. All transfers now use
// the canonical location-aware endpoint below; the legacy backend endpoint is disabled.

// ── Phase W4A — canonical location-aware stock transfer ──────────────────────
export type StockTransferReason =
  | "REPLENISH_SALE_POINT"
  | "RETURN_TO_STORAGE"
  | "WAREHOUSE_REBALANCE"
  | "LOCATION_REORGANIZATION"
  | "OTHER";

export type StockTransferInput = {
  product_id: string;
  source_location_id: string;
  dest_location_id: string;
  quantity: number;
  reason: StockTransferReason;
  note?: string;
};

export type StockTransferResult = {
  transfer: {
    id: string;
    store_id: string;
    product_id: string;
    source_location_id: string;
    dest_location_id: string;
    quantity: number;
    reason: string;
    note: string;
    created_at: string;
  };
  movements: Array<{ id: string; type: string; location_id?: string; quantity_change: number }>;
};

// Canonical location→location transfer. The idempotency key makes a retried submit safe —
// the backend returns the original result instead of moving stock twice (Phase W4A §9).
export function transferStockLocation(input: StockTransferInput, idempotencyKey?: string) {
  const storeId = ensureStoreId();
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return authorizedApiRequest<StockTransferResult>(
    `/api/stores/${storeId}/stock-movements/transfer`,
    {
      body: input,
      headers,
      method: "POST",
    },
    { requireToken: true },
  );
}

export function updateWarehouseProductQuantity(warehouseId: string, productId: string, quantity: number) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseProduct>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/products/${productId}`,
    {
      body: { quantity } satisfies UpdateWarehouseProductInput,
      method: "PUT",
      allowEmptyData: true,
    },
    { requireToken: true },
  );
}

export function listWarehouseInventory(warehouseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseInventoryItem[]>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/inventory`,
    {},
    { requireToken: true },
  );
}

export function allocateInventory(warehouseId: string, productId: string, quantity: number, note?: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<void>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/inventory/${productId}/allocate`,
    {
      body: { quantity, note: note || undefined },
      method: "POST",
      allowEmptyData: true,
    },
    { requireToken: true },
  );
}
