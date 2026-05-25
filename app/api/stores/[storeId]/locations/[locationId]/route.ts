import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ locationId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId, locationId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/locations/${locationId}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, locationId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/locations/${locationId}`, {
    body,
    method: "PATCH",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId, locationId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/locations/${locationId}`, {
    method: "DELETE",
  });
}
