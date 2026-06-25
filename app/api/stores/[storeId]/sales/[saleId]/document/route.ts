import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ saleId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { saleId, storeId } = await context.params;
  // The ?type= query is forwarded automatically by proxyApiRequest.
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/sales/${saleId}/document`);
}
