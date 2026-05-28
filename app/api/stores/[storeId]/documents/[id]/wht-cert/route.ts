import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string; id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  const url = new URL(request.url);
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/documents/${id}/wht-cert?${url.searchParams.toString()}`,
  );
}
