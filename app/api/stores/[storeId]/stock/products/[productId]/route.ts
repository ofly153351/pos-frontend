import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string; productId: string }>;
};

// Per-product stock-by-location summary (read-only). Used by the Product Location drawer.
export async function GET(request: Request, context: RouteContext) {
  const { storeId, productId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/stock/products/${productId}`,
  );
}
