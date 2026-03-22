import { apiRequest } from "@/services/api";
import type { AuthPayload, LoginRequest, RegisterRequest } from "@/types/auth";

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
