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
};

export function listLocations(warehouseIdOrOptions?: string | ListLocationsOptions) {
  const storeId = ensureStoreId();
  const params = new URLSearchParams();

  if (typeof warehouseIdOrOptions === "string") {
    if (warehouseIdOrOptions) params.set("warehouse_id", warehouseIdOrOptions);
  } else if (warehouseIdOrOptions) {
    if (warehouseIdOrOptions.warehouseId) params.set("warehouse_id", warehouseIdOrOptions.warehouseId);
  }

  const qs = params.toString();
  return authorizedApiRequest<Location[]>(`/api/stores/${storeId}/locations${qs ? `?${qs}` : ""}`);
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
