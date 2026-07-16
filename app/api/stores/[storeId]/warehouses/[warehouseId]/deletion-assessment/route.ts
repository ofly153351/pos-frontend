import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ warehouseId: string; storeId: string }>;
};

// Read-only pre-check for the adaptive delete/archive modal. Reports whether the warehouse can
// be hard-deleted, archived, or is blocked (and by what), aggregated across child locations.
export async function GET(request: Request, context: RouteContext) {
  const { warehouseId, storeId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/warehouses/${warehouseId}/deletion-assessment`,
  );
}
