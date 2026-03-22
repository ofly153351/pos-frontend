import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; unitId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, unitId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-units/${unitId}`,
    {
      body: await request.text(),
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId, unitId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-units/${unitId}`,
    {
      method: "DELETE",
    },
  );
}
