import { proxyApiRequest } from "@/lib/api-proxy";

type StoreRouteParams = {
  params: Promise<{
    storeId: string;
  }>;
};

export async function GET(request: Request, { params }: StoreRouteParams) {
  const { storeId } = await params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}`);
}
