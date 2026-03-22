export const currentStoreIdKey = "pos-current-store-id";

export function getCurrentStoreId() {
  return window.localStorage.getItem(currentStoreIdKey);
}

export function saveCurrentStoreId(storeId: string) {
  window.localStorage.setItem(currentStoreIdKey, storeId);
}

export function clearCurrentStoreId() {
  window.localStorage.removeItem(currentStoreIdKey);
}
