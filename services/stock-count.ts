import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { CountSession } from "@/types/stock-count";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

// List every stock-count session (with its items) for the current store.
export function listCountSessions() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CountSession[]>(`/api/stores/${storeId}/stock-count-sessions`);
}

// Create or replace a single session (header + items) — used for save-draft and
// every subsequent edit, so the worksheet is durable and visible to all terminals.
export function saveCountSession(session: CountSession) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CountSession>(
    `/api/stores/${storeId}/stock-count-sessions/${session.id}`,
    {
      body: session,
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

export type ApplyCountItem = {
  productId: string;
  countedQty: number;
  note?: string;
};

// Commit counted quantities as real stock corrections in ONE atomic backend
// transaction — every COUNT_CORRECTION movement, stock write and the session
// completion succeed together or not at all (fail-all). Returns the completed
// session so the caller can converge local state with the server.
export function applyCountSession(sessionId: string, items: ApplyCountItem[]) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CountSession>(
    `/api/stores/${storeId}/stock-count-sessions/${sessionId}/apply`,
    {
      body: { items },
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function deleteCountSession(sessionId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<null>(`/api/stores/${storeId}/stock-count-sessions/${sessionId}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}
