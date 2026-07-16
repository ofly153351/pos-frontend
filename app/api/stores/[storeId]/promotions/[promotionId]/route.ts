import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ promotionId: string; storeId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { promotionId, storeId } = await context.params;
  const payload = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/promotions/${promotionId}`, {
    body: payload,
    method: "PUT",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { promotionId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/promotions/${promotionId}`, {
    method: "DELETE",
  });
}
