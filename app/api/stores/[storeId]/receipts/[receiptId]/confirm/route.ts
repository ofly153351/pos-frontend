import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ receiptId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { receiptId } = await context.params;

  return proxyApiRequest(
    request,
    `/api/v1/warehouse/receipts/${receiptId}/confirm`,
    {
      method: "POST",
    },
  );
}
