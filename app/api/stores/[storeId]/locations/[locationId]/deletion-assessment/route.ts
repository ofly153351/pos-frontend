import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ locationId: string; storeId: string }>;
};

// Read-only pre-check for the adaptive delete/archive modal. Reports whether the location can
// be hard-deleted, archived, or is blocked (remaining stock, product-default, open ops,
// system-protected).
export async function GET(request: Request, context: RouteContext) {
  const { storeId, locationId } = await context.params;
  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/locations/${locationId}/deletion-assessment`,
  );
}
