import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ sessionId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { sessionId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock-count-sessions/${sessionId}`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { sessionId, storeId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock-count-sessions/${sessionId}`, {
    body: payload,
    method: "PUT",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { sessionId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock-count-sessions/${sessionId}`, {
    method: "DELETE",
  });
}
