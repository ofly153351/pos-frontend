import { proxyApiRequest } from "@/lib/api-proxy";

type Ctx = { params: Promise<{ storeId: string; accountId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { storeId, accountId } = await params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/bank-accounts/${accountId}`, { method: "PATCH", body: await request.text() });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { storeId, accountId } = await params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/bank-accounts/${accountId}`, { method: "DELETE" });
}
