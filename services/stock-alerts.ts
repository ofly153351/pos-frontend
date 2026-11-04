import { sharedRequest } from "@/lib/inflight";
import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type LowStockItem = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  min_stock: number;
};

export function listLowStock(threshold = 10) {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("Missing current store");
  return sharedRequest(`low-stock/${storeId}/${threshold}`, () =>
    authorizedApiRequest<LowStockItem[]>(
      `/api/stores/${storeId}/stock/low-stock?threshold=${threshold}`,
      {},
      { requireToken: true },
    ));
}
