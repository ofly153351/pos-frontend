import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ saleId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { saleId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/sales/${saleId}`);
}
