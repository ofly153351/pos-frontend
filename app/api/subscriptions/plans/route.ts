import { proxyApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/api/v1/subscriptions/plans");
}
