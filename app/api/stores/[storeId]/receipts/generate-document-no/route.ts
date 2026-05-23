import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(request, "/api/v1/warehouse/receipts/generate-document-no", {
    body: body || JSON.stringify({ store_id: storeId }),
    method: "POST",
  });
}
