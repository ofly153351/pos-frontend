import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ invoiceId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { invoiceId, storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/invoices/${invoiceId}/unpay`,
    {
      body,
      method: "POST",
    },
  );
}
