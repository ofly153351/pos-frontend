"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAuthSession, getAuthSession } from "@/lib/auth-storage";
import { type Locale } from "@/lib/locale-config";
import { clearCurrentStoreId } from "@/lib/store-storage";
import { logout } from "@/services/auth";
import type { AuthPayload } from "@/types/auth";

type UserProfileMenuProps = {
  editProfileLabel: string;
  locale: Locale;
  logoutLabel: string;
};

export function UserProfileMenu({
  editProfileLabel,
  locale,
  logoutLabel,
}: UserProfileMenuProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayName = session?.user.name?.trim() || session?.user.email?.trim() || "";
  const displayEmail = session?.user.email?.trim() || "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MP";

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // Always clear client session even if backend logout fails.
    } finally {
      clearAuthSession();
      clearCurrentStoreId();
      setSession(null);
      router.replace(`/${locale}/login`);
      router.refresh();
    }
  }

  function handleEditProfile() {
    setIsProfileMenuOpen(false);
    router.push(`/${locale}/setup/store`);
  }

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        aria-expanded={isProfileMenuOpen}
        className="flex items-center gap-3 rounded-full bg-white pl-2 pr-4 py-1 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
        type="button"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-xs font-bold text-white ring-2 ring-white shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 text-left">
          {displayName ? (
            <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
          ) : null}
          {displayEmail ? (
            <p className="truncate text-xs text-slate-500">{displayEmail}</p>
          ) : null}
        </div>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] w-44 rounded-xl border border-violet-100 bg-white p-1.5 shadow-xl transition-all duration-200 ${
          isProfileMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <button
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
          onClick={handleEditProfile}
          type="button"
        >
          {editProfileLabel}
        </button>
        <button
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          {logoutLabel}
        </button>
      </div>
    </div>
  );
}
