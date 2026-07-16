import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  ProductStockSummary,
  WarehouseInventoryQuery,
  WarehouseInventoryResponse,
} from "@/types/warehouse-inventory";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

// getWarehouseInventoryProducts fetches the warehouse-scoped product inventory
// (พร้อมขาย / พื้นที่จัดเก็บ / รวมในคลัง split) for a single warehouse. Filtering, sorting,
// and pagination are applied server-side via the Phase 0 endpoint's query contract.
export function getWarehouseInventoryProducts(
  warehouseId: string,
  query: WarehouseInventoryQuery = {},
) {
  const storeId = ensureStoreId();
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("category_id", query.categoryId);
  if (query.stockStatus) params.set("stock_status", query.stockStatus);
  if (query.locationType) params.set("location_type", query.locationType);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));

  const qs = params.toString();
  return authorizedApiRequest<WarehouseInventoryResponse>(
    `/api/stores/${storeId}/warehouses/${warehouseId}/inventory/products${qs ? `?${qs}` : ""}`,
    {},
    { requireToken: true },
  );
}

// getProductStockByLocation returns a product's per-location stock summary across the
// store. The Product Location drawer joins this with listLocations() to recover
// warehouse / zone / floor / type / active metadata and scope to the selected warehouse.
export function getProductStockByLocation(productId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ProductStockSummary>(
    `/api/stores/${storeId}/stock/products/${productId}`,
    {},
    { requireToken: true },
  );
}
