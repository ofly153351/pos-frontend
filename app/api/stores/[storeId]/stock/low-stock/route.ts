import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const query = new URL(request.url).search;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock/low-stock${query}`);
}
