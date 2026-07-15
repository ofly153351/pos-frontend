import { proxyAuthRequest } from "@/lib/auth-api-proxy";

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/v1/auth/register");
}
