"use client";

import { useEffect, useSyncExternalStore, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info" | "warning";

type ToastEntry = {
  id: string;
  tone: ToastTone;
  message: string;
  duration: number;
};

// ── Module-level store — no context or Zustand needed ───────────────────────
let _toasts: ToastEntry[] = [];
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((l) => l());
}

function _add(entry: Omit<ToastEntry, "id">): string {
  const id = Math.random().toString(36).slice(2, 10);
  _toasts = [..._toasts, { ...entry, id }];
  _notify();
  setTimeout(() => _remove(id), entry.duration);
  return id;
}

function _remove(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id);
  _notify();
}

// ── Public API — import and call from anywhere (components, callbacks, utils) ─
export const toast = {
  success: (message: string, duration = 3500) => _add({ tone: "success", message, duration }),
  error:   (message: string, duration = 5000) => _add({ tone: "error",   message, duration }),
  info:    (message: string, duration = 3000) => _add({ tone: "info",    message, duration }),
  warning: (message: string, duration = 4000) => _add({ tone: "warning", message, duration }),
  dismiss: (id: string) => _remove(id),
};

// Convenience React hook (returns the same `toast` object)
export function useToast() {
  return toast;
}

// ── Individual toast item ───────────────────────────────────────────────────
const ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
  error:   <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />,
  info:    <Info className="h-4 w-4 shrink-0 text-violet-500" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
};

const STYLE: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error:   "border-rose-200   bg-white text-rose-800",
  info:    "border-violet-200 bg-white text-violet-800",
  warning: "border-amber-200  bg-white text-amber-800",
};

function ToastItem({ id, tone, message }: ToastEntry) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`pointer-events-auto flex min-w-[280px] max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg shadow-black/5 transition-all duration-300 ease-out
        ${STYLE[tone]}
        ${show ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`}
    >
      {ICON[tone]}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-70"
        onClick={() => _remove(id)}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const _emptyToasts: ToastEntry[] = [];

// ── Toaster — place once in root layout ────────────────────────────────────
export function Toaster() {
  const activeToasts = useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => _listeners.delete(cb); },
    () => _toasts,
    () => _emptyToasts,
  );

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {activeToasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
