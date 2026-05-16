import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ warehouseId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { warehouseId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/warehouses/${warehouseId}`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { warehouseId, storeId } = await context.params;
  const body = await request.arrayBuffer();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}`,
    {
      body,
      method: "PUT",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { warehouseId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}`,
    {
      method: "DELETE",
    },
  );
}
