import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ customerId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { customerId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/customers/${customerId}/tree`);
}
