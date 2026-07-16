import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, userId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/members/${userId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId, userId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/members/${userId}`, {
    method: "DELETE",
  });
}
