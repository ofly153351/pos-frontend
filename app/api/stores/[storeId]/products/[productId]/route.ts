import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ productId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { productId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/products/${productId}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { productId, storeId } = await context.params;
  const body = await request.arrayBuffer();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/products/${productId}`,
    {
      body,
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { productId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/products/${productId}`,
    {
      method: "DELETE",
    },
  );
}
