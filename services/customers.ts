import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  CreateCustomerInput,
  Customer,
  CustomerLevelDiscount,
  UpdateCustomerInput,
} from "@/types/customer";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

export function listCustomers() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Customer[]>(`/api/stores/${storeId}/customers`);
}

export function getCustomerById(customerId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Customer>(`/api/stores/${storeId}/customers/${customerId}`);
}

export function createCustomer(input: CreateCustomerInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Customer>(`/api/stores/${storeId}/customers`, {
    body: input,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Customer>(`/api/stores/${storeId}/customers/${customerId}`, {
    body: input,
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

export function deleteCustomer(customerId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/customers/${customerId}`, {
    method: "DELETE",
  });
}

export function listCustomerLevelDiscounts() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CustomerLevelDiscount[]>(`/api/stores/${storeId}/customer-level-discounts`);
}

export function upsertCustomerLevelDiscount(level: number, discountPercent: number) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CustomerLevelDiscount>(`/api/stores/${storeId}/customer-level-discounts/${level}`, {
    body: { discount_percent: discountPercent },
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function deleteCustomerLevelDiscount(level: number) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Record<string, never>>(`/api/stores/${storeId}/customer-level-discounts/${level}`, {
    method: "DELETE",
  });
}
