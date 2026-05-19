import { proxyApiRequest } from "@/lib/api-proxy";
import { type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { storeId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  const path = `/api/v1/stores/${storeId}/stock/movements${queryString ? `?${queryString}` : ""}`;

  return proxyApiRequest(request, path);
}
