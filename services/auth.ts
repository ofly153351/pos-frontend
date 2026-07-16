import { apiRequest, authorizedApiRequest } from "@/services/api";
import type { AuthPayload, LoginRequest, RegisterRequest } from "@/types/auth";

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export function login(input: LoginRequest) {
  return apiRequest<AuthPayload>("/api/auth/login", {
    body: input,
    method: "POST",
  });
}

export function register(input: RegisterRequest) {
  return apiRequest<AuthPayload>("/api/auth/register", {
    body: input,
    method: "POST",
  });
}

export function logout() {
  return apiRequest<Record<string, never>>("/api/auth/logout", {
    body: {},
    method: "POST",
  });
}

// NOTE: the Go backend (D:\Fork\pos-backend) does not expose PUT /api/me/password yet.
// This is wired ahead of time (see app/api/me/password/route.ts) so the Profile page's
// Change Password form works the moment the backend ships it. The UI keeps it gated
// behind a capability flag until then — it never fakes success.
export function changePassword(input: ChangePasswordRequest) {
  return authorizedApiRequest<Record<string, never>>(
    "/api/me/password",
    {
      body: input,
      method: "PUT",
    },
    { requireToken: true },
  );
}
