"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** "danger" → red confirm button (destructive actions). */
  tone?: "danger" | "default";
  /** Disables both buttons + shows a spinner while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Themed confirmation dialog — drop-in replacement for window.confirm().
 * Rendered through a body portal so it sits above drawers/menus and escapes any
 * clipped/dimmed ancestor. Closes on Escape and on backdrop click (unless loading).
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open || typeof document === "undefined") return null;

  const danger = tone === "danger";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="smooth-fade absolute inset-0 bg-slate-900/40"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="smooth-fade relative z-[91] w-full max-w-sm overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 p-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-rose-100 text-rose-600" : "bg-violet-100 text-violet-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {message && <p className="mt-1 text-sm leading-relaxed text-slate-500">{message}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={cancelLabel}
            className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
