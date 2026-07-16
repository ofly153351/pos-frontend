import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ saleId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { saleId, storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/sales/${saleId}/returns`, {
    body,
    method: "POST",
  });
}
