import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; poId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId, poId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/purchase-orders/${poId}`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId, poId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/purchase-orders/${poId}`,
    { body, method: "PUT" },
  );
}
