import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

// Inventory Value & Dead Stock — proxies to the Go finance module, forwarding the
// dead_days query param untouched.
export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/finance/inventory`);
}
