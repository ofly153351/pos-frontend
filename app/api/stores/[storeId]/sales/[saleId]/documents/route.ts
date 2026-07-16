import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ saleId: string; storeId: string }>;
};

// Issue a persisted document (e.g. TAX_INVOICE) from a sale. Body: { type }.
export async function POST(request: Request, context: RouteContext) {
  const { saleId, storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/sales/${saleId}/documents`, {
    body,
    method: "POST",
  });
}
