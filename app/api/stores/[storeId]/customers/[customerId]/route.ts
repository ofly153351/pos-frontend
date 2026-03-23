import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ customerId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { customerId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/customers/${customerId}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { customerId, storeId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/customers/${customerId}`,
    {
      body: payload,
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const { customerId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/customers/${customerId}`, {
    method: "DELETE",
  });
}
