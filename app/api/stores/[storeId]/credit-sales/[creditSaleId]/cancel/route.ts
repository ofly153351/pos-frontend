import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ creditSaleId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { creditSaleId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/credit-sales/${creditSaleId}/cancel`, {
    method: "POST",
  });
}
