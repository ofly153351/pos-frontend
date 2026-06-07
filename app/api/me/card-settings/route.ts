import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/api/v1/me/card-settings");
}

export async function PUT(request: Request) {
  const body = await request.text();
  return proxyApiRequest(request, "/api/v1/me/card-settings", { body, method: "PUT" });
}
