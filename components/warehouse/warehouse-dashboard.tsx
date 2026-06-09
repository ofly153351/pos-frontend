"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  Clock3,
  DollarSign,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  PackageX,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";

import { type Locale } from "@/lib/locale-config";
import { getCurrentStoreId } from "@/lib/store-storage";
import { getWarehouseDashboard } from "@/services/warehouse-dashboard";
import type {
  LowStockAlert,
  RecentActivity,
  WarehouseDashboardData,
  WarehousePeriod,
} from "@/types/warehouse-dashboard";

type CountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";

type WarehouseDashboardDictionary = {
  title: string;
  subtitle: string;
  refresh: string;
  actionCenter: {
    title: string;
    subtitle: string;
    open: string;
    items: {
      lowStock: string;
      outOfStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
    helpers: {
      lowStock: string;
      outOfStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
  };
  kpi: {
    inventoryValue: string;
    availableStock: string;
    reservedStock: string;
    damagedStock: string;
    inTransitStock: string;
    helpers: {
      inventoryValue: string;
      availableStock: string;
      reservedStock: string;
      damagedStock: string;
      inTransitStock: string;
    };
  };
  movement: {
    title: string;
    periods: {
      sevenDays: string;
      thirtyDays: string;
      threeMonths: string;
    };
    legends: {
      receive: string;
      issue: string;
      transfer: string;
      total: string;
    };
    empty: string;
  };
  alerts: {
    title: string;
    subtitle: string;
    critical: string;
    warning: string;
    info: string;
    viewAll: string;
    noAlerts: string;
    items: {
      lowStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
    stockLevel: string;
  };
  variance: {
    title: string;
    viewCount: string;
    headers: {
      product: string;
      systemQty: string;
      countQty: string;
      variance: string;
    };
    noData: string;
  };
  statusDistribution: {
    title: string;
    subtitle: string;
    labels: {
      available: string;
      reserved: string;
      damaged: string;
      inTransit: string;
      counting: string;
    };
    helpers: {
      available: string;
      reserved: string;
      damaged: string;
      inTransit: string;
      counting: string;
    };
  };
  recentActivity: {
    title: string;
    subtitle: string;
    noData: string;
    reference: string;
    types: {
      receive: string;
      transfer: string;
      adjustment: string;
      count: string;
      approval: string;
      sale: string;
      issue: string;
      return: string;
    };
    messages: {
      receive: string;
      transfer: string;
      adjustment: string;
      count: string;
      approval: string;
      sale: string;
      issue: string;
      return: string;
    };
  };
  summary: {
    inventoryValue: string;
    availableStock: string;
    reservedStock: string;
    damagedStock: string;
    inTransitStock: string;
    activeAlerts: string;
  };
  units: {
    items: string;
  };
};

type LocalCountItem = {
  productId: string;
  name: string;
  systemQty: number;
  counted: number | null;
  skipped: boolean;
  varianceReason?: string;
};

type LocalCountSession = {
  id: string;
  name: string;
  status: CountStatus;
  createdAt: string;
  completedAt?: string | null;
  items: LocalCountItem[];
};

type ActionCenterItem = {
  key: string;
  label: string;
  value: number;
  helper: string;
  href: string;
  tone: "critical" | "warning" | "info";
  icon: ReactNode;
};

type VarianceRow = {
  key: string;
  product: string;
  systemQty: number;
  countQty: number;
  variance: number;
  sessionName: string;
  absVariance: number;
};

type StatusRow = {
  key: string;
  label: string;
  value: number;
  helper: string;
  tone: string;
  bar: string;
};

type TimelineRow = {
  id: string;
  kind: "IN" | "OUT" | "SALE" | "TRANSFER" | "ADJUST" | "RETURN" | "COUNT" | "APPROVAL";
  title: string;
  detail: string;
  reference: string;
  createdAt: string;
  tone: string;
  icon: ReactNode;
};

type WarehouseDashboardProps = {
  dictionary: WarehouseDashboardDictionary;
  locale: Locale;
};

function toLocaleTag(locale: Locale) {
  return locale === "th" ? "th-TH" : "en-US";
}

function formatCurrency(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatNumber(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(toLocaleTag(locale)).format(Number(value ?? 0));
}

function formatShortDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(toLocaleTag(locale), { day: "numeric", month: "short" }).format(date);
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function variance(item: LocalCountItem) {
  return item.counted == null ? 0 : item.counted - item.systemQty;
}

function normalizeSessions(raw: unknown): LocalCountSession[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((session): LocalCountSession | null => {
      if (!session || typeof session !== "object") return null;
      const s = session as Record<string, unknown>;
      const items = Array.isArray(s.items)
        ? s.items
            .map((item): LocalCountItem | null => {
              if (!item || typeof item !== "object") return null;
              const it = item as Record<string, unknown>;
              return {
                productId: String(it.productId ?? ""),
                name: String(it.name ?? ""),
                systemQty: Number(it.systemQty ?? 0),
                counted: typeof it.counted === "number" ? it.counted : null,
                skipped: Boolean(it.skipped),
                varianceReason: typeof it.varianceReason === "string" ? it.varianceReason : "",
              };
            })
            .filter((item): item is LocalCountItem => Boolean(item))
        : [];

      return {
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        status: String(s.status ?? "draft") as CountStatus,
        createdAt: String(s.createdAt ?? new Date().toISOString()),
        completedAt: typeof s.completedAt === "string" ? s.completedAt : null,
        items,
      };
    })
    .filter((session): session is LocalCountSession => Boolean(session));
}

function loadCountSessionsFromStorage(): LocalCountSession[] {
  if (typeof window === "undefined") return [];
  const storeId = getCurrentStoreId();
  if (!storeId) return [];

  try {
    const raw = window.localStorage.getItem(`pos-count-sessions-${storeId}`);
    return normalizeSessions(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function toneClasses(tone: ActionCenterItem["tone"]) {
  if (tone === "critical") {
    return {
      wrapper: "border-rose-200 bg-rose-50/80 text-rose-700 hover:border-rose-300 hover:bg-rose-100/80",
      icon: "bg-rose-100 text-rose-600",
      badge: "bg-rose-100 text-rose-700",
    };
  }
  if (tone === "warning") {
    return {
      wrapper: "border-amber-200 bg-amber-50/80 text-amber-700 hover:border-amber-300 hover:bg-amber-100/80",
      icon: "bg-amber-100 text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  return {
    wrapper: "border-violet-200 bg-violet-50/80 text-violet-700 hover:border-violet-300 hover:bg-violet-100/80",
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-100 text-violet-700",
  };
}

function SectionCard({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-violet-50 px-5 py-4 md:px-6">
        <div>
          <div className="text-lg font-semibold text-slate-800">{title}</div>
        </div>
        {action ? <div className="shrink-0 text-sm font-semibold text-violet-600">{action}</div> : null}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-violet-100" />
        <div className="h-5 w-[32rem] animate-pulse rounded-lg bg-violet-100" />
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-violet-100" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-violet-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="h-80 animate-pulse rounded-2xl bg-violet-100" />
        <div className="h-80 animate-pulse rounded-2xl bg-violet-100" />
      </div>
    </div>
  );
}

function CompactActionCenter({
  items,
  title,
  subtitle,
  openLabel,
  locale,
}: {
  items: ActionCenterItem[];
  title: string;
  subtitle: string;
  openLabel: string;
  locale: Locale;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white px-4 py-4 shadow-sm md:px-5 md:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldAlert className="h-4.5 w-4.5 text-violet-600" />
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {items.map((item) => {
            const tone = toneClasses(item.tone);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-3 py-2 transition ${tone.wrapper}`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone.icon}`}>{item.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone.badge}`}>{formatNumber(item.value, locale)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{item.helper}</div>
                </div>
                <span className="ml-1 text-xs font-semibold text-violet-600">{openLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value, helper, iconTone }: { icon: ReactNode; label: string; value: string; helper: string; iconTone: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>
        <div className="text-right">
          <div className="text-2xl font-black leading-tight tracking-tight text-slate-900 md:text-[1.75rem]">{value}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold text-slate-800 md:text-base">{label}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">{helper}</div>
      </div>
    </div>
  );
}

function AlertsSection({
  alerts,
  locale,
  t,
}: {
  alerts: Array<{ id: string; severity: "critical" | "warning" | "info"; title: string; detail: string; href: string }>;
  locale: Locale;
  t: WarehouseDashboardDictionary["alerts"];
}) {
  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;
  const infoCount = alerts.filter((alert) => alert.severity === "info").length;
  const topAlerts = alerts.slice(0, 3);

  const severityBadge = (severity: "critical" | "warning" | "info") => {
    if (severity === "critical") return "bg-rose-100 text-rose-700";
    if (severity === "warning") return "bg-amber-100 text-amber-700";
    return "bg-violet-100 text-violet-700";
  };

  const severityLabel = (severity: "critical" | "warning" | "info") => {
    if (severity === "critical") return t.critical;
    if (severity === "warning") return t.warning;
    return t.info;
  };

  return (
    <SectionCard
      title={t.title}
      action={<Link href={`/${locale}/inventory`} className="text-sm font-semibold text-violet-600">{t.viewAll}</Link>}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{t.subtitle}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t.critical, value: criticalCount, tone: "bg-rose-50 text-rose-700" },
            { label: t.warning, value: warningCount, tone: "bg-amber-50 text-amber-700" },
            { label: t.info, value: infoCount, tone: "bg-violet-50 text-violet-700" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl px-3 py-2 ${item.tone}`}>
              <div className="text-xs font-semibold uppercase tracking-wide">{item.label}</div>
              <div className="mt-1 text-xl font-black">{formatNumber(item.value, locale)}</div>
            </div>
          ))}
        </div>

        {topAlerts.length ? (
          <div className="space-y-2.5">
            {topAlerts.map((alert) => (
              <Link key={alert.id} href={alert.href} className="block rounded-xl border border-violet-100 px-3 py-3 transition hover:bg-violet-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{alert.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{alert.detail}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${severityBadge(alert.severity)}`}>
                    {severityLabel(alert.severity)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-5 text-sm text-slate-500">
            {t.noAlerts}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function VarianceSection({ rows, locale, t }: { rows: VarianceRow[]; locale: Locale; t: WarehouseDashboardDictionary["variance"] }) {
  return (
    <SectionCard title={t.title} action={<Link href={`/${locale}/inventory/counts`} className="text-sm font-semibold text-violet-600">{t.viewCount}</Link>}>
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-violet-100">
          <table className="min-w-full divide-y divide-violet-100 text-sm">
            <thead className="bg-violet-50/70 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t.headers.product}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.headers.systemQty}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.headers.countQty}</th>
                <th className="px-4 py-3 text-right font-semibold">{t.headers.variance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{row.product}</div>
                    <div className="text-xs text-slate-500">{row.sessionName}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.systemQty, locale)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.countQty, locale)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${row.variance < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {row.variance > 0 ? "+" : ""}
                    {formatNumber(row.variance, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-5 text-sm text-slate-500">
          {t.noData}
        </div>
      )}
    </SectionCard>
  );
}

function StatusDistributionSection({ rows, locale, t }: { rows: StatusRow[]; locale: Locale; t: WarehouseDashboardDictionary["statusDistribution"] }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <SectionCard title={t.title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{t.subtitle}</p>
        <div className="space-y-3">
          {rows.map((row) => {
            const width = `${Math.max((row.value / maxValue) * 100, row.value > 0 ? 12 : 0)}%`;
            return (
              <div key={row.key} className="rounded-xl border border-violet-100 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{row.label}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{row.helper}</div>
                  </div>
                  <div className="text-lg font-black text-slate-900">{formatNumber(row.value, locale)}</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${row.bar}`} style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function RecentActivitySection({ rows, locale, t }: { rows: TimelineRow[]; locale: Locale; t: WarehouseDashboardDictionary["recentActivity"] }) {
  return (
    <SectionCard title={t.title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{t.subtitle}</p>
        {rows.length ? (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div key={row.id} className="relative flex gap-3">
                {index !== rows.length - 1 ? <div className="absolute left-[18px] top-10 h-[calc(100%-12px)] w-px bg-violet-100" /> : null}
                <div className={`relative z-10 mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${row.tone}`}>
                  {row.icon}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-violet-100 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{row.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{row.detail}</div>
                      <div className="mt-1 text-xs text-slate-400">{t.reference}: {row.reference || "-"}</div>
                    </div>
                    <div className="shrink-0 text-xs font-medium text-slate-400">{formatDateTime(row.createdAt, locale)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-5 text-sm text-slate-500">
            {t.noData}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function SummaryFooter({
  items,
  locale,
}: {
  items: Array<{ label: string; value: string | number }>;
  locale: Locale;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white px-4 py-4 shadow-sm md:px-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-violet-50/70 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">{item.label}</div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {typeof item.value === "number" ? formatNumber(item.value, locale) : item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildAlertRows(
  lowStockAlerts: LowStockAlert[],
  pendingCounts: number,
  pendingApprovals: number,
  pendingTransfers: number,
  locale: Locale,
  t: WarehouseDashboardDictionary["alerts"],
) {
  const rows: Array<{ id: string; severity: "critical" | "warning" | "info"; title: string; detail: string; href: string }> = lowStockAlerts.map((alert) => ({
    id: alert.product_id,
    severity: alert.alert_level === "critical" ? "critical" : "warning",
    title: alert.name,
    detail: t.stockLevel
      .replace("{current}", formatNumber(alert.total_stock, locale))
      .replace("{min}", formatNumber(alert.min_stock, locale))
      .replace("{unit}", locale === "th" ? (alert.unit || "") : ""),
    href: `/${locale}/inventory`,
  }));

  if (pendingTransfers > 0) {
    rows.push({
      id: "pending-transfer",
      severity: "info",
      title: t.items.pendingTransfer,
      detail: formatNumber(pendingTransfers, locale),
      href: `/${locale}/warehouse/receive`,
    });
  }

  if (pendingCounts > 0) {
    rows.push({
      id: "pending-count",
      severity: "info",
      title: t.items.pendingCount,
      detail: formatNumber(pendingCounts, locale),
      href: `/${locale}/inventory/counts`,
    });
  }

  if (pendingApprovals > 0) {
    rows.push({
      id: "pending-approval",
      severity: "info",
      title: t.items.pendingApproval,
      detail: formatNumber(pendingApprovals, locale),
      href: `/${locale}/inventory/counts`,
    });
  }

  return rows;
}

function buildTimelineRows(
  activity: RecentActivity[],
  countSessions: LocalCountSession[],
  locale: Locale,
  t: WarehouseDashboardDictionary["recentActivity"],
) {
  const allowed = new Set(["IN", "OUT", "SALE", "TRANSFER", "ADJUST", "RETURN"]);

  const rows: TimelineRow[] = activity
    .filter((item) => allowed.has(item.type))
    .map((item) => {
      const absQty = Math.abs(Number(item.quantity_change ?? 0));
      const qtyText = locale === "th" ? `${formatNumber(absQty, locale)} ${item.unit || ""}`.trim() : formatNumber(absQty, locale);
      let title = t.types.adjustment;
      let detail = t.messages.adjustment.replace("{product}", item.product_name || "-").replace("{qty}", qtyText).replace("{location}", item.location_name || "-");
      let tone = "bg-violet-100 text-violet-600";
      let icon: ReactNode = <Boxes className="h-4 w-4" />;

      switch (item.type) {
        case "IN":
          title = t.types.receive;
          detail = t.messages.receive.replace("{product}", item.product_name || "-").replace("{qty}", qtyText).replace("{location}", locale === "th" ? (item.location_name || "-") : "location");
          tone = "bg-emerald-100 text-emerald-600";
          icon = <ArrowUpFromLine className="h-4 w-4" />;
          break;
        case "OUT":
          title = t.types.issue;
          detail = t.messages.issue.replace("{product}", item.product_name || "-").replace("{qty}", qtyText).replace("{location}", locale === "th" ? (item.location_name || "-") : "location");
          tone = "bg-amber-100 text-amber-600";
          icon = <PackageOpen className="h-4 w-4" />;
          break;
        case "SALE":
          title = t.types.sale;
          detail = t.messages.sale.replace("{product}", item.product_name || "-").replace("{qty}", qtyText);
          tone = "bg-sky-100 text-sky-600";
          icon = <PackageCheck className="h-4 w-4" />;
          break;
        case "TRANSFER":
          title = t.types.transfer;
          detail = t.messages.transfer
            .replace("{product}", item.product_name || "-")
            .replace("{qty}", qtyText)
            .replace("{destination}", locale === "th" ? (item.destination_location_name || item.location_name || "-") : "destination");
          tone = "bg-fuchsia-100 text-fuchsia-600";
          icon = <ArrowLeftRight className="h-4 w-4" />;
          break;
        case "ADJUST":
          title = t.types.adjustment;
          detail = t.messages.adjustment.replace("{product}", item.product_name || "-").replace("{qty}", qtyText).replace("{location}", locale === "th" ? (item.location_name || "-") : "location");
          tone = "bg-violet-100 text-violet-600";
          icon = <Boxes className="h-4 w-4" />;
          break;
        case "RETURN":
          title = t.types.return;
          detail = t.messages.return.replace("{product}", item.product_name || "-").replace("{qty}", qtyText);
          tone = "bg-cyan-100 text-cyan-600";
          icon = <ArrowUpFromLine className="h-4 w-4" />;
          break;
      }

      return {
        id: item.id,
        kind: item.type as TimelineRow["kind"],
        title,
        detail,
        reference: item.reference_id,
        createdAt: item.created_at,
        tone,
        icon,
      };
    });

  const countRows: TimelineRow[] = countSessions.flatMap((session) => {
    const output: TimelineRow[] = [];

    if (session.status === "review") {
      output.push({
        id: `${session.id}-approval`,
        kind: "APPROVAL",
        title: t.types.approval,
        detail: t.messages.approval.replace("{session}", session.name || session.id),
        reference: session.id,
        createdAt: session.createdAt,
        tone: "bg-amber-100 text-amber-600",
        icon: <ClipboardCheck className="h-4 w-4" />,
      });
    }

    if (session.status === "counting" || session.status === "completed") {
      output.push({
        id: `${session.id}-count`,
        kind: "COUNT",
        title: t.types.count,
        detail: t.messages.count.replace("{session}", session.name || session.id),
        reference: session.id,
        createdAt: session.completedAt || session.createdAt,
        tone: "bg-violet-100 text-violet-600",
        icon: <ClipboardCheck className="h-4 w-4" />,
      });
    }

    return output;
  });

  return [...rows, ...countRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
}

export function WarehouseDashboard({ dictionary, locale }: WarehouseDashboardProps) {
  const t = dictionary;
  const [period, setPeriod] = useState<WarehousePeriod>("7d");
  const [countSessions] = useState<LocalCountSession[]>(loadCountSessionsFromStorage);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["warehouse-dashboard", period],
    queryFn: async () => {
      const response = await getWarehouseDashboard(period);
      return response.data as WarehouseDashboardData;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const derived = useMemo(() => {
    const pendingCountSessions = countSessions.filter((session) => session.status === "draft" || session.status === "counting" || session.status === "review");
    const pendingApprovalSessions = countSessions.filter((session) => session.status === "review");
    const countingItems = countSessions
      .filter((session) => session.status === "counting")
      .reduce((sum, session) => sum + session.items.length, 0);
    const damagedQty = countSessions.reduce((sum, session) => {
      return (
        sum +
        session.items.reduce((itemSum, item) => {
          if ((item.varianceReason || "").toLowerCase().includes("damage")) {
            return itemSum + Math.abs(variance(item));
          }
          return itemSum;
        }, 0)
      );
    }, 0);

    const varianceRows = countSessions
      .flatMap((session) =>
        session.items
          .filter((item) => !item.skipped && item.counted != null && item.counted !== item.systemQty)
          .map((item) => ({
            key: `${session.id}-${item.productId}`,
            product: item.name || item.productId,
            systemQty: item.systemQty,
            countQty: item.counted ?? 0,
            variance: variance(item),
            sessionName: session.name || session.id,
            absVariance: Math.abs(variance(item)),
          })),
      )
      .sort((a, b) => b.absVariance - a.absVariance)
      .slice(0, 5);

    return {
      pendingCountSessions: pendingCountSessions.length,
      pendingApprovalSessions: pendingApprovalSessions.length,
      countingItems,
      damagedQty,
      varianceRows,
    };
  }, [countSessions]);

  const reservedStock = 0;
  const availableStock = Number(data?.kpi.available_stock_qty ?? 0);
  const inventoryValue = Number(data?.kpi.stock_value ?? 0);
  const outOfStockCount = Number(data?.kpi.out_of_stock_count ?? 0);
  const lowStockCount = Number(data?.kpi.low_stock_count ?? 0);
  const inTransitStock = Number(data?.kpi.in_transit_stock_qty ?? 0);
  const pendingTransfers = Number(data?.kpi.pending_transfer_requests ?? 0);
  const movementIsEmpty = !data?.movement_chart?.some((point) => (point.issue_value ?? 0) || (point.receive_value ?? 0) || (point.transfer_value ?? 0) || (point.total_value ?? 0));

  const actionItems: ActionCenterItem[] = [
    {
      key: "low-stock",
      label: t.actionCenter.items.lowStock,
      value: Math.max(lowStockCount - outOfStockCount, 0),
      helper: t.actionCenter.helpers.lowStock,
      href: `/${locale}/inventory?stock_status=low_stock`,
      tone: lowStockCount > outOfStockCount ? "warning" : "info",
      icon: <PackageSearch className="h-4 w-4" />,
    },
    {
      key: "out-of-stock",
      label: t.actionCenter.items.outOfStock,
      value: outOfStockCount,
      helper: t.actionCenter.helpers.outOfStock,
      href: `/${locale}/inventory?stock_status=out_of_stock`,
      tone: outOfStockCount > 0 ? "critical" : "info",
      icon: <PackageX className="h-4 w-4" />,
    },
    {
      key: "pending-transfer",
      label: t.actionCenter.items.pendingTransfer,
      value: pendingTransfers,
      helper: t.actionCenter.helpers.pendingTransfer,
      href: `/${locale}/warehouse/receive`,
      tone: pendingTransfers > 0 ? "info" : "info",
      icon: <ArrowLeftRight className="h-4 w-4" />,
    },
    {
      key: "pending-count",
      label: t.actionCenter.items.pendingCount,
      value: derived.pendingCountSessions,
      helper: t.actionCenter.helpers.pendingCount,
      href: `/${locale}/inventory/counts`,
      tone: derived.pendingCountSessions > 0 ? "warning" : "info",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      key: "pending-approval",
      label: t.actionCenter.items.pendingApproval,
      value: derived.pendingApprovalSessions,
      helper: t.actionCenter.helpers.pendingApproval,
      href: `/${locale}/inventory/counts`,
      tone: derived.pendingApprovalSessions > 0 ? "critical" : "info",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

  const movementData = useMemo(
    () =>
      (data?.movement_chart ?? []).map((point) => ({
        dateLabel: formatShortDate(point.date, locale),
        receiveValue: point.receive_value,
        issueValue: point.issue_value,
        transferValue: point.transfer_value,
        totalValue: point.total_value,
      })),
    [data?.movement_chart, locale],
  );

  const alertRows = useMemo(
    () => buildAlertRows(data?.low_stock_alerts ?? [], derived.pendingCountSessions, derived.pendingApprovalSessions, pendingTransfers, locale, t.alerts),
    [data?.low_stock_alerts, derived.pendingApprovalSessions, derived.pendingCountSessions, locale, pendingTransfers, t.alerts],
  );

  const statusRows: StatusRow[] = [
    {
      key: "available",
      label: t.statusDistribution.labels.available,
      value: availableStock,
      helper: t.statusDistribution.helpers.available,
      tone: "text-emerald-700",
      bar: "bg-emerald-500",
    },
    {
      key: "reserved",
      label: t.statusDistribution.labels.reserved,
      value: reservedStock,
      helper: t.statusDistribution.helpers.reserved,
      tone: "text-amber-700",
      bar: "bg-amber-500",
    },
    {
      key: "damaged",
      label: t.statusDistribution.labels.damaged,
      value: derived.damagedQty,
      helper: t.statusDistribution.helpers.damaged,
      tone: "text-rose-700",
      bar: "bg-rose-500",
    },
    {
      key: "in-transit",
      label: t.statusDistribution.labels.inTransit,
      value: inTransitStock,
      helper: t.statusDistribution.helpers.inTransit,
      tone: "text-sky-700",
      bar: "bg-sky-500",
    },
    {
      key: "counting",
      label: t.statusDistribution.labels.counting,
      value: derived.countingItems,
      helper: t.statusDistribution.helpers.counting,
      tone: "text-violet-700",
      bar: "bg-violet-500",
    },
  ];

  const timelineRows = useMemo(
    () => buildTimelineRows(data?.recent_activity ?? [], countSessions, locale, t.recentActivity),
    [countSessions, data?.recent_activity, locale, t.recentActivity],
  );

  const summaryItems = [
    { label: t.summary.inventoryValue, value: formatCurrency(inventoryValue, locale) },
    { label: t.summary.availableStock, value: availableStock },
    { label: t.summary.reservedStock, value: reservedStock },
    { label: t.summary.damagedStock, value: derived.damagedQty },
    { label: t.summary.inTransitStock, value: inTransitStock },
    { label: t.summary.activeAlerts, value: actionItems.reduce((sum, item) => sum + item.value, 0) },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <TriangleAlert className="h-5 w-5" />
          <span>{t.title}</span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
        >
          <RefreshCw className="h-4 w-4" />
          {t.refresh}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{t.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500 md:text-base">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t.refresh}
        </button>
      </div>

      <CompactActionCenter
        items={actionItems}
        title={t.actionCenter.title}
        subtitle={t.actionCenter.subtitle}
        openLabel={t.actionCenter.open}
        locale={locale}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          icon={<DollarSign className="h-5 w-5 text-violet-600" />}
          iconTone="bg-violet-100"
          label={t.kpi.inventoryValue}
          value={formatCurrency(inventoryValue, locale)}
          helper={t.kpi.helpers.inventoryValue}
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5 text-emerald-600" />}
          iconTone="bg-emerald-100"
          label={t.kpi.availableStock}
          value={formatNumber(availableStock, locale)}
          helper={t.kpi.helpers.availableStock}
        />
        <KpiCard
          icon={<Clock3 className="h-5 w-5 text-amber-600" />}
          iconTone="bg-amber-100"
          label={t.kpi.reservedStock}
          value={formatNumber(reservedStock, locale)}
          helper={t.kpi.helpers.reservedStock}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          iconTone="bg-rose-100"
          label={t.kpi.damagedStock}
          value={formatNumber(derived.damagedQty, locale)}
          helper={t.kpi.helpers.damagedStock}
        />
        <KpiCard
          icon={<ArrowLeftRight className="h-5 w-5 text-sky-600" />}
          iconTone="bg-sky-100"
          label={t.kpi.inTransitStock}
          value={formatNumber(inTransitStock, locale)}
          helper={t.kpi.helpers.inTransitStock}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <SectionCard
          title={t.movement.title}
          action={
            <div className="flex items-center gap-2">
              {[
                { value: "7d" as WarehousePeriod, label: t.movement.periods.sevenDays },
                { value: "30d" as WarehousePeriod, label: t.movement.periods.thirtyDays },
                { value: "3m" as WarehousePeriod, label: t.movement.periods.threeMonths },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`min-h-10 rounded-xl px-3 py-2 text-xs font-semibold transition md:text-sm ${
                    period === option.value ? "bg-violet-600 text-white shadow-sm" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-[260px] md:h-[280px]">
            {movementIsEmpty ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 text-center text-sm text-slate-500">
                {t.movement.empty}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={movementData} margin={{ top: 12, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value ?? 0), locale), String(name ?? "")]}
                    labelStyle={{ color: "#334155", fontWeight: 600 }}
                    contentStyle={{ borderRadius: 16, borderColor: "#ddd6fe" }}
                  />
                  <Legend />
                  <Bar dataKey="receiveValue" name={t.movement.legends.receive} fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="issueValue" name={t.movement.legends.issue} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="transferValue" name={t.movement.legends.transfer} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="totalValue" name={t.movement.legends.total} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <AlertsSection alerts={alertRows} locale={locale} t={t.alerts} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <VarianceSection rows={derived.varianceRows} locale={locale} t={t.variance} />
        </div>
        <div className="xl:col-span-3">
          <StatusDistributionSection rows={statusRows} locale={locale} t={t.statusDistribution} />
        </div>
        <div className="xl:col-span-4">
          <RecentActivitySection rows={timelineRows} locale={locale} t={t.recentActivity} />
        </div>
      </div>

      <SummaryFooter items={summaryItems} locale={locale} />
    </div>
  );
}
