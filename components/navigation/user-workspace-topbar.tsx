"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { localeStorageKey, type Locale } from "@/lib/locale-config";
import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import { UserProfileMenu } from "@/components/navigation/user-profile-menu";
import { getStoreById, listMyStores } from "@/services/stores";

type UserWorkspaceTopbarProps = {
  editProfileLabel: string;
  locale: Locale;
  logoutLabel: string;
  onToggle: () => void;
  title: string;
};

export function UserWorkspaceTopbar({
  editProfileLabel,
  locale,
  logoutLabel,
  onToggle,
  title,
}: UserWorkspaceTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStoreHeader() {
      try {
        const session = getAuthSession();
        const selectedStoreId = getCurrentStoreId() || session?.store_id;

        if (selectedStoreId) {
          saveCurrentStoreId(selectedStoreId);
          const response = await getStoreById(selectedStoreId);

          if (!isMounted) {
            return;
          }

          setStoreLogoUrl(response.data.logo_url ?? "");
          setStoreName(response.data.name ?? "");
          return;
        }

        const storesResponse = await listMyStores();
        const firstStore = storesResponse.data[0];

        if (!isMounted || !firstStore) {
          return;
        }

        setStoreLogoUrl(firstStore.logo_url ?? "");
        setStoreName(firstStore.name ?? "");
      } catch {
        if (isMounted) {
          setStoreLogoUrl("");
          setStoreName("");
        }
      }
    }

    loadStoreHeader();

    return () => {
      isMounted = false;
    };
  }, []);

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }

    const segments = pathname.split("/");
    segments[1] = nextLocale;
    window.localStorage.setItem(localeStorageKey, nextLocale);
    router.push(segments.join("/") || `/${nextLocale}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-violet-100 bg-white/90 px-8 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"
          onClick={onToggle}
          type="button"
        >
          <span className="text-xs font-bold">||</span>
        </button>
        <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-violet-200 bg-violet-50">
          {storeLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={storeName || title}
              className="h-full w-full object-cover"
              src={storeLogoUrl}
            />
          ) : (
            <span className="text-xs font-bold text-violet-600">
              {(storeName || title).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-lg font-bold text-slate-900">{title}</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-white p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              locale === "th"
                ? "bg-sky-600 text-white"
                : "text-violet-700 hover:bg-violet-50"
            }`}
            onClick={() => switchLocale("th")}
            type="button"
          >
            TH
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              locale === "en"
                ? "bg-sky-600 text-white"
                : "text-violet-700 hover:bg-violet-50"
            }`}
            onClick={() => switchLocale("en")}
            type="button"
          >
            EN
          </button>
        </div>

        <UserProfileMenu
          editProfileLabel={editProfileLabel}
          locale={locale}
          logoutLabel={logoutLabel}
        />
      </div>
    </header>
  );
}
