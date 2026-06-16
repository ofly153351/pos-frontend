import type { Location } from "@/services/locations";
import type { ProductStockLocation } from "@/types/warehouse-inventory";

// The warehouseInventory locale slice, derived from the JSON so it always tracks the keys.
export type WarehouseInventoryDictionary =
  (typeof import("@/locales/en.json"))["warehouseInventory"];

// A product's stock at one location, enriched by joining the stock summary
// (quantity) with the location metadata (warehouse / zone / floor / type / active).
export type EnrichedStockLocation = {
  location_id: string;
  name: string;
  code?: string | null;
  warehouse_name?: string | null;
  zone_name?: string | null;
  floor_name?: string | null;
  is_sale_point: boolean;
  is_active: boolean;
  quantity: number;
};

export type ProductLocationBreakdown = {
  sale: EnrichedStockLocation[];
  storage: EnrichedStockLocation[];
  readyStock: number;
  storageStock: number;
  totalStock: number;
};

export type RawLocation = Location;
export type RawStockLocation = ProductStockLocation;
