import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ addrId: string; customerId: string; storeId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { addrId, customerId, storeId } = await context.params;
  const payload = await request.text();
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/customers/${customerId}/shipping-addresses/${addrId}`,
    { body: payload, method: "PUT" },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { addrId, customerId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/customers/${customerId}/shipping-addresses/${addrId}`,
    { method: "DELETE" },
  );
}
