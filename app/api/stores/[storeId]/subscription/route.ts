import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/subscription`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/subscription`, {
    body,
    method: "PUT",
  });
}
