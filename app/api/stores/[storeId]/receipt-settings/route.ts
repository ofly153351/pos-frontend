import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/receipt-settings`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/receipt-settings`, {
    body,
    method: "PUT",
  });
}
