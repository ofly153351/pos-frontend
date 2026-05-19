import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; supplierId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId, supplierId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/suppliers/${supplierId}/products`,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId, supplierId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/suppliers/${supplierId}/products`,
    { body, method: "POST" },
  );
}
