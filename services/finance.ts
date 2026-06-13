import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { ExecutiveSummary, InventoryReport, PnlReport } from "@/types/finance";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export type PnlPeriod = "7d" | "30d" | "90d";

export type GetPnlParams = {
  /** Named window. Ignored when both from + to are provided (custom range). */
  period?: PnlPeriod;
  /** "YYYY-MM-DD" — custom range start (inclusive). */
  from?: string;
  /** "YYYY-MM-DD" — custom range end (inclusive). */
  to?: string;
};

export function getPnl(params: GetPnlParams = {}) {
  const storeId = ensureStoreId();
  const qs = new URLSearchParams();
  if (params.from && params.to) {
    qs.set("from", params.from);
    qs.set("to", params.to);
  } else if (params.period) {
    qs.set("period", params.period);
  }
  const query = qs.toString();
  return authorizedApiRequest<PnlReport>(
    `/api/stores/${storeId}/finance/pnl${query ? `?${query}` : ""}`,
  );
}

// Same period / custom-range contract as getPnl — see GetPnlParams.
export function getExecutiveSummary(params: GetPnlParams = {}) {
  const storeId = ensureStoreId();
  const qs = new URLSearchParams();
  if (params.from && params.to) {
    qs.set("from", params.from);
    qs.set("to", params.to);
  } else if (params.period) {
    qs.set("period", params.period);
  }
  const query = qs.toString();
  return authorizedApiRequest<ExecutiveSummary>(
    `/api/stores/${storeId}/finance/summary${query ? `?${query}` : ""}`,
  );
}

// Inventory Value & Dead Stock — backend aggregates (GetInventorySnapshot +
// GetDeadStock). deadDays is the dead-stock idle threshold (30/60/90).
export function getInventoryReport(deadDays: number) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<InventoryReport>(
    `/api/stores/${storeId}/finance/inventory?dead_days=${deadDays}`,
  );
}
