import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id");

  if (storeId) {
    return proxyApiRequest(request, `/api/v1/stores/${storeId}`);
  }

  return proxyApiRequest(request, "/api/v1/me/stores");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  return proxyApiRequest(request, "/api/v1/stores", {
    body: formData,
    method: "POST",
  });
}
