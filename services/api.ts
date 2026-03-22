import type { ApiResponse } from "@/types/auth";

type RequestOptions = {
  body?: unknown;
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

export async function apiRequest<T>(
  path: string,
  { body, method = "GET" }: RequestOptions = {},
): Promise<ApiResponse<T> & { data: T }> {
  const response = await fetch(path, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
    method,
  });

  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Unexpected response from server", response.status);
  }

  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiError(payload.message || "Request failed", response.status);
  }

  return payload as ApiResponse<T> & { data: T };
}
