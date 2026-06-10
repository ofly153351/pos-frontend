import { proxyApiRequest } from "@/lib/api-proxy";

// TODO(backend): the Go backend does not expose this endpoint yet. This proxy is wired
// ahead of time — once `PUT /api/v1/me/password` ships, flip CAN_CHANGE_PASSWORD in
// components/profile/profile-manager.tsx and the Change Password form works end-to-end
// with no further frontend changes.
export async function PUT(request: Request) {
  const body = await request.text();
  return proxyApiRequest(request, "/api/v1/me/password", { body, method: "PUT" });
}
