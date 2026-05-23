import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type Location = {
  id: string;
  store_id: string;
  warehouse_id: string;
  warehouse_name?: string;
  zone_id?: string;
  zone_name?: string;
  floor_id?: string;
  floor_name?: string;
  name: string;
  code?: string;
  is_sale_point: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function listLocations(warehouseId?: string) {
  const storeId = ensureStoreId();
  const search = warehouseId
    ? `?warehouse_id=${encodeURIComponent(warehouseId)}`
    : "";

  return authorizedApiRequest<Location[]>(`/api/stores/${storeId}/locations${search}`);
}
