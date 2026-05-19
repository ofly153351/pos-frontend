import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; poId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { storeId, poId } = await context.params;

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/purchase-orders/${poId}/cancel`,
    { method: "POST" },
  );
}
