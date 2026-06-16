import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; warehouseId: string }>;
};

// Warehouse-scoped product inventory (read-only). The query string (search, filters,
// sort, pagination) is forwarded verbatim by proxyApiRequest.
export async function GET(request: Request, context: RouteContext) {
  const { storeId, warehouseId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}/inventory/products`,
  );
}
