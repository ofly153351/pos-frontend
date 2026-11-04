import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string; id: string }> };

// B05: document debt balances and confirmed payments. The proxy forwards the
// Idempotency-Key header so a retried submission is replayed, not duplicated.
export async function GET(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents/${id}/payments`);
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents/${id}/payments`, { method: "POST", body });
}
