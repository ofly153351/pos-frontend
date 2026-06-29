"use client";

import { useState, useSyncExternalStore } from "react";
import { Info, X } from "lucide-react";

const DISMISS_KEY = "pos.documents.status-help.dismissed";

// Read the persisted dismissal SSR-safely via useSyncExternalStore: the server
// snapshot hides the banner (avoids a hydration flash), the client snapshot reads
// localStorage. No setState-in-effect (lint-clean).
function subscribe() {
  return () => {};
}
function getSnapshot(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Dismissible explainer shown above the documents table. Clarifies that the
 * document + payment statuses are a self-managed tracking aid and do NOT feed
 * the sales/finance figures (those come from POS checkouts only). Dismissal is
 * remembered in localStorage so it never nags after the first read.
 */
export function DocumentStatusHelp({
  title,
  body,
  creditHint,
  dismissLabel,
}: {
  title: string;
  body: string;
  creditHint: string;
  dismissLabel: string;
}) {
  const persistedDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Local override so the click hides it immediately without a store subscription.
  const [clickedDismiss, setClickedDismiss] = useState(false);

  if (persistedDismissed || clickedDismiss) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setClickedDismiss(true);
  }

  return (
    <div className="mx-6 mb-3 mt-1 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-violet-800">{title}</p>
        <p className="mt-0.5 leading-relaxed text-slate-600">{body}</p>
        <p className="mt-1 text-xs text-slate-500">{creditHint}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-violet-600 transition hover:bg-violet-100"
      >
        <X className="h-3.5 w-3.5" />
        {dismissLabel}
      </button>
    </div>
  );
}
