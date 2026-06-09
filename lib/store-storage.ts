export const currentStoreIdKey = "pos-current-store-id";

function syncStoreCookie(storeId: string) {
  document.cookie = `pos-store-id=${encodeURIComponent(storeId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function clearStoreCookie() {
  document.cookie = "pos-store-id=; Path=/; Max-Age=0; SameSite=Lax";
}

export function getCurrentStoreId() {
  // Guard SSR / prerender — callers may run this during render (no window).
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(currentStoreIdKey);
}

export function saveCurrentStoreId(storeId: string) {
  window.localStorage.setItem(currentStoreIdKey, storeId);
  syncStoreCookie(storeId);
}

export function clearCurrentStoreId() {
  window.localStorage.removeItem(currentStoreIdKey);
  clearStoreCookie();
}
