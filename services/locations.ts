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
  is_default_sale?: boolean; // Phase W4B: the store's default sale-point location for POS
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedLocations = {
  items: Location[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type LocationTreeFloor = { name: string; count: number };
export type LocationTreeZone  = { name: string; count: number; floors: LocationTreeFloor[] };

export type LocationProduct = {
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
};

export type PaginatedLocationProducts = {
  items: LocationProduct[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("Missing current store");
  return storeId;
}

export type CreateLocationInput = {
  warehouse_id: string;
  name: string;
  code?: string;
  zone_name?: string;
  floor_name?: string;
  is_sale_point?: boolean;
  is_active?: boolean;
};

export type UpdateLocationInput = {
  name?: string;
  code?: string;
  zone_name?: string;
  floor_name?: string;
  is_sale_point?: boolean;
  is_active?: boolean;
};

export type ListLocationsOptions = {
  warehouseId?: string;
  zoneName?: string;
  floorName?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export function listLocations(options?: ListLocationsOptions) {
  const storeId = ensureStoreId();
  const params = new URLSearchParams();
  if (options?.warehouseId) params.set("warehouse_id", options.warehouseId);
  if (options?.zoneName)    params.set("zone_name",    options.zoneName);
  if (options?.floorName)   params.set("floor_name",   options.floorName);
  if (options?.search)      params.set("search",        options.search);
  if (options?.page)        params.set("page",          String(options.page));
  if (options?.limit)       params.set("limit",         String(options.limit));
  const qs = params.toString();
  return authorizedApiRequest<PaginatedLocations>(
    `/api/stores/${storeId}/locations${qs ? `?${qs}` : ""}`,
  );
}

export function listLocationTree(warehouseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<LocationTreeZone[]>(
    `/api/stores/${storeId}/locations/tree?warehouse_id=${encodeURIComponent(warehouseId)}`,
  );
}

export function listLocationProducts(locationId: string, options?: { page?: number; limit?: number }) {
  const storeId = ensureStoreId();
  const params = new URLSearchParams();
  if (options?.page)  params.set("page",  String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  return authorizedApiRequest<PaginatedLocationProducts>(
    `/api/stores/${storeId}/locations/${locationId}/products${qs ? `?${qs}` : ""}`,
  );
}

export function createLocation(input: CreateLocationInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Location>(`/api/stores/${storeId}/locations`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function updateLocation(locationId: string, input: UpdateLocationInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Location>(`/api/stores/${storeId}/locations/${locationId}`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function deleteLocation(locationId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/locations/${locationId}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}

export function renameZone(warehouseId: string, zoneName: string, newName: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/locations/zones`, {
    allowEmptyData: true,
    body: { warehouse_id: warehouseId, zone_name: zoneName, new_name: newName },
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function deleteZone(warehouseId: string, zoneName: string) {
  const storeId = ensureStoreId();
  const qs = new URLSearchParams({ warehouse_id: warehouseId, zone_name: zoneName }).toString();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/locations/zones?${qs}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}

export function renameFloor(warehouseId: string, zoneName: string, floorName: string, newName: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/locations/floors`, {
    allowEmptyData: true,
    body: { warehouse_id: warehouseId, zone_name: zoneName, floor_name: floorName, new_name: newName },
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function deleteFloor(warehouseId: string, zoneName: string, floorName: string) {
  const storeId = ensureStoreId();
  const qs = new URLSearchParams({ warehouse_id: warehouseId, zone_name: zoneName, floor_name: floorName }).toString();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/locations/floors?${qs}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}
