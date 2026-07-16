"use client";

import { useEffect, useState } from "react";

import { getCurrentStoreId, storeChangedEvent } from "@/lib/store-storage";
import { listMyStores } from "@/services/stores";

export type StoreRole = "owner" | "manager" | "cashier" | "warehouse" | "";

// Module-level cache so multiple consumers (sidebar, dashboard, pages) share a
// single /me/stores fetch per store and re-render instantly after a store switch.
let cache: { storeId: string; role: StoreRole; storeName: string; storeLogoUrl: string | null } | null = null;

async function resolveIdentity(storeId: string): Promise<{ role: StoreRole; storeName: string; storeLogoUrl: string | null }> {
  const res = await listMyStores();
  const match = res.data?.find((store) => store.id === storeId);
  return {
    role: ((match?.role as StoreRole) ?? "") || "",
    storeName: match?.name ?? "",
    storeLogoUrl: match?.logo_url ?? null,
  };
}

/**
 * Resolves the caller's STORE-scoped role for the currently selected store, read
 * from /me/stores (store_members.role) — never the global users.role. Re-resolves
 * automatically when the store changes (storeChangedEvent / cross-tab storage).
 * Defaults to "" (least privilege) until known.
 *
 * Also exposes storeName and storeLogoUrl from the same fetch — used by the
 * Customer Display publisher to include store identity in DisplayState.
 */
export function useStoreRole(): { role: StoreRole; loading: boolean; storeName: string; storeLogoUrl: string | null } {
  // First render must be SSR-stable: the server has no localStorage/module cache, so it
  // always renders role="" / loading=true. Reading the warm client cache here would make
  // the first client render diverge from the SSR HTML → hydration mismatch (e.g. the
  // warehouse action bar's primary button + order flips). Start from the server-stable
  // values and let the effect below populate from cache/fetch right after mount.
  const [role, setRole] = useState<StoreRole>("");
  const [storeName, setStoreName] = useState<string>("");
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    function sync() {
      const storeId = getCurrentStoreId();
      if (!storeId) {
        cache = null;
        if (mounted) {
          setRole("");
          setStoreName("");
          setStoreLogoUrl(null);
          setLoading(false);
        }
        return;
      }
      if (cache && cache.storeId === storeId) {
        if (mounted) {
          setRole(cache.role);
          setStoreName(cache.storeName);
          setStoreLogoUrl(cache.storeLogoUrl);
          setLoading(false);
        }
        return;
      }
      if (mounted) setLoading(true);
      resolveIdentity(storeId)
        .then(({ role: resolved, storeName: name, storeLogoUrl: logoUrl }) => {
          cache = { storeId, role: resolved, storeName: name, storeLogoUrl: logoUrl };
          if (mounted) {
            setRole(resolved);
            setStoreName(name);
            setStoreLogoUrl(logoUrl);
          }
        })
        .catch(() => {
          if (mounted) {
            setRole("");
            setStoreName("");
            setStoreLogoUrl(null);
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }

    sync();
    window.addEventListener(storeChangedEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      mounted = false;
      window.removeEventListener(storeChangedEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { role, loading, storeName, storeLogoUrl };
}

/** owner/manager may manage the store (staff, settings, finance, purchasing CRUD). */
export function canManageStore(role: StoreRole): boolean {
  return role === "owner" || role === "manager";
}
