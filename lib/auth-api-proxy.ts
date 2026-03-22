import { proxyApiRequest } from "@/lib/api-proxy";

export async function proxyAuthRequest(
  request: Request,
  endpoint: "/api/v1/auth/login" | "/api/v1/auth/register",
) {
  const body = await request.text();
  return proxyApiRequest(request, endpoint, {
    body,
    method: "POST",
  });
}
