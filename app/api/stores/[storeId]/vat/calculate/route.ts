import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const body = await request.text();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/vat/calculate`,
    {
      body,
      method: "POST",
    },
  );
}
