// Small presentational pieces shared across the workspace tabs. Pure, no hooks.

import type { ReactNode } from "react";
import { Package } from "lucide-react";

import type { GoodsReceiptStatus } from "@/types/goods-receipt";
import {
  poStatusBadgeClass,
  poStatusLabel,
  receiptStatusBadgeClass,
  receiptStatusLabel,
  type PoProgress,
  type PurchaseOrderStatus,
  type WsDict,
} from "./workspace-shared";

export function PoBadge({ dict, status }: { dict: WsDict; status: PurchaseOrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${poStatusBadgeClass(status)}`}>
      {poStatusLabel(dict, status)}
    </span>
  );
}

export function ReceiptBadge({ dict, status }: { dict: WsDict; status: GoodsReceiptStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${receiptStatusBadgeClass(status)}`}>
      {receiptStatusLabel(dict, status)}
    </span>
  );
}

export function RecordTypeBadge({ label, tone }: { label: string; tone: "po" | "receipt" }) {
  const cls =
    tone === "po"
      ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60"
      : "bg-teal-100 text-teal-700 ring-1 ring-teal-200/60";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

// Receiving-progress bar + "x / y received" caption.
export function ProgressBar({ progress, caption }: { progress: PoProgress; caption: string }) {
  const tone =
    progress.pct >= 100 ? "bg-emerald-500" : progress.pct > 0 ? "bg-violet-500" : "bg-slate-300";
  return (
    <div className="min-w-[120px]">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${progress.pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{caption}</p>
    </div>
  );
}

export function SupplierText({ name, fallback }: { name?: string | null; fallback: string }) {
  if (!name) return <span className="text-slate-400">{fallback}</span>;
  return <span className="truncate font-medium text-slate-800">{name}</span>;
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-400">
        {icon ?? <Package className="h-7 w-7" />}
      </span>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {action}
    </div>
  );
}

export function LoadingRows({ label }: { label: string }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
      <p className="pt-1 text-center text-xs text-slate-400">{label}</p>
    </div>
  );
}

// Tab button used in the workspace tab bar.
export function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
        active
          ? "border-violet-500 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
            active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
