import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

/** A single field's previous and new value (Activity Center before/after diff). */
export interface ActivityFieldChange {
  before: unknown;
  after: unknown;
}

/** Captured {before, after} diff for a restore-eligible edit. Absent on older /
 * non-eligible rows (the UI then shows a "not captured before upgrade" state). */
export interface ActivityChanges {
  kind: string; // product | promotion | store | receipt_settings | member
  fields: Record<string, ActivityFieldChange>;
}

export type ActivitySeverity = "critical" | "high" | "medium" | "normal";
export type ActivityCategory =
  | "inventory"
  | "sales"
  | "purchasing"
  | "customer"
  | "promotion"
  | "settings"
  | "security"
  | "finance"
  | "general";

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
  /** Derived server-side from (action, module). Always present. */
  severity: ActivitySeverity;
  category: ActivityCategory;
  /** Field-level diff, present only for captured restore-eligible edits. */
  changes?: ActivityChanges | null;
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
  resource_id?: string;
  severity?: string;
  category?: string;
  q?: string;
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
