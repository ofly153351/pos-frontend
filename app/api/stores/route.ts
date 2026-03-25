import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id");

  if (storeId) {
    return proxyApiRequest(request, `/api/v1/stores/${storeId}`);
  }

  const candidates = [
    "/api/v1/me/stores",
    "/api/me/stores",
    "/api/v1/stores",
    "/api/stores",
  ];

  for (const endpoint of candidates) {
    const response = await proxyApiRequest(request, endpoint);

    if (response.status !== 404 && response.status !== 405) {
      return response;
    }
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
