import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/locations/floors`, { body, method: "PATCH" });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/locations/floors`);
}
