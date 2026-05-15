import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ brandId: string; storeId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { brandId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-brands/${brandId}`,
    {
      body: await request.text(),
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { brandId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/product-brands/${brandId}`,
    {
      method: "DELETE",
    },
  );
}
