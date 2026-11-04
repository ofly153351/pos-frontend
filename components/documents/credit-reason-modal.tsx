"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileMinus } from "lucide-react";

import { getApiErrorMessages } from "@/lib/api-error";

// Asks for the mandatory credit-note reason (B13) before converting an
// original document into a credit note. Closes on Escape and backdrop click.
export function CreditReasonModal({
  open,
  documentNo,
  onSubmit,
  onClose,
}: {
  open: boolean;
  documentNo?: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const m = getApiErrorMessages() as Record<string, unknown>;
  const text = (key: string, fallback: string) => (typeof m[key] === "string" ? (m[key] as string) : fallback);
  const trimmed = reason.trim();

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="smooth-fade absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        className="smooth-fade relative z-[91] w-full max-w-sm overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onSubmit(trimmed);
          setReason("");
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <FileMinus className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-bold text-slate-900">
            {text("creditReasonTitle", "Credit note reason")}
            {documentNo ? <span className="ml-1 font-mono text-sm text-slate-500">{documentNo}</span> : null}
          </h2>
        </div>
        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="credit-reason">
          {text("creditReasonLabel", "Reason")}
        </label>
        <textarea
          id="credit-reason"
          autoFocus
          className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          placeholder={text("creditReasonPlaceholder", "e.g. damaged goods returned")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={onClose}>
            {text("creditReasonCancel", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {text("creditReasonConfirm", "Create credit note")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
