import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/products`);
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const formData = await request.formData();

  return proxyApiRequest(
    request,
    `/api/v1/stores/${storeId}/products`,
    {
      body: formData,
      method: "POST",
    },
  );
}
