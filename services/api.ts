import axios, { AxiosError } from "axios";

import {
  clearAuthSession,
  getAuthSession,
} from "@/lib/auth-storage";
import type { ApiResponse } from "@/types/auth";

type RequestOptions = {
  allowEmptyData?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  responseType?: "arraybuffer" | "blob" | "json" | "text";
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiClient = axios.create();

let isRedirectingToLogin = false;

async function clearAuthAndRedirect() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  // First call logout endpoint to clear httpOnly cookies server-side
  // (httpOnly cookies cannot be deleted from client-side JS)
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort — proceed with client-side cleanup regardless
  }

  // Clear localStorage auth session
  clearAuthSession();

  // Clear any other POS-related localStorage items
  try {
    window.localStorage.removeItem("pos-current-store-id");
    window.localStorage.removeItem("pos-pending-plan");
  } catch {
    // localStorage may not be available
  }

  // Also try to clear non-httpOnly cookies as a fallback
  document.cookie = "pos-access-token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "pos-store-id=; path=/; max-age=0; SameSite=Lax";

  // Extract locale from current path (/en/..., /th/...)
  const match = window.location.pathname.match(/^\/(en|th)\//);
  const locale = match?.[1] ?? "en";

  // Redirect to login — uses replace() so back button doesn't loop
  if (!window.location.pathname.includes("/login")) {
    window.location.replace(`/${locale}/login`);
  }
}

// Response interceptor — catch 401 (token expired) globally
const authPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      error.config?.url &&
      !authPaths.some((p) => error.config!.url!.startsWith(p))
    ) {
      clearAuthAndRedirect();
      // Stall — don't let the error propagate into a retry/render loop
      return new Promise<never>(() => {});
    }
    return Promise.reject(error);
  },
);

function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;
    const payload = error.response?.data as ApiResponse<unknown> | undefined;
    const message =
      payload?.message ||
      error.message ||
      "Request failed";

    return new ApiError(message, status);
  }

  return new ApiError("Request failed", 500);
}

function unwrapPayload<T>(
  payload: ApiResponse<T>,
  status: number,
  allowEmptyData = false,
) {
  if (!payload.success || (!allowEmptyData && typeof payload.data === "undefined")) {
    throw new ApiError(payload.message || "Request failed", status);
  }

  return payload as ApiResponse<T> & { data: T };
}

function getToken() {
  const session = getAuthSession();
  return session?.access_token ?? "";
}

function buildHeaders(
  headers?: Record<string, string>,
  body?: unknown,
  token?: string,
) {
  const nextHeaders: Record<string, string> = {
    ...(headers ?? {}),
  };

  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData) && !nextHeaders["Content-Type"]) {
    nextHeaders["Content-Type"] = "application/json";
  }

  return nextHeaders;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const {
    allowEmptyData = false,
    body,
    headers,
    method = "GET",
  } = options;

  try {
    const response = await apiClient.request<ApiResponse<T>>({
      data: body,
      headers: buildHeaders(headers, body),
      method,
      url: path,
    });

    return unwrapPayload(response.data, response.status, allowEmptyData);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function authorizedApiRequest<T>(
  path: string,
  options: RequestOptions = {},
  authOptions: { requireToken?: boolean } = {},
) {
  const { requireToken = true } = authOptions;
  const token = getToken();

  if (requireToken && !token) {
    if (typeof window !== "undefined") {
      clearAuthAndRedirect();
    }
    // Stall — redirect is in progress, don't throw to avoid retry/render loops
    return new Promise<ApiResponse<T> & { data: T }>(() => {});
  }

  const {
    allowEmptyData = false,
    body,
    headers,
    method = "GET",
  } = options;

  try {
    const response = await apiClient.request<ApiResponse<T>>({
      data: body,
      headers: buildHeaders(headers, body, token),
      method,
      url: path,
    });

    return unwrapPayload(response.data, response.status, allowEmptyData);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function authorizedRawRequest<T>(
  path: string,
  options: RequestOptions = {},
  authOptions: { requireToken?: boolean } = {},
) {
  const { requireToken = true } = authOptions;
  const token = getToken();

  if (requireToken && !token) {
    if (typeof window !== "undefined") {
      clearAuthAndRedirect();
    }
    // Stall — redirect is in progress, don't throw to avoid retry/render loops
    return new Promise<T>(() => {});
  }

  const {
    body,
    headers,
    method = "GET",
    responseType = "json",
  } = options;

  try {
    const response = await apiClient.request<T>({
      data: body,
      headers: buildHeaders(headers, body, token),
      method,
      responseType,
      url: path,
    });

    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
