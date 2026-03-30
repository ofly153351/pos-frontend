import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { DashboardQueryInput, StoreDashboard } from "@/types/dashboard";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

function toQueryString(input: DashboardQueryInput) {
  const query = new URLSearchParams();

  if (input.period) {
    query.set("period", input.period);
  }

  if (input.from) {
    query.set("from", input.from);
  }

  if (input.to) {
    query.set("to", input.to);
  }

  if (typeof input.top_limit === "number") {
    query.set("top_limit", String(input.top_limit));
  }

  if (typeof input.recent_limit === "number") {
    query.set("recent_limit", String(input.recent_limit));
  }

  if (typeof input.low_stock_limit === "number") {
    query.set("low_stock_limit", String(input.low_stock_limit));
  }

  if (typeof input.low_stock_threshold === "number") {
    query.set("low_stock_threshold", String(input.low_stock_threshold));
  }

  return query.toString();
}

export function getDashboard(input: DashboardQueryInput = {}) {
  const storeId = ensureStoreId();
  const query = toQueryString(input);
  const endpoint = query
    ? `/api/stores/${storeId}/dashboard?${query}`
    : `/api/stores/${storeId}/dashboard`;

  return authorizedApiRequest<StoreDashboard>(endpoint, {}, { requireToken: true });
}
