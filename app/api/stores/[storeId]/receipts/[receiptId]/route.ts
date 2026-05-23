import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ receiptId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { receiptId } = await context.params;
  return proxyApiRequest(request, `/api/v1/warehouse/receipts/${receiptId}`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { receiptId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(request, `/api/v1/warehouse/receipts/${receiptId}`, {
    body,
    method: "PUT",
  });
}
