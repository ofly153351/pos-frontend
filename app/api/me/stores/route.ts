import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
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
