import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ billId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { billId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/parked-bills/${billId}`);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { billId, storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/parked-bills/${billId}`,
    {
      body,
      method: "DELETE",
    },
  );
}
