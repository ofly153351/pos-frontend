import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; warehouseId: string; productId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { storeId, warehouseId, productId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}/inventory/${productId}/allocate`,
    {
      body,
      method: "POST",
    },
  );
}
