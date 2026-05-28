import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents/${id}/pdf`);
}
