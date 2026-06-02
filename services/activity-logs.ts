import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export interface ActivityLogEntry {
  id: string;
  store_id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  resource_id: string;
  method: string;
  path: string;
  ip_address: string;
  created_at: string;
}

export interface ActivityLogListResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface ActivityLogQuery {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

function base() {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("No active store");
  return `/api/stores/${storeId}/activity-logs`;
}

export async function getActivityLogs(query: ActivityLogQuery = {}): Promise<ActivityLogListResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  const res = await authorizedApiRequest<ActivityLogListResponse>(`${base()}${qs ? `?${qs}` : ""}`);
  return res.data;
}
