import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string; id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents/${id}`);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents/${id}`, { method: "DELETE" });
}
