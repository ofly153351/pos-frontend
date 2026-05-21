import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; warehouseId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId, warehouseId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/warehouses/${warehouseId}/inventory`);
}
