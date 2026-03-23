import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId } from "@/lib/store-storage";
import { ApiError } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type { CreateSaleInput, Sale } from "@/types/sale";

function getAccessToken() {
  const session = getAuthSession();
  return session?.access_token ?? "";
}

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

async function parseResponse<T>(response: Response) {
  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Unexpected response from server", response.status);
  }

  if (!response.ok || !payload.success || typeof payload.data === "undefined") {
    throw new ApiError(payload.message || "Request failed", response.status);
  }

  return payload as ApiResponse<T> & { data: T };
}

async function authorizedRequest<T>(path: string, init?: RequestInit) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Missing access token");
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<T>(response);
}

export function listSales() {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Sale[]>(`/api/stores/${currentStoreId}/sales`);
}

export function getSaleById(saleId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Sale>(`/api/stores/${currentStoreId}/sales/${saleId}`);
}

export function createSale(input: CreateSaleInput) {
  const currentStoreId = ensureStoreId();
  return authorizedRequest<Sale>(`/api/stores/${currentStoreId}/sales`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
