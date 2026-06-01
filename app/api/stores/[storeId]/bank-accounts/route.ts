import { proxyApiRequest } from "@/lib/api-proxy";

type Ctx = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { storeId } = await params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/bank-accounts`);
}

export async function POST(request: Request, { params }: Ctx) {
  const { storeId } = await params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/bank-accounts`, { method: "POST", body: await request.text() });
}
