import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { WarehouseDashboardData, WarehousePeriod } from "@/types/warehouse-dashboard";

function ensureStoreId(): string {
  const id = getCurrentStoreId();
  if (!id) throw new Error("Missing current store");
  return id;
}

export function getWarehouseDashboard(period: WarehousePeriod = "7d") {
  const storeId = ensureStoreId();
  return authorizedApiRequest<WarehouseDashboardData>(
    `/api/stores/${storeId}/dashboard/warehouse?period=${period}`,
    {},
    { requireToken: true },
  );
}
