import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
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

export function listWarehouses() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Warehouse[]>(
    `/api/stores/${storeId}/warehouses`,
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

export function deleteWarehouse(warehouseId: string) {
  const storeId = ensureStoreId();
  // DELETE returns { success, message } with no data payload, so allow empty data —
  // otherwise the client throws on a successful delete (showing a misleading error).
  return authorizedApiRequest<Warehouse>(
    `/api/stores/${storeId}/warehouses/${warehouseId}`,
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
    { method: "DELETE" },
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
    },
    { requireToken: true },
  );
}
