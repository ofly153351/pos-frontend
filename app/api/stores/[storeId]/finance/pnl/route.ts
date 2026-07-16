import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

// Profit & Loss report — proxies to the Go finance module, forwarding the
// period / from / to query string untouched.
export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/finance/pnl`);
}
