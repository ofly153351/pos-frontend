import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expense-categories`);
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expense-categories`, {
    body: payload,
    method: "POST",
  });
}
