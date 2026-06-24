// Shared types + helpers for the unified Purchasing & Goods Receiving workspace
// (Phase 3C). Pure module — no React, no side effects — so every tab imports the
// same formatters, progress math, and dictionary shape.

import type { PurchaseOrder } from "@/services/purchases";
import type { GoodsReceiptStatus } from "@/types/goods-receipt";
import type { StoreRole } from "@/lib/use-store-role";

export type PurchaseOrderStatus = PurchaseOrder["status"]; // "pending" | "partial" | "completed" | "cancelled"

export type WorkspaceTabKey =
  | "overview"
  | "purchase-orders"
  | "pending-receiving"
  | "goods-receipts"
  | "pending-approval"
  | "completed";

export const WORKSPACE_TABS: WorkspaceTabKey[] = [
  "overview",
  "purchase-orders",
  "pending-receiving",
  "goods-receipts",
  "pending-approval",
  "completed",
];

export function isWorkspaceTab(value: string | null | undefined): value is WorkspaceTabKey {
  return !!value && (WORKSPACE_TABS as string[]).includes(value);
}

// Navigation callbacks owned by the container and passed to every tab. All
// receiving flows route through the canonical single-page editor — never the
// legacy Quick Receive endpoint.
export type WorkspaceNav = {
  /** Open the canonical receive editor pre-filled from a purchase order. */
  receiveForPo: (poId: string) => void;
  /** Open the canonical receive editor with no PO (receive without PO). */
  receiveWithoutPo: () => void;
  /** Open an existing goods receipt in the canonical editor / view page. */
  openReceipt: (receiptId: string) => void;
  /** Switch the active workspace tab (also updates the ?tab= URL). */
  switchTab: (tab: WorkspaceTabKey) => void;
};

// Full dictionary shape for the workspace. Mirrors locales/*.json
// "purchasingWorkspace". The page passes dictionary.purchasingWorkspace into the
// workspace, so any missing key surfaces as a compile error at the call site.
export type WsDict = {
  title: string;
  subtitle: string;
  // quick actions
  createPo: string;
  createPoDenied: string;
  receiveWithoutPo: string;
  receiveDenied: string;
  openReceivingList: string;
  // tabs
  tabOverview: string;
  tabPurchaseOrders: string;
  tabPendingReceiving: string;
  tabGoodsReceipts: string;
  tabPendingApproval: string;
  tabCompleted: string;
  // KPIs
  kpiOpenPo: string;
  kpiNotReceived: string;
  kpiPartial: string;
  kpiPendingApproval: string;
  kpiCompletedMonth: string;
  kpiCancelledPo: string;
  // PO status labels
  poPending: string;
  poPartial: string;
  poCompleted: string;
  poCancelled: string;
  // receipt status labels
  rcDraft: string;
  rcPendingReview: string;
  rcConfirmed: string;
  rcCancelled: string;
  // record type
  recordPo: string;
  recordReceipt: string;
  // table headers
  thPoNumber: string;
  thSupplier: string;
  thOrderDate: string;
  thItems: string;
  thOrderedValue: string;
  thProgress: string;
  thStatus: string;
  thActions: string;
  thOrderedQty: string;
  thReceivedQty: string;
  thOutstandingQty: string;
  thReceiptNumber: string;
  thPurchaseOrder: string;
  thWarehouse: string;
  thReceiveDate: string;
  thItemCount: string;
  thValue: string;
  thCreatedBy: string;
  thSubmittedBy: string;
  thRecordType: string;
  thCompletedDate: string;
  // actions
  actReceive: string;
  actReceiveRemaining: string;
  actContinueEditing: string;
  actView: string;
  actReview: string;
  actCancelOrder: string;
  confirmCancelOrder: string;
  cancelOrderSuccess: string;
  // progress / units
  progressReceived: string; // "{received} / {ordered} received"
  itemsUnit: string;
  // filters
  searchPo: string;
  searchReceipt: string;
  filterAllStatuses: string;
  filterAllSuppliers: string;
  filterAllTypes: string;
  resetFilters: string;
  // recent activity
  recentAwaitingReceipt: string;
  recentAwaitingApproval: string;
  recentConfirmed: string;
  viewAll: string;
  // states
  loading: string;
  emptyPo: string;
  emptyPendingReceiving: string;
  emptyGoodsReceipts: string;
  emptyPendingApproval: string;
  emptyCompleted: string;
  emptyFiltered: string;
  // pagination
  prev: string;
  next: string;
  pageOf: string; // "Page {page} of {total}"
  // misc
  none: string;
  requestFailed: string;
};

// ── Formatters ───────────────────────────────────────────────────────────────

// Currency stays th-TH (฿) in both locales to match the rest of the POS.
export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLocale(locale: string): string {
  return locale === "th" ? "th-TH" : "en-GB";
}

export function formatDate(locale: string, value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" }).format(d);
}

export function formatDateTime(locale: string, value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function template(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

// ── PO receiving progress ────────────────────────────────────────────────────

export type PoProgress = {
  ordered: number;
  received: number;
  outstanding: number;
  /** 0–100, clamped. */
  pct: number;
};

export function poProgress(po: PurchaseOrder): PoProgress {
  const items = po.items ?? [];
  let ordered = 0;
  let received = 0;
  for (const it of items) {
    ordered += it.quantity ?? 0;
    received += it.received_quantity ?? 0;
  }
  const outstanding = Math.max(0, ordered - received);
  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  return { ordered, received, outstanding, pct };
}

/** A PO that can still receive stock: pending or partial (not completed/cancelled). */
export function isOpenPo(po: PurchaseOrder): boolean {
  return po.status === "pending" || po.status === "partial";
}

// ── Permissions (mirror backend gates; backend still enforces) ───────────────

/** operate-level: owner/manager/cashier/warehouse may create/submit receipts. */
export function canOperateStore(role: StoreRole): boolean {
  return role === "owner" || role === "manager" || role === "cashier" || role === "warehouse";
}

// ── Status label + badge styling ─────────────────────────────────────────────

export function poStatusLabel(dict: WsDict, status: PurchaseOrderStatus): string {
  switch (status) {
    case "pending":
      return dict.poPending;
    case "partial":
      return dict.poPartial;
    case "completed":
      return dict.poCompleted;
    case "cancelled":
      return dict.poCancelled;
    default:
      return status;
  }
}

export function poStatusBadgeClass(status: PurchaseOrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60";
    case "partial":
      return "bg-violet-100 text-violet-700 ring-1 ring-violet-200/60";
    case "completed":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60";
    case "cancelled":
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60";
    default:
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60";
  }
}

export function receiptStatusLabel(dict: WsDict, status: GoodsReceiptStatus): string {
  switch (status) {
    case "draft":
      return dict.rcDraft;
    case "pending_review":
      return dict.rcPendingReview;
    case "confirmed":
      return dict.rcConfirmed;
    case "cancelled":
      return dict.rcCancelled;
    default:
      return status;
  }
}

export function receiptStatusBadgeClass(status: GoodsReceiptStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60";
    case "pending_review":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60";
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60";
    case "cancelled":
      return "bg-rose-100 text-rose-700 ring-1 ring-rose-200/60";
    default:
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60";
  }
}
