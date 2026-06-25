"use client";

import { useEffect, useRef } from "react";

import type { DeletionPhase, DeletionTarget } from "@/hooks/use-deletion-flow";
import {
  deletionVariant,
  type DeletionAssessment,
  type DeletionDialogDictionary,
  type DeletionEntity,
  type DeletionVariant,
} from "@/types/lifecycle";

type NavigateTarget = "transfer" | "products";

type DeletionDialogProps = {
  open: boolean;
  entity: DeletionEntity;
  target: DeletionTarget | null;
  assessment: DeletionAssessment | null;
  phase: DeletionPhase;
  error: string | null;
  stateChanged: boolean;
  dict: DeletionDialogDictionary;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onNavigate?: (target: NavigateTarget) => void;
};

// Substitutes {qty}/{rows}/{count}/{name} placeholders in a localized template.
function fmt(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

type IconKind = "archive" | "danger" | "warning" | "locked" | "default";

// Tone presets keep the dialog on the violet/rose/amber/slate system (no sky-*, no gradients).
const ICON_WRAP: Record<IconKind, string> = {
  archive: "bg-amber-100 text-amber-600",
  danger: "bg-rose-100 text-rose-600",
  warning: "bg-amber-100 text-amber-600",
  locked: "bg-slate-100 text-slate-500",
  default: "bg-amber-100 text-amber-600",
};

function DialogIcon({ kind }: { kind: IconKind }) {
  const cls = "h-5 w-5";
  const common = { className: cls, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (kind) {
    case "archive":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    case "danger":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
    case "locked":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case "default":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      );
    case "warning":
    default:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
        </svg>
      );
  }
}

type ViewModel = {
  icon: IconKind;
  title: string;
  body: string;
  note?: string; // secondary line (archive history note)
  confirmLabel?: string; // present → confirmable
  danger?: boolean;
  cta?: { label: string; target: NavigateTarget };
};

function buildViewModel(
  variant: DeletionVariant,
  a: DeletionAssessment,
  dict: DeletionDialogDictionary,
): ViewModel {
  const b = a.blockers;
  switch (variant) {
    case "archive":
      return {
        icon: "archive",
        title: dict.archiveTitle,
        body: dict.archiveBody,
        note: dict.archiveHistoryNote,
        confirmLabel: dict.archiveConfirm,
        danger: false,
      };
    case "hard_delete":
      return {
        icon: "danger",
        title: dict.deleteTitle,
        body: dict.deleteBody,
        confirmLabel: dict.deleteConfirm,
        danger: true,
      };
    case "blocked_stock":
      return {
        icon: "warning",
        title: dict.blockedStockTitle,
        body: fmt(dict.blockedStockBody, { qty: b.stock_quantity, rows: b.stock_row_count }),
        cta: { label: dict.blockedStockCta, target: "transfer" },
      };
    case "blocked_default":
      return {
        icon: "default",
        title: dict.blockedDefaultTitle,
        body: fmt(dict.blockedDefaultBody, { count: b.product_default_location_count }),
        cta: { label: dict.blockedDefaultCta, target: "products" },
      };
    case "blocked_protected":
      return { icon: "locked", title: dict.blockedProtectedTitle, body: dict.blockedProtectedBody };
    case "blocked_children":
      return {
        icon: "warning",
        title: dict.blockedChildrenTitle,
        body: fmt(dict.blockedChildrenBody, { count: b.blocked_child_count }),
      };
    case "blocked_open_ops":
      return {
        icon: "warning",
        title: dict.blockedOpenOpsTitle,
        body: fmt(dict.blockedOpenOpsBody, {
          count: b.open_receiving_count + b.open_stock_count_count + b.open_transfer_count,
        }),
      };
    case "blocked_generic":
    default:
      return { icon: "warning", title: dict.blockedGenericTitle, body: dict.blockedGenericBody };
  }
}

export function DeletionDialog({
  open,
  entity,
  target,
  assessment,
  phase,
  error,
  stateChanged,
  dict,
  onConfirm,
  onCancel,
  onRetry,
  onNavigate,
}: DeletionDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  // entity is part of the public contract (callers pass "warehouse" | "location"); the wording
  // is already localized per-slice so the dialog itself stays entity-neutral. Referenced here
  // to keep the prop meaningful for future entity-specific affordances without an unused-var lint.
  void entity;

  useEffect(() => {
    if (open) setTimeout(() => primaryRef.current?.focus(), 50);
  }, [open, phase, assessment]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const variant = deletionVariant(assessment);
  const vm = assessment && variant ? buildViewModel(variant, assessment, dict) : null;
  const isAssessing = phase === "assessing";
  const isDeleting = phase === "deleting";
  // Assessment failed to load (no assessment to show) → offer retry.
  const loadFailed = phase === "ready" && !assessment && !!error;

  return (
    <div
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        open ? "pointer-events-auto bg-slate-950/45 opacity-100" : "pointer-events-none bg-slate-950/0 opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out ${
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-2">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              vm ? ICON_WRAP[vm.icon] : "bg-slate-100 text-slate-500"
            }`}
          >
            {vm ? <DialogIcon kind={vm.icon} /> : <DialogIcon kind="warning" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {isAssessing ? dict.assessing : loadFailed ? dict.assessError : vm?.title}
            </h3>
            {target ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {target.name}
                {target.code ? <span className="text-slate-400"> · {target.code}</span> : null}
              </p>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2">
          {isAssessing ? (
            <div className="flex items-center gap-3 py-3 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
              {dict.assessing}
            </div>
          ) : loadFailed ? (
            <p className="text-sm text-slate-600">{error}</p>
          ) : vm ? (
            <div className="space-y-3">
              {stateChanged ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  {dict.stateChangedNotice}
                </div>
              ) : null}
              <p className="text-sm leading-relaxed text-slate-600">{vm.body}</p>
              {vm.note ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">{vm.note}</p>
              ) : null}
              {error && !loadFailed ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-violet-600 transition hover:bg-violet-50"
            onClick={onCancel}
            type="button"
            disabled={isDeleting}
          >
            {/* Confirmable → "Cancel"; terminal blocked/error → "Close" */}
            {vm?.confirmLabel ? dict.cancel : dict.close}
          </button>

          {loadFailed ? (
            <button
              ref={primaryRef}
              className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              onClick={onRetry}
              type="button"
            >
              {dict.retry}
            </button>
          ) : vm?.cta && onNavigate ? (
            <button
              ref={primaryRef}
              className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              onClick={() => onNavigate(vm.cta!.target)}
              type="button"
            >
              {vm.cta.label}
            </button>
          ) : vm?.confirmLabel ? (
            <button
              ref={primaryRef}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${
                vm.danger
                  ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                  : "bg-violet-700 hover:bg-violet-800 focus:ring-violet-500"
              }`}
              onClick={onConfirm}
              type="button"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {vm.confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
