import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ warehouseId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { warehouseId, storeId } = await context.params;
  const body = await request.arrayBuffer();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}/transfer`,
    {
      body,
      method: "POST",
    },
  );
}
