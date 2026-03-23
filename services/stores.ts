import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId } from "@/lib/store-storage";
import { ApiError } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateStoreInput,
  Store,
  StoreSubscription,
  SubscriptionPlan,
} from "@/types/store";

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

function getAccessToken() {
  const session = getAuthSession();
  return session?.access_token ?? "";
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

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

function buildStoreFormData(input: CreateStoreInput) {
  const formData = new FormData();
  formData.set("name", input.name);
  formData.set("slug", input.slug);
  formData.set("subscription_plan_code", input.subscription_plan_code);

  if (input.description) {
    formData.set("description", input.description);
  }

  if (input.logo) {
    formData.set("logo", input.logo);
  }

  if (input.phone) {
    formData.set("phone", input.phone);
  }

  if (input.address) {
    formData.set("address", input.address);
  }

  if (input.currency_code) {
    formData.set("currency_code", input.currency_code);
  }

  return formData;
}

export function createStore(input: CreateStoreInput) {
  return authorizedRequest<Store>("/api/stores", {
    body: buildStoreFormData(input),
    method: "POST",
  });
}

export function listMyStores() {
  return authorizedRequest<Store[]>("/api/me/stores");
}

export function getStoreById(storeId: string) {
  const query = new URLSearchParams({ store_id: storeId });
  return authorizedRequest<Store>(`/api/stores?${query.toString()}`);
}

export function listSubscriptionPlans() {
  return authorizedRequest<SubscriptionPlan[]>("/api/subscriptions/plans");
}

export function getCurrentSubscription() {
  const storeId = ensureStoreId();
  return authorizedRequest<StoreSubscription>(
    `/api/stores/${storeId}/subscription`,
  );
}

export function updateStoreSubscription(storeId: string, planCode: string) {
  return authorizedRequest<StoreSubscription>(
    `/api/stores/${storeId}/subscription`,
    {
      body: JSON.stringify({ plan_code: planCode }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );
}

export function updateCurrentSubscription(planCode: string) {
  const storeId = ensureStoreId();
  return updateStoreSubscription(storeId, planCode);
}
