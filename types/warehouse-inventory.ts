// Warehouse-scoped inventory contract (Phase 0 read API, option B 2026-09-04).
//
// Mirrors the backend GET /stores/:storeID/warehouses/:warehouseID/inventory/products.
// The scope deliberately differs per column so the page answers the replenishment
// question ("จะโอนจากคลังนี้ไปเติมจุดขายไหม"):
//   ready_stock   = พร้อมขาย   — stock at EVERY sale-point location of the STORE
//                   (across all warehouses; NOT just this warehouse's sale points)
//   storage_stock = ที่จัดเก็บ  — non-sale-point locations of the SELECTED warehouse only
//   total_stock   = รวม        — ready_stock + storage_stock
// These are NOT the deprecated store-wide product_view aggregates (they split the
// WRONG way for this page).

export type WarehouseStockStatus = "available" | "low_stock" | "out_of_stock";

export type WarehouseLocationType = "all" | "sale_point" | "storage";

export type WarehouseInventorySort =
  | "name"
  | "name_desc"
  | "total_asc"
  | "total_desc";

export type WarehouseInventoryProduct = {
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  category_id: string;
  category_name: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  ready_stock: number;
  storage_stock: number;
  total_stock: number;
  status: WarehouseStockStatus;
};

export type WarehouseInventorySummary = {
  product_count: number;
  ready_stock: number;
  storage_stock: number;
  total_stock: number;
  inventory_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
};

export type WarehouseInventoryPagination = {
  page: number;
  page_size: number;
  total: number;
};

export type WarehouseInventoryRef = {
  id: string;
  name: string;
  code?: string;
};

export type WarehouseInventoryResponse = {
  warehouse: WarehouseInventoryRef;
  summary: WarehouseInventorySummary;
  items: WarehouseInventoryProduct[];
  pagination: WarehouseInventoryPagination;
};

// Query input is camelCase at the call site; the service maps it to the snake_case
// query-string contract the backend validates.
export type WarehouseInventoryQuery = {
  search?: string;
  categoryId?: string;
  stockStatus?: WarehouseStockStatus | "";
  locationType?: WarehouseLocationType | "";
  sort?: WarehouseInventorySort | "";
  page?: number;
  pageSize?: number;
};

// Per-product stock-by-location summary (GET /stores/:storeID/stock/products/:productID).
// Location metadata (warehouse_id, zone, floor, is_sale_point, is_active) is NOT in this
// payload — the Product Location drawer joins it with listLocations() on location_id.
export type ProductStockLocation = {
  location_id: string;
  location_name: string;
  warehouse_name: string;
  quantity: number;
};

export type ProductStockSummary = {
  product_id: string;
  total_quantity: number;
  locations: ProductStockLocation[];
};
