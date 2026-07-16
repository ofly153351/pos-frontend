import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ expenseId: string; storeId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { expenseId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expenses/${expenseId}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { expenseId, storeId } = await context.params;
  const payload = await request.text();

  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expenses/${expenseId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { expenseId, storeId } = await context.params;
  return proxyApiRequest(request, `/api/v1/stores/${storeId}/expenses/${expenseId}`, {
    method: "DELETE",
  });
}
