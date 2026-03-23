import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId } from "@/lib/store-storage";
import { ApiError } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateCustomerInput,
  Customer,
  CustomerLevelDiscount,
  UpdateCustomerInput,
} from "@/types/customer";

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
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  return parseResponse<T>(response);
}

export function listCustomers() {
  const storeId = ensureStoreId();
  return authorizedRequest<Customer[]>(`/api/stores/${storeId}/customers`);
}

export function getCustomerById(customerId: string) {
  const storeId = ensureStoreId();
  return authorizedRequest<Customer>(`/api/stores/${storeId}/customers/${customerId}`);
}

export function createCustomer(input: CreateCustomerInput) {
  const storeId = ensureStoreId();
  return authorizedRequest<Customer>(`/api/stores/${storeId}/customers`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  const storeId = ensureStoreId();
  return authorizedRequest<Customer>(`/api/stores/${storeId}/customers/${customerId}`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

export function deleteCustomer(customerId: string) {
  const storeId = ensureStoreId();
  return authorizedRequest<Record<string, never>>(`/api/stores/${storeId}/customers/${customerId}`, {
    method: "DELETE",
  });
}

export function listCustomerLevelDiscounts() {
  const storeId = ensureStoreId();
  return authorizedRequest<CustomerLevelDiscount[]>(`/api/stores/${storeId}/customer-level-discounts`);
}

export function upsertCustomerLevelDiscount(level: number, discountPercent: number) {
  const storeId = ensureStoreId();
  return authorizedRequest<CustomerLevelDiscount>(`/api/stores/${storeId}/customer-level-discounts/${level}`, {
    body: JSON.stringify({ discount_percent: discountPercent }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function deleteCustomerLevelDiscount(level: number) {
  const storeId = ensureStoreId();
  return authorizedRequest<Record<string, never>>(`/api/stores/${storeId}/customer-level-discounts/${level}`, {
    method: "DELETE",
  });
}
