"use client";

import { useEffect, useState } from "react";

import { getAuthSession } from "@/lib/auth-storage";
import type { AuthPayload } from "@/types/auth";

type UserWorkspaceTopbarProps = {
  onToggle: () => void;
  searchPlaceholder: string;
  title: string;
};

export function UserWorkspaceTopbar({
  onToggle,
  searchPlaceholder,
  title,
}: UserWorkspaceTopbarProps) {
  const [session, setSession] = useState<AuthPayload | null>(null);

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

  const displayName = session?.user.name?.trim() || session?.user.email?.trim() || "";
  const displayEmail = session?.user.email?.trim() || "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MP";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white/80 px-8 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          onClick={onToggle}
          type="button"
        >
          <span className="text-xs font-bold">||</span>
        </button>
        <div className="text-lg font-bold text-slate-900">{title}</div>
      </div>

      <div className="flex items-center gap-6">
        <input
          className="w-64 rounded-lg border-none bg-slate-100 px-4 py-2 text-sm text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          placeholder={searchPlaceholder}
          readOnly
          type="text"
        />
        <div className="flex items-center gap-3 text-slate-500">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-blue-50 hover:text-blue-600"
            type="button"
          >
            N
          </button>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-blue-50 hover:text-blue-600"
            type="button"
          >
            ?
          </button>
          <div className="flex items-center gap-3 rounded-full bg-white pl-2 pr-4 py-1 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 ring-2 ring-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              {displayName ? (
                <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
              ) : null}
              {displayEmail ? (
                <p className="truncate text-xs text-slate-500">{displayEmail}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
