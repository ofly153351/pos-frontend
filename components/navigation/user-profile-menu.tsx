"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

import { clearAuthSession, getAuthSession } from "@/lib/auth-storage";
import { type Locale } from "@/lib/locale-config";
import { clearCurrentStoreId } from "@/lib/store-storage";
import { logout } from "@/services/auth";
import type { AuthPayload } from "@/types/auth";

type UserProfileMenuProps = {
  editProfileLabel: string;
  locale: Locale;
  logoutLabel: string;
  settingsLabel: string;
};

export function UserProfileMenu({
  editProfileLabel,
  locale,
  logoutLabel,
  settingsLabel,
}: UserProfileMenuProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const displayName = session?.user.name?.trim() || session?.user.email?.trim() || "";
  const displayEmail = session?.user.email?.trim() || "";
  const displayRole = session?.user.role?.trim() || "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "MP";

  async function handleLogout() {
    if (isLoggingOut) return;
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:bg-violet-50"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white ring-1 ring-violet-300">
          {initials}
        </div>
        {displayName ? (
          <p className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-800 sm:block">
            {displayName}
          </p>
        ) : null}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        {/* User info header */}
        <div className="bg-violet-50 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-base font-bold text-white ring-2 ring-violet-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {displayName ? (
                <p className="truncate text-sm font-bold text-slate-800">{displayName}</p>
              ) : null}
              {displayRole ? (
                <p className="mt-0.5 truncate text-xs font-semibold text-violet-600">
                  {displayRole}
                </p>
              ) : null}
              {displayEmail ? (
                <p className="mt-0.5 truncate text-xs text-slate-400">{displayEmail}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-1.5">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50"
            onClick={() => {
              setIsOpen(false);
              router.push(`/${locale}/profile`);
            }}
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <User className="h-3.5 w-3.5" />
            </span>
            {editProfileLabel}
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50"
            onClick={() => {
              setIsOpen(false);
              router.push(`/${locale}/settings`);
            }}
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Settings className="h-3.5 w-3.5" />
            </span>
            {settingsLabel}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-slate-100 p-1.5">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            {logoutLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
