import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ productTypeId: string; storeId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { productTypeId, storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-types/${productTypeId}`,
    {
      body,
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productTypeId, storeId } = await context.params;

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-types/${productTypeId}`,
    {
      method: "DELETE",
    },
  );
}
