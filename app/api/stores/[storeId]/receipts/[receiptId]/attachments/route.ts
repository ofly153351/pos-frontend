import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ receiptId: string; storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { receiptId } = await context.params;
  const formData = await request.formData();

  return proxyApiRequest(
    request,
    `/api/v1/warehouse/receipts/${receiptId}/attachment`,
    {
      body: formData,
      method: "POST",
    },
  );
}
