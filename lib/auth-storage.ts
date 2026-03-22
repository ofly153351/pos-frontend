import type { AuthPayload } from "@/types/auth";

export const authStorageKey = "pos-auth";

export function saveAuthSession(payload: AuthPayload) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(payload));
}

export function clearAuthSession() {
  window.localStorage.removeItem(authStorageKey);
}

export function getAuthSession() {
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
