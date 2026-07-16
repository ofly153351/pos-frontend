import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ sessionId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId, storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock-count-sessions/${sessionId}/apply`, {
    body,
    method: "POST",
  });
}
