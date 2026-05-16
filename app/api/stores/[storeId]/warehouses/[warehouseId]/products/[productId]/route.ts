import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ productId: string; warehouseId: string; storeId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const { productId, warehouseId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}/products/${productId}`,
    { method: "DELETE" },
  );
}
