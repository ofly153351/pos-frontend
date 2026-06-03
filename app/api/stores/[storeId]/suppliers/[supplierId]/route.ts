import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; supplierId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId, supplierId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/suppliers/${supplierId}`);
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId, supplierId } = await context.params;
  const body = await request.blob();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/suppliers/${supplierId}`, { body, method: "PUT" });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId, supplierId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/suppliers/${supplierId}`, { method: "DELETE" });
}
