import {
  Activity,
  Boxes,
  CircleDollarSign,
  FileText,
  Lock,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { ActivitySeverity, ActivityCategory } from "@/services/activity-logs";
import type { ActivityDict } from "./types";

// Re-export so consumers can pull the severity/category types from one place.
export type { ActivitySeverity, ActivityCategory } from "@/services/activity-logs";

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Module (badge icon + tint) ────────────────────────────────────────────────
export const MODULE_ICON: Record<string, LucideIcon> = {
  product: Package,
  sale: ShoppingCart,
  document: FileText,
  customer: Users,
  warehouse: Warehouse,
  stock: Package,
  purchasing: Truck,
  location: Warehouse,
  invoice: FileText,
  "parked-bill": FileText,
  promotion: Tag,
  settings: Settings,
  finance: CircleDollarSign,
};

export const MODULE_COLOR: Record<string, string> = {
  product: "bg-blue-50 text-blue-700 border-blue-200",
  sale: "bg-emerald-50 text-emerald-700 border-emerald-200",
  document: "bg-violet-50 text-violet-700 border-violet-200",
  customer: "bg-orange-50 text-orange-700 border-orange-200",
  warehouse: "bg-cyan-50 text-cyan-700 border-cyan-200",
  stock: "bg-amber-50 text-amber-700 border-amber-200",
  purchasing: "bg-pink-50 text-pink-700 border-pink-200",
  location: "bg-teal-50 text-teal-700 border-teal-200",
  invoice: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "parked-bill": "bg-slate-50 text-slate-700 border-slate-200",
  promotion: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  settings: "bg-slate-50 text-slate-600 border-slate-200",
  finance: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const ACTION_COLOR: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  pay: "bg-green-100 text-green-800",
  cancel: "bg-orange-100 text-orange-800",
  convert: "bg-purple-100 text-purple-800",
  adjust: "bg-amber-100 text-amber-800",
  transfer: "bg-cyan-100 text-cyan-800",
  receive: "bg-teal-100 text-teal-800",
  void: "bg-red-100 text-red-800",
  "manage-members": "bg-slate-100 text-slate-800",
  "manage-bank-accounts": "bg-slate-100 text-slate-800",
  print: "bg-slate-100 text-slate-700",
};

// ─── Category (icon + tint) — spec §11 ──────────────────────────────────────────
export const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  inventory: Boxes,
  finance: CircleDollarSign,
  sales: ShoppingCart,
  purchasing: Truck,
  customer: Users,
  promotion: Tag,
  settings: Settings,
  security: Lock,
  general: Activity,
};

export const CATEGORY_COLOR: Record<ActivityCategory, string> = {
  inventory: "bg-blue-50 text-blue-600",
  finance: "bg-emerald-50 text-emerald-600",
  sales: "bg-violet-50 text-violet-600",
  purchasing: "bg-pink-50 text-pink-600",
  customer: "bg-orange-50 text-orange-600",
  promotion: "bg-fuchsia-50 text-fuchsia-600",
  settings: "bg-slate-50 text-slate-600",
  security: "bg-rose-50 text-rose-600",
  general: "bg-slate-50 text-slate-500",
};

// ─── Severity (badge + left stripe + dot) — spec §10 ────────────────────────────
export const SEVERITY_ORDER: ActivitySeverity[] = ["critical", "high", "medium", "normal"];

export const SEVERITY_STYLE: Record<
  ActivitySeverity,
  { badge: string; stripe: string; dot: string }
> = {
  critical: { badge: "bg-rose-100 text-rose-700 ring-1 ring-rose-200", stripe: "bg-rose-500", dot: "bg-rose-500" },
  high: { badge: "bg-orange-100 text-orange-700 ring-1 ring-orange-200", stripe: "bg-orange-400", dot: "bg-orange-400" },
  medium: { badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200", stripe: "bg-amber-300", dot: "bg-amber-300" },
  normal: { badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", stripe: "bg-emerald-300", dot: "bg-emerald-300" },
};

// Modules whose edits the backend captures a diff for and whose previous values can
// be restored via the existing update endpoint (spec §5). Drives the Restore button.
export const RESTORABLE_KINDS = new Set(["product", "promotion", "store", "receipt_settings", "member"]);

// Best-effort "Open Record" destinations. Only modules with a known list/detail page
// get a link; the rest hide the button rather than risk a dead route.
const MODULE_ROUTE: Record<string, string> = {
  product: "/products",
  promotion: "/promotions",
  customer: "/customers",
  sale: "/sales",
  invoice: "/documents",
  document: "/documents",
  purchasing: "/purchasing",
};

export function openRecordHref(module: string, locale: string): string | null {
  const base = MODULE_ROUTE[module];
  return base ? `/${locale}${base}` : null;
}

// ─── Time helpers ───────────────────────────────────────────────────────────────
export function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// relativeTime renders "10 minutes ago" style strings from the dict so it stays
// localized without pulling in a date library.
export function relativeTime(iso: string, now: number, t: ActivityDict["relative"]): string {
  const diffMs = now - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo.replace("{n}", String(min));
  const hours = Math.floor(min / 60);
  if (hours < 24) return t.hoursAgo.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t.daysAgo.replace("{n}", String(days));
}

// A value is "scalar" if it renders cleanly as a single before/after chip. Object /
// array values (e.g. a promotion's full campaign blob, kept only for restore) are
// hidden from the human diff.
export function isScalar(v: unknown): boolean {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

export function formatValue(v: unknown, emptyLabel: string): string {
  if (v === null || v === undefined || v === "") return emptyLabel;
  if (typeof v === "boolean") return v ? "✓" : "✗";
  return String(v);
}
