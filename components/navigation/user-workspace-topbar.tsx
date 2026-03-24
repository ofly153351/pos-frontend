"use client";

import { useRouter, usePathname } from "next/navigation";

import { localeStorageKey, type Locale } from "@/lib/locale-config";
import { UserProfileMenu } from "@/components/navigation/user-profile-menu";

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
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              locale === "th" ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => switchLocale("th")}
            type="button"
          >
            TH
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              locale === "en" ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => switchLocale("en")}
            type="button"
          >
            EN
          </button>
        </div>
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
          <UserProfileMenu
            editProfileLabel={editProfileLabel}
            locale={locale}
            logoutLabel={logoutLabel}
          />
        </div>
      </div>
    </header>
  );
}
