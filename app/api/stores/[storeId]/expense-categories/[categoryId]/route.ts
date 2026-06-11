import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ categoryId: string; storeId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { categoryId, storeId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expense-categories/${categoryId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { categoryId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expense-categories/${categoryId}`, {
    method: "DELETE",
  });
}
