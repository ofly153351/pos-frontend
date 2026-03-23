import axios, { AxiosError } from "axios";

import { getAuthSession } from "@/lib/auth-storage";
import type { ApiResponse } from "@/types/auth";

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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

function unwrapPayload<T>(payload: ApiResponse<T>, status: number) {
  if (!payload.success || typeof payload.data === "undefined") {
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
  const { body, headers, method = "GET" } = options;

  try {
    const response = await apiClient.request<ApiResponse<T>>({
      data: body,
      headers: buildHeaders(headers, body),
      method,
      url: path,
    });

    return unwrapPayload(response.data, response.status);
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
    throw new ApiError("Missing access token", 401);
  }

  const { body, headers, method = "GET" } = options;

  try {
    const response = await apiClient.request<ApiResponse<T>>({
      data: body,
      headers: buildHeaders(headers, body, token),
      method,
      url: path,
    });

    return unwrapPayload(response.data, response.status);
  } catch (error) {
    throw toApiError(error);
  }
}
