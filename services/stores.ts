import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  CreateStoreInput,
  Store,
  StoreSubscription,
  SubscriptionPlan,
  UpdateStoreInput,
} from "@/types/store";

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
  formData.set("subscription_plan_code", input.subscription_plan_code);

  if (input.slug) {
    formData.set("slug", input.slug);
  }

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

  if (typeof input.promptpay_id === "string") {
    formData.set("promptpay_id", input.promptpay_id);
  }

  return formData;
}

function buildStoreUpdateFormData(input: UpdateStoreInput) {
  const formData = new FormData();

  if (typeof input.name === "string") {
    formData.set("name", input.name);
  }

  if (typeof input.phone === "string") {
    formData.set("phone", input.phone);
  }

  if (typeof input.fax === "string") {
    formData.set("fax", input.fax);
  }

  if (typeof input.email === "string") {
    formData.set("email", input.email);
  }

  if (typeof input.website === "string") {
    formData.set("website", input.website);
  }

  if (typeof input.address === "string") {
    formData.set("address", input.address);
  }

  if (typeof input.currency_code === "string") {
    formData.set("currency_code", input.currency_code);
  }

  if (typeof input.promptpay_id === "string") {
    formData.set("promptpay_id", input.promptpay_id);
  }

  if (input.logo) {
    formData.set("logo", input.logo);
  }

  return formData;
}

export function createStore(input: CreateStoreInput) {
  return authorizedApiRequest<Store>("/api/stores", {
    body: buildStoreFormData(input),
    method: "POST",
  }, { requireToken: true });
}

export function listMyStores() {
  return authorizedApiRequest<Store[]>("/api/me/stores", {}, { requireToken: true });
}

export function getStoreById(storeId: string) {
  return authorizedApiRequest<Store>(`/api/stores/${storeId}`, {}, { requireToken: true });
}

export function updateStoreById(storeId: string, input: UpdateStoreInput) {
  return authorizedApiRequest<Store>(
    `/api/stores/${storeId}`,
    {
      body: buildStoreUpdateFormData(input),
      method: "PUT",
    },
    { requireToken: true },
  );
}

export function listSubscriptionPlans() {
  return authorizedApiRequest<SubscriptionPlan[]>("/api/subscriptions/plans", {}, { requireToken: true });
}

export function getCurrentSubscription() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<StoreSubscription>(
    `/api/stores/${storeId}/subscription`,
    {},
    { requireToken: true },
  );
}

export function updateStoreSubscription(storeId: string, planCode: string) {
  return authorizedApiRequest<StoreSubscription>(
    `/api/stores/${storeId}/subscription`,
    {
      body: { plan_code: planCode },
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
    { requireToken: true },
  );
}

export function updateCurrentSubscription(planCode: string) {
  const storeId = ensureStoreId();
  return updateStoreSubscription(storeId, planCode);
}
