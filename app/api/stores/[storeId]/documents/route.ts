import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const url = new URL(request.url);
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/documents?${url.searchParams.toString()}`,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/documents`, { body, method: "POST" });
}
