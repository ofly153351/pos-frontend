import { proxyApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const formData = await request.formData();

  return proxyApiRequest(request, "/api/v1/stores", {
    body: formData,
    method: "POST",
  });
}
