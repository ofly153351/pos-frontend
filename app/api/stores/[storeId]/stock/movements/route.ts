import { proxyApiRequest } from "@/lib/api-proxy";
import { type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { storeId } = await context.params;
  // proxyApiRequest already forwards the incoming query string; baking it in here too
  // double-appended it (?a=b?a=b) and corrupted the movement filters. Pass only the path.
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/stock-movements`);
}
