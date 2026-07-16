import type { AuthPayload } from "@/types/auth";

export const authStorageKey = "pos-auth";

export function saveAuthSession(payload: AuthPayload) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(payload));
}

export function clearAuthSession() {
  window.localStorage.removeItem(authStorageKey);
}

export function getAuthSession() {
  // SSR / prerender guard: callers may read the session at render scope (e.g. StaffManager
  // reads currentUserId during render), which executes on the server during static
  // generation where window/localStorage do not exist. Return a server-safe null there;
  // the client re-renders with the real session after hydration. Mirrors the guard already
  // used in lib/store-storage.ts getCurrentStoreId().
  if (typeof window === "undefined") {
    return null;
  }
  const rawValue = window.localStorage.getItem(authStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthPayload;
  } catch {
    clearAuthSession();
    return null;
  }
}
