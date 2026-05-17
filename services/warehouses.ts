import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  AddWarehouseProductInput,
  CreateStandaloneWarehouseProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  UpdateWarehouseProductInput,
  Warehouse,
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
  return authorizedApiRequest<Warehouse>(
    `/api/stores/${storeId}/warehouses/${warehouseId}`,
    { method: "DELETE" },
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

/** Create a standalone warehouse product (no ref to products table) */
export function createStandaloneWarehouseProduct(
  warehouseId: string,
  input: CreateStandaloneWarehouseProductInput,
) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseProduct>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/products`,
    {
      body: {
        product_id: "", // empty = standalone mode
        ...input,
      } satisfies AddWarehouseProductInput,
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
