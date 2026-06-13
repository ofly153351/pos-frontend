"use client";

import { useEffect, useState } from "react";

import { getCurrentStoreId, storeChangedEvent } from "@/lib/store-storage";
import { listMyStores } from "@/services/stores";

export type StoreRole = "owner" | "manager" | "cashier" | "warehouse" | "";

// Module-level cache so multiple consumers (sidebar, dashboard, pages) share a
// single /me/stores fetch per store and re-render instantly after a store switch.
let cache: { storeId: string; role: StoreRole } | null = null;

function cachedRoleFor(storeId: string | null): StoreRole {
  if (storeId && cache && cache.storeId === storeId) return cache.role;
  return "";
}

async function resolveRole(storeId: string): Promise<StoreRole> {
  const res = await listMyStores();
  const match = res.data?.find((store) => store.id === storeId);
  return ((match?.role as StoreRole) ?? "") || "";
}

/**
 * Resolves the caller's STORE-scoped role for the currently selected store, read
 * from /me/stores (store_members.role) — never the global users.role. Re-resolves
 * automatically when the store changes (storeChangedEvent / cross-tab storage).
 * Defaults to "" (least privilege) until known.
 */
export function useStoreRole(): { role: StoreRole; loading: boolean } {
  const [role, setRole] = useState<StoreRole>(() => cachedRoleFor(getCurrentStoreId()));
  const [loading, setLoading] = useState<boolean>(() => cache === null);

  useEffect(() => {
    let mounted = true;

    function sync() {
      const storeId = getCurrentStoreId();
      if (!storeId) {
        cache = null;
        if (mounted) {
          setRole("");
          setLoading(false);
        }
        return;
      }
      if (cache && cache.storeId === storeId) {
        if (mounted) {
          setRole(cache.role);
          setLoading(false);
        }
        return;
      }
      if (mounted) setLoading(true);
      resolveRole(storeId)
        .then((resolved) => {
          cache = { storeId, role: resolved };
          if (mounted) setRole(resolved);
        })
        .catch(() => {
          if (mounted) setRole("");
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

  return { role, loading };
}

/** owner/manager may manage the store (staff, settings, finance, purchasing CRUD). */
export function canManageStore(role: StoreRole): boolean {
  return role === "owner" || role === "manager";
}
