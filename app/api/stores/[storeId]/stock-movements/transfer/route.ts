import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

// Phase W4A — canonical location-aware stock transfer. Forwards the Idempotency-Key header
// (handled by api-proxy buildForwardHeaders) so a retried transfer is not applied twice.
export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.arrayBuffer();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/stock-movements/transfer`,
    {
      body,
      method: "POST",
    },
  );
}
