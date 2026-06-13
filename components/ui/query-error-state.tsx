"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

// Shared error state for failed data fetches (TanStack Query). Renders an
// explicit error + retry affordance instead of a misleading empty/zero state.
// Self-contained bilingual copy keyed off `locale` (defaults to en) so it stays
// correct in both locales without threading dictionary keys through every caller.
const COPY = {
  th: {
    title: "โหลดข้อมูลไม่สำเร็จ",
    desc: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
    retry: "ลองใหม่",
  },
  en: {
    title: "Couldn't load data",
    desc: "Something went wrong while fetching. Please try again.",
    retry: "Retry",
  },
} as const;

export function QueryErrorState({
  locale = "en",
  onRetry,
  className = "",
}: {
  locale?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = locale === "th" ? COPY.th : COPY.en;
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-rose-800">{t.title}</p>
        <p className="mt-0.5 text-xs text-rose-700/80">{t.desc}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.retry}
        </button>
      ) : null}
    </div>
  );
}
