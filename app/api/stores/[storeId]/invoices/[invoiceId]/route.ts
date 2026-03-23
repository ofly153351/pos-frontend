import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ invoiceId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { invoiceId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/invoices/${invoiceId}`);
}
