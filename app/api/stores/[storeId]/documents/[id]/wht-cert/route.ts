import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string; id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId, id } = await context.params;
  // proxyApiRequest already forwards the incoming request's query string. Baking it
  // into the endpoint here too double-appended it (?rate=3?rate=3), and the backend
  // read the wrong/duplicated WHT rate. Pass only the path.
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/documents/${id}/wht-cert`,
  );
}
