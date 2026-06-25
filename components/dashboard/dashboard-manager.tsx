"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ClipboardCheck,
  Minus,
  Package,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Skeleton, SkeletonStatRow, SkeletonChart } from "@/components/ui/skeleton";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDashboard } from "@/services/dashboard";
import { getExpenseSummary } from "@/services/expenses";
import { useStoreRole } from "@/lib/use-store-role";
import { useCopilot } from "@/components/copilot/copilot-provider";
import { DashboardHero, type HeroPeriod } from "@/components/shared/dashboard-hero";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import type {
  DashboardPeriod,
  DashboardQueryInput,
  DashboardRecentSale,
  StoreDashboard,
} from "@/types/dashboard";
import type { ExpenseSummary } from "@/types/expense";

// ── Dictionary type ─────────────────────────────────────────────────────────

type DashboardDictionary = {
  actions: {
    newSaleDescription: string;
    newSaleTitle: string;
    stockDescription: string;
    stockTitle: string;
  };
  actionCenter: {
    title: string;
    lowStock: string;
    outOfStock: string;
    negativeStock: string;
    pendingCounts: string;
    pendingApprovals: string;
    critical: string;
    warning: string;
    info: string;
    viewItems: string;
    noIssues: string;
  };
  cards: {
    lowStockHint: string;
    lowStockLabel: string;
    ordersHint: string;
    ordersLabel: string;
    salesTodayHint: string;
    salesTodayLabel: string;
  };
  empty: string;
  emptyStates: {
    noSales: string;
    noSalesAction: string;
    noProducts: string;
    noStock: string;
    noStockAction: string;
    noActivity: string;
    noPayments: string;
  };
  filters: {
    apply: string;
    fromLabel: string;
    lowStockLimitLabel: string;
    lowStockThresholdLabel: string;
    period7d: string;
    period30d: string;
    periodCustom: string;
    periodLabel: string;
    periodToday: string;
    recentLimitLabel: string;
    refresh: string;
    toLabel: string;
    topLimitLabel: string;
  };
  hero: {
    storeOpen: string;
    storeClosed: string;
    totalSales: string;
    totalOrders: string;
    totalProfit: string;
    storeStatus: string;
    showingData: string;
  };
  inventoryAlerts: {
    title: string;
    lowStock: string;
    outOfStock: string;
    negativeStock: string;
    pendingCounts: string;
    viewAll: string;
    noAlerts: string;
  };
  kpi: {
    totalSales: string;
    totalOrders: string;
    totalProfit: string;
    averageBill: string;
    lowStockItems: string;
    outOfStockItems: string;
    customersServed: string;
    topProduct: string;
    vsPrevious: string;
    noChange: string;
    itemsUnit: string;
    noSalesYet: string;
  };
  loading: string;
  paymentMethods: {
    cash: string;
    transfer: string;
    qr: string;
    credit: string;
    card: string;
  };
  period90d: string;
  quickActions: {
    openPos: string;
    openPosDesc: string;
    receiveStock: string;
    receiveStockDesc: string;
    stockCount: string;
    stockCountDesc: string;
    createQuotation: string;
    createQuotationDesc: string;
    customers: string;
    customersDesc: string;
    promotions: string;
    promotionsDesc: string;
  };
  quickActionsTitle: string;
  recentOrders: {
    title: string;
    invoice: string;
    customer: string;
    total: string;
    payment: string;
    time: string;
    walkIn: string;
    viewAll: string;
    noOrders: string;
    openPos: string;
  };
  bestSellers: {
    title: string;
    qtySold: string;
    noBestSellers: string;
    openPos: string;
  };
  stockAttention: {
    title: string;
    outOfStockSection: string;
    lowStockSection: string;
    remaining: string;
    reorderPoint: string;
    warehouse: string;
    outOfStockBadge: string;
    lowBadge: string;
    viewAll: string;
    noIssues: string;
    stockError: string;
    stockRetry: string;
  };
  recentSales: {
    title: string;
  };
  expenseCategories: {
    title: string;
    subtitle: string;
    empty: string;
  };
  requestFailedLabel: string;
  roleLabel: {
    owner: string;
    cashier: string;
    warehouse: string;
  };
  salesTrend: {
    title: string;
    revenue: string;
    profit: string;
    orders: string;
  };
  sections: {
    highStockProducts: string;
    lowStockProducts: string;
    paymentBreakdown: string;
    range: string;
    recentSales: string;
    topProducts: string;
  };
  subtitle: string;
  summary: {
    averageTicket: string;
    discountAmount: string;
    revenue: string;
    salesCount: string;
    totalItems: string;
    vatAmount: string;
  };
  table: {
    amount: string;
    cashier: string;
    customer: string;
    paymentMethod: string;
    price: string;
    productName: string;
    quantity: string;
    saleNumber: string;
    soldAt: string;
    sku: string;
    stock: string;
  };
  title: string;
  topProductsTable: {
    title: string;
    rank: string;
    product: string;
    qtySold: string;
    revenue: string;
    viewAll: string;
  };
  validation: {
    customRangeRequired: string;
  };
};

type DashboardManagerProps = {
  dictionary: DashboardDictionary;
  locale: string;
};

type FilterPeriod = HeroPeriod;
type UserRole = "owner" | "cashier" | "warehouse";
type ChartMetric = "revenue" | "profit" | "orders";

// ── Helpers ─────────────────────────────────────────────────────────────────

function toLocaleTag(locale: string) {
  return locale === "th" ? "th-TH" : "en-US";
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    currency: "THB",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function compactCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    currency: "THB",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function trendPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

// Store timezone offset (Asia/Bangkok = UTC+7, no DST). Buckets a sale instant into
// the same Bangkok calendar day the backend uses (`AT TIME ZONE 'Asia/Bangkok'`), so
// near-midnight sales land on the same business day across Dashboard, P&L and Summary.
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkokDay(iso: string): string {
  const bkk = new Date(new Date(iso).getTime() + BKK_OFFSET_MS);
  const y = bkk.getUTCFullYear();
  const m = String(bkk.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bkk.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateRange(locale: string, period: FilterPeriod, fromDate?: string, toDate?: string): string {
  const tag = toLocaleTag(locale);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toLocaleDateString(tag, { day: "numeric", month: "short", year: "numeric" });

  switch (period) {
    case "today":
      return fmt(today);
    case "7d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return `${fmt(start)} – ${fmt(today)}`;
    }
    case "30d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return `${fmt(start)} – ${fmt(today)}`;
    }
    case "90d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return `${fmt(start)} – ${fmt(today)}`;
    }
    case "custom": {
      if (fromDate && toDate) {
        return `${fmt(new Date(fromDate))} – ${fmt(new Date(toDate))}`;
      }
      return "";
    }
    default:
      return "";
  }
}

function getPreviousPeriodDates(period: FilterPeriod): { from: string; to: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today": {
      const prev = new Date(today);
      prev.setDate(prev.getDate() - 1);
      return { from: prev.toISOString().slice(0, 10), to: prev.toISOString().slice(0, 10) };
    }
    case "7d": {
      const end = new Date(today);
      end.setDate(end.getDate() - 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "30d": {
      const end = new Date(today);
      end.setDate(end.getDate() - 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "90d": {
      const end = new Date(today);
      end.setDate(end.getDate() - 90);
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    default:
      return null;
  }
}


const PAYMENT_BADGE: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-violet-100 text-violet-700",
  credit: "bg-violet-100 text-violet-700",
  transfer: "bg-amber-100 text-amber-700",
  qr: "bg-fuchsia-100 text-fuchsia-700",
  promptpay: "bg-fuchsia-100 text-fuchsia-700",
};

function paymentBadgeClass(method: string) {
  return PAYMENT_BADGE[method.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

/** Translate raw payment_method keys from API → localized label */
function localizePaymentMethod(raw: string, dict: DashboardDictionary["paymentMethods"]): string {
  const key = raw.toLowerCase().trim();
  const map: Record<string, string> = {
    cash: dict.cash,
    transfer: dict.transfer,
    qr: dict.qr,
    "qr payment": dict.qr,
    promptpay: dict.qr,
    credit: dict.credit,
    card: dict.card,
  };
  return map[key] ?? raw;
}

// ── Severity config for Action Center ───────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  warning: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  info: { dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
} as const;

// ── Visible sections per role ───────────────────────────────────────────────

function DashboardBriefingCard() {
  const { data, isLoading, openPanel } = useCopilot();
  if (isLoading || !data) return null;
  const { summary: s, decisionEngine: de } = data;
  if (!de?.topPriority && s.revenue === 0) return null;

  const statusLabel = data.healthScore.overall >= 80
    ? "ร้านอยู่ในสถานะดี"
    : data.healthScore.overall >= 60
      ? "มีบางอย่างต้องดูแล"
      : "ต้องดูแลหลายจุด";

  const topRisk = data.risks[0];
  const topAction = de?.topPriority;

  return (
    <button
      onClick={openPanel}
      className="group w-full rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-left shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          <span className="text-[12px] font-semibold text-violet-700">สรุปวันนี้</span>
        </div>
        <span className="text-[11px] text-violet-500 group-hover:text-violet-600">ดูเพิ่มเติม →</span>
      </div>
      <p className="mb-2 text-[13px] font-medium text-slate-700">{statusLabel}</p>
      <div className="space-y-1.5">
        {topRisk && (
          <div className="flex items-center gap-2 text-[12px]">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
            <span className="truncate text-slate-600">{topRisk.title}</span>
          </div>
        )}
        {topAction && (
          <div className="flex items-center gap-2 text-[12px]">
            <ArrowRight className="h-3 w-3 shrink-0 text-violet-500" />
            <span className="truncate text-slate-600">ทำก่อน: {topAction.action.title}</span>
          </div>
        )}
      </div>
    </button>
  );
}

const ROLE_SECTIONS: Record<UserRole, Set<string>> = {
  owner: new Set(["hero", "quickActions", "kpi", "actionCenter", "salesChart", "paymentChart", "expenseCategories", "bestSellers", "stockAttention", "recentSales"]),
  cashier: new Set(["hero", "quickActions", "kpi", "salesChart", "paymentChart", "recentSales"]),
  warehouse: new Set(["hero", "quickActions", "kpi", "actionCenter", "bestSellers", "stockAttention"]),
};

// ── Component ───────────────────────────────────────────────────────────────

export function DashboardManager({ dictionary, locale }: DashboardManagerProps) {
  const t = dictionary;

  const [period, setPeriod] = useState<FilterPeriod>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("revenue");
  // Dashboard view is driven by the STORE-scoped role (store_members.role), not
  // the global users.role. Owner/manager get the full view; warehouse and cashier
  // get their reduced section sets. Unknown role defaults to least-privilege.
  const { role: storeRole } = useStoreRole();
  const role: UserRole =
    storeRole === "owner" || storeRole === "manager"
      ? "owner"
      : storeRole === "warehouse"
        ? "warehouse"
        : "cashier";

  const [data, setData] = useState<StoreDashboard | null>(null);
  const [prevData, setPrevData] = useState<StoreDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);

  const visible = ROLE_SECTIONS[role];

  // ── Data fetching ───────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const input: DashboardQueryInput = {
        low_stock_limit: 20,
        low_stock_threshold: 10,
        recent_limit: 10,
        top_limit: 10,
      };

      if (period === "custom") {
        if (!fromDate || !toDate) {
          setError(t.validation.customRangeRequired);
          setIsLoading(false);
          return;
        }
        input.from = fromDate;
        input.to = toDate;
      } else if (period === "90d") {
        const now = new Date();
        const from90 = new Date(now);
        from90.setDate(from90.getDate() - 90);
        input.from = from90.toISOString().slice(0, 10);
        input.to = now.toISOString().slice(0, 10);
      } else {
        input.period = period;
      }

      const response = await getDashboard(input);

      setData(response.data);

      // Fetch previous period for trends
      const prevDates = getPreviousPeriodDates(period);
      if (prevDates) {
        try {
          const prevResponse = await getDashboard({
            ...input,
            period: undefined,
            from: prevDates.from,
            to: prevDates.to,
          });
          setPrevData(prevResponse.data);
        } catch {
          setPrevData(null);
        }
      } else {
        setPrevData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.requestFailedLabel);
    } finally {
      setIsLoading(false);
    }
  }, [t.requestFailedLabel, t.validation.customRangeRequired, fromDate, period, toDate]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  // Top expense categories (current month) — owner-only widget.
  useEffect(() => {
    if (!visible.has("expenseCategories")) return;
    let active = true;
    (async () => {
      try {
        const res = await getExpenseSummary();
        if (active) setExpenseSummary(res.data);
      } catch {
        if (active) setExpenseSummary(null);
      }
    })();
    return () => { active = false; };
  }, [visible]);

  // ── Computed values ─────────────────────────────────────────────────────

  const dateRangeText = formatDateRange(locale, period, fromDate, toDate);

  const expenseCategoryRows = useMemo<CategoryValueRow[]>(() => {
    if (!expenseSummary) return [];
    const denom = expenseSummary.monthly_total || 1;
    return expenseSummary.by_category.slice(0, 5).map((c) => ({ name: c.name || "—", value: c.total, percent: (c.total / denom) * 100 }));
  }, [expenseSummary]);

  const chartData = useMemo(() => {
    const sales = data?.recent_sales ?? [];
    if (sales.length === 0) return [];

    // Net profit ratio from summary (revenue − discount) / revenue
    const totalRevenue = data?.summary.revenue ?? 0;
    const totalDiscount = data?.summary.discount_amount ?? 0;
    const profitRatio = totalRevenue > 0 ? (totalRevenue - totalDiscount) / totalRevenue : 1;

    // Aggregate by date — sum revenue & count orders per day
    const byDate = new Map<string, { revenue: number; orders: number; date: Date }>();

    for (const sale of sales) {
      const key = toBangkokDay(sale.sold_at);
      const date = new Date(`${key}T00:00:00+07:00`);
      const existing = byDate.get(key);
      const amount = sale.total_amount ?? 0;
      if (existing) {
        existing.revenue += amount;
        existing.orders += 1;
      } else {
        byDate.set(key, { revenue: amount, orders: 1, date });
      }
    }

    return [...byDate.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-20)
      .map((entry) => ({
        name: entry.date.toLocaleDateString(toLocaleTag(locale), { day: "numeric", month: "short" }),
        revenue: entry.revenue,
        profit: entry.revenue * profitRatio,
        orders: entry.orders,
      }));
  }, [data?.recent_sales, data?.summary.revenue, data?.summary.discount_amount, locale]);

  const paymentBreakdown = useMemo(() => {
    const total = (data?.payment_breakdown ?? []).reduce((s, i) => s + i.amount, 0);
    return (data?.payment_breakdown ?? []).map((item) => ({
      ...item,
      localizedName: localizePaymentMethod(item.payment_method, t.paymentMethods),
      ratio: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [data?.payment_breakdown, t.paymentMethods]);

  const topProducts = data?.top_products ?? [];
  const lowStockList = (data?.low_stock_products ?? []).filter((p) => (p.total_stock ?? p.quantity) > 0);
  // out-of-stock = ready_stock <= 0 (includes negative — spec §A5)
  const outOfStockList = (data?.low_stock_products ?? []).filter((p) => (p.total_stock ?? p.quantity) <= 0);

  const revenue = data?.summary.revenue ?? 0;
  const salesCount = data?.summary.sales_count ?? 0;
  const netRevenue = revenue - (data?.summary.discount_amount ?? 0);
  const averageBill = data?.summary.average_ticket ?? 0;

  const prevRevenue = prevData?.summary.revenue ?? 0;
  const prevSalesCount = prevData?.summary.sales_count ?? 0;
  const prevNetRevenue = prevRevenue - (prevData?.summary.discount_amount ?? 0);
  const prevAverageBill = prevData?.summary.average_ticket ?? 0;

  const topProductName = topProducts.length > 0 ? topProducts[0].product_name : t.kpi.noSalesYet;

  // Best sellers — max qty for progress bar scaling
  const maxQtySold = topProducts.length > 0 ? topProducts[0].quantity_sold : 1;

  // Low stock threshold used in query
  const LOW_STOCK_THRESHOLD = 10;

  // Total action center alert count (negatives subsumed into outOfStockList via <= 0 filter)
  const totalAlerts = lowStockList.length + outOfStockList.length;
  // true when the API failed AND we have no data at all — prevents valid-zero false reads (A10)
  const stockError = !!error && !data;

  // ── Render helpers ──────────────────────────────────────────────────────

  function TrendBadge({ current, previous }: { current: number; previous: number }) {
    const pct = trendPercent(current, previous);
    if (pct === null || !prevData) return <span className="text-[10px] text-slate-400">{t.kpi.noChange}</span>;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
    const color = isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-slate-500";
    const bg = isUp ? "bg-emerald-50" : isDown ? "bg-rose-50" : "bg-slate-50";
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${color} ${bg}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(pct).toFixed(1)}%
      </span>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO — unified dashboard control center                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("hero") && (
        <DashboardHero
          icon={Store}
          title={t.title}
          subtitle={t.subtitle}
          rangeLabel={dateRangeText}
          period={period}
          onPeriodChange={(p) => setPeriod(p)}
          periodLabels={{
            today: t.filters.periodToday,
            d7: t.filters.period7d,
            d30: t.filters.period30d,
            d90: t.period90d,
            custom: t.filters.periodCustom,
            from: t.filters.fromLabel,
            to: t.filters.toLabel,
            apply: t.filters.apply,
            refresh: t.filters.refresh,
          }}
          customFrom={fromDate}
          customTo={toDate}
          onCustomFromChange={setFromDate}
          onCustomToChange={setToDate}
          onApplyCustom={() => void loadDashboard()}
          customValid={!!(fromDate && toDate && fromDate <= toDate)}
          isLoading={isLoading}
          onRefresh={() => void loadDashboard()}
          filterContent={
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <label className="flex flex-col gap-1 text-[11px] text-white/90">
                <span>{t.filters.periodLabel}</span>
                <select className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none" onChange={(e) => setPeriod(e.target.value as FilterPeriod)} value={period}>
                  <option className="text-slate-900" value="today">{t.filters.periodToday}</option>
                  <option className="text-slate-900" value="7d">{t.filters.period7d}</option>
                  <option className="text-slate-900" value="30d">{t.filters.period30d}</option>
                  <option className="text-slate-900" value="90d">{t.period90d}</option>
                  <option className="text-slate-900" value="custom">{t.filters.periodCustom}</option>
                </select>
              </label>
              {period === "custom" && (
                <>
                  <label className="flex flex-col gap-1 text-[11px] text-white/90">
                    <span>{t.filters.fromLabel}</span>
                    <input className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none" onChange={(e) => setFromDate(e.target.value)} type="date" value={fromDate} />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-white/90">
                    <span>{t.filters.toLabel}</span>
                    <input className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none" onChange={(e) => setToDate(e.target.value)} type="date" value={toDate} />
                  </label>
                </>
              )}
              <button className="self-end rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50" onClick={() => void loadDashboard()} type="button">{t.filters.apply}</button>
            </div>
          }
        />
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1b. AI BRIEFING CARD                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardBriefingCard />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. QUICK ACTIONS — 6 cards                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("quickActions") && (
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {([
            { href: `/${locale}/sales`, icon: ShoppingCart, label: t.quickActions.openPos, desc: t.quickActions.openPosDesc, iconBg: "bg-violet-600", hoverColor: "group-hover:text-violet-500" },
            { href: `/${locale}/purchases?tab=goods-receipts`, icon: Package, label: t.quickActions.receiveStock, desc: t.quickActions.receiveStockDesc, iconBg: "bg-emerald-500", hoverColor: "group-hover:text-emerald-500" },
            { href: `/${locale}/inventory/counts`, icon: ClipboardCheck, label: t.quickActions.stockCount, desc: t.quickActions.stockCountDesc, iconBg: "bg-amber-500", hoverColor: "group-hover:text-amber-500" },
            { href: `/${locale}/customers`, icon: Users, label: t.quickActions.customers, desc: t.quickActions.customersDesc, iconBg: "bg-fuchsia-500", hoverColor: "group-hover:text-fuchsia-500" },
          ]).map((action) => (
            <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.iconBg} shadow-sm`}>
                <action.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{action.label}</p>
                <p className="hidden truncate text-[11px] text-slate-500 xl:block">{action.desc}</p>
              </div>
              <ArrowRight className={`hidden h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 lg:block ${action.hoverColor}`} />
            </Link>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. KPI CARDS — dynamic labels + date range underneath             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("kpi") && (
        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {([
            { label: t.kpi.totalSales, value: formatCurrency(revenue, locale), icon: TrendingUp, iconBg: "bg-violet-100", iconColor: "text-violet-600", current: revenue, previous: prevRevenue, span: "xl:col-span-2" },
            { label: t.kpi.totalOrders, value: salesCount.toLocaleString(toLocaleTag(locale)), icon: ShoppingCart, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", current: salesCount, previous: prevSalesCount, span: "" },
            { label: t.kpi.totalProfit, value: formatCurrency(netRevenue, locale), icon: Wallet, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", current: netRevenue, previous: prevNetRevenue, span: "" },
            { label: t.kpi.averageBill, value: formatCurrency(averageBill, locale), icon: BarChart3, iconBg: "bg-amber-100", iconColor: "text-amber-600", current: averageBill, previous: prevAverageBill, span: "" },
            { label: t.kpi.lowStockItems, value: stockError ? "—" : `${lowStockList.length} ${t.kpi.itemsUnit}`, icon: AlertTriangle, iconBg: "bg-orange-100", iconColor: "text-orange-600", current: lowStockList.length, previous: 0, span: "" },
            { label: t.kpi.outOfStockItems, value: stockError ? "—" : `${outOfStockList.length} ${t.kpi.itemsUnit}`, icon: Package, iconBg: "bg-rose-100", iconColor: "text-rose-600", current: outOfStockList.length, previous: 0, span: "" },
            { label: t.kpi.topProduct, value: topProductName, icon: TrendingUp, iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600", current: 0, previous: 0, span: "" },
          ]).map(({ label, value, icon: Icon, iconBg, iconColor, current, previous, span }) => (
            <ReportKpiCard
              key={label}
              label={label}
              value={value}
              icon={<Icon className="h-5 w-5" />}
              iconBg={iconBg}
              iconColor={iconColor}
              className={span}
              loading={isLoading}
              footer={
                <div className="flex items-center gap-2">
                  <TrendBadge current={current} previous={previous} />
                  <span className="hidden text-[9px] text-slate-400 xl:inline">{t.kpi.vsPrevious}</span>
                </div>
              }
            />
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. ACTION CENTER — ⚠ Requires Attention (HIGH PRIORITY)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("actionCenter") && (
        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">{t.actionCenter.title}</h2>
            {totalAlerts > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{totalAlerts}</span>
            )}
          </div>
          {isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl bg-slate-50" />)}
            </div>
          ) : totalAlerts === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t.actionCenter.noIssues}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {([
                { label: t.actionCenter.outOfStock, count: outOfStockList.length, severity: "critical" as const, href: `/${locale}/inventory` },
                { label: t.actionCenter.lowStock, count: lowStockList.length, severity: "warning" as const, href: `/${locale}/inventory` },
                { label: t.actionCenter.pendingCounts, count: 0, severity: "info" as const, href: `/${locale}/inventory/counts` },
              ]).filter((a) => a.count > 0).map((alert) => {
                const sv = SEVERITY_CONFIG[alert.severity];
                return (
                  <Link
                    key={alert.label}
                    href={alert.href}
                    className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition hover:shadow-md ${sv.bg} ${sv.border}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${sv.dot}`} />
                      <div>
                        <p className={`text-xs font-bold ${sv.text}`}>{alert.label}</p>
                        <p className="text-[10px] text-slate-500">{t.actionCenter.viewItems}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`nums text-2xl font-black ${sv.text}`}>{alert.count}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. SALES TREND + PAYMENT BREAKDOWN                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="grid gap-3 xl:grid-cols-[7fr_3fr]">
        {/* Sales trend area chart with metric switching */}
        {visible.has("salesChart") && (
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t.salesTrend.title}</h2>
                <p className="text-[10px] text-slate-400">{dateRangeText}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                {([
                  { label: t.salesTrend.revenue, value: "revenue" as const },
                  { label: t.salesTrend.profit, value: "profit" as const },
                  { label: t.salesTrend.orders, value: "orders" as const },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${chartMetric === opt.value ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    onClick={() => setChartMetric(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px]">
              {isLoading ? (
                <SkeletonChart height="h-full" className="rounded-xl" />
              ) : chartData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <p className="text-sm text-slate-400">{t.emptyStates.noSales}</p>
                  <Link href={`/${locale}/sales`} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700">
                    {t.emptyStates.noSalesAction}
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={chartData} margin={{ bottom: 4, left: 0, right: 4, top: 4 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis axisLine={false} dataKey="name" fontSize={9} tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      fontSize={9}
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      tickFormatter={chartMetric === "orders" ? (v: number) => String(v) : (v: number) => compactCurrency(v, locale)}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const val = d[chartMetric];
                      return (
                        <div className="rounded-xl bg-slate-900 px-3 py-2 text-white shadow-lg">
                          <p className="text-[10px] text-slate-400">{d.name}</p>
                          <p className="text-sm font-bold">{chartMetric === "orders" ? val : formatCurrency(val, locale)}</p>
                        </div>
                      );
                    }} cursor={false} />
                    <Area activeDot={{ fill: "#7c3aed", r: 5, stroke: "#fff", strokeWidth: 2 }} dataKey={chartMetric} fill="url(#chartGradient)" stroke="#7c3aed" strokeWidth={2.5} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        )}

        {/* Payment breakdown — matches finance summary report format */}
        {visible.has("paymentChart") && (
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">{t.sections.paymentBreakdown}</h2>
              <p className="text-[10px] text-slate-400">{dateRangeText}</p>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[70, 45, 30].map((w, i) => (
                <div key={i} className="flex items-center gap-3"><Skeleton className="h-3 w-3 rounded-full bg-violet-100" /><Skeleton className="h-3.5 bg-slate-200" style={{ width: `${w}%` }} /></div>
              ))}</div>
            ) : (
              <CategoryValueBars
                rows={paymentBreakdown.map((item) => ({
                  name: item.localizedName,
                  value: item.amount,
                  percent: item.ratio,
                }))}
                currency={(n) => formatCurrency(n, locale)}
                emptyLabel={t.emptyStates.noPayments}
              />
            )}
          </article>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP EXPENSE CATEGORIES (this month) — owner only                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("expenseCategories") && (
        <section className="mb-4">
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Wallet className="h-4 w-4" /></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t.expenseCategories.title}</h2>
                <p className="text-[10px] text-slate-400">{t.expenseCategories.subtitle}</p>
              </div>
            </div>
            {isLoading && !expenseSummary ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
            ) : (
              <CategoryValueBars rows={expenseCategoryRows} currency={(n) => formatCurrency(n, locale)} emptyLabel={t.expenseCategories.empty} />
            )}
          </article>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. BEST SELLERS (65%) + STOCK ATTENTION (35%)                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="grid gap-3 xl:grid-cols-[1.65fr_0.85fr]">
        {/* ── Best Sellers — progress bar design ──────────────────────── */}
        {visible.has("bestSellers") && (
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t.bestSellers.title}</h2>
                <p className="text-[10px] text-slate-400">{dateRangeText}</p>
              </div>
              {topProducts.length > 5 && (
                <Link href={`/${locale}/reports/summary`} className="text-[11px] font-semibold text-violet-600 transition hover:text-violet-800">
                  {t.topProductsTable.viewAll}
                </Link>
              )}
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 shrink-0 rounded-lg bg-violet-50" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32 bg-slate-100" />
                      <Skeleton className="h-2 w-full rounded-full bg-violet-50" />
                    </div>
                    <Skeleton className="h-4 w-12 bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <p className="text-sm text-slate-400">{t.bestSellers.noBestSellers}</p>
                <Link href={`/${locale}/sales`} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700">
                  {t.bestSellers.openPos}
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topProducts.slice(0, 5).map((p, i) => {
                  const pct = maxQtySold > 0 ? (p.quantity_sold / maxQtySold) * 100 : 0;
                  return (
                    <div key={p.product_id} className="flex items-center gap-3">
                      {/* Rank badge */}
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${i < 3 ? "bg-violet-100 text-violet-700" : "bg-slate-50 text-slate-400"}`}>
                        {i + 1}
                      </span>
                      {/* Name + progress bar */}
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 truncate text-xs font-semibold text-slate-800" title={p.product_name}>
                          {p.product_name}
                        </p>
                        <div className="h-2 overflow-hidden rounded-full bg-violet-100/50">
                          <div
                            className="h-2 rounded-full bg-violet-500 transition-all duration-700"
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      </div>
                      {/* Qty sold */}
                      <div className="shrink-0 text-right">
                        <span className="nums text-sm font-black text-slate-800">{p.quantity_sold}</span>
                        <span className="ml-1 text-[10px] text-slate-400">{t.bestSellers.qtySold}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}

        {/* ── Stock Attention — unified out-of-stock + low stock ──────── */}
        {visible.has("stockAttention") && (
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">{t.stockAttention.title}</h2>
              <Link href={`/${locale}/inventory`} className="text-[11px] font-semibold text-violet-600 transition hover:text-violet-800">
                {t.stockAttention.viewAll}
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <SkeletonStatRow key={i} className="bg-slate-50/40" />)}</div>
            ) : stockError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <p className="text-xs text-rose-500">{t.stockAttention.stockError}</p>
                <button onClick={() => void loadDashboard()} className="text-xs font-semibold text-violet-600 underline" type="button">
                  {t.stockAttention.stockRetry}
                </button>
              </div>
            ) : outOfStockList.length === 0 && lowStockList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Package className="h-5 w-5 text-emerald-600" />
                </span>
                <p className="text-xs text-slate-400">{t.stockAttention.noIssues}</p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-4 overflow-auto">
                {/* Out of Stock section */}
                {outOfStockList.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold text-rose-600">
                      {t.stockAttention.outOfStockSection} ({outOfStockList.length})
                    </p>
                    <div className="space-y-2">
                      {outOfStockList.slice(0, 5).map((p) => (
                        <div key={p.product_id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                            <Package className="h-4 w-4 text-rose-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {t.stockAttention.remaining} 0 · {t.stockAttention.warehouse}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            {t.stockAttention.outOfStockBadge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Stock section */}
                {lowStockList.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold text-amber-600">
                      {t.stockAttention.lowStockSection} ({lowStockList.length})
                    </p>
                    <div className="space-y-2">
                      {lowStockList.slice(0, 5).map((p) => {
                        const qty = p.total_stock ?? p.quantity;
                        // Effective reorder point: the product's own min_stock when set, else
                        // the fallback threshold — matching the backend low-stock policy.
                        const reorderPoint = (p.min_stock ?? 0) > 0 ? p.min_stock : LOW_STOCK_THRESHOLD;
                        return (
                          <div key={p.product_id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {t.stockAttention.remaining} {qty} / {t.stockAttention.reorderPoint} {reorderPoint} · {t.stockAttention.warehouse}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {t.stockAttention.lowBadge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7. RECENT SALES — full width (100%)                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visible.has("recentSales") && (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t.recentSales.title}</h2>
              <p className="text-[10px] text-slate-400">{dateRangeText}</p>
            </div>
            <div className="flex items-center gap-2">
              {(data?.recent_sales.length ?? 0) > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {data!.recent_sales.length}
                </span>
              )}
              <Link href={`/${locale}/sales`} className="text-[11px] font-semibold text-violet-600 transition hover:text-violet-800">
                {t.recentOrders.viewAll}
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-violet-50">
                  <th className="px-2 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.recentOrders.invoice}</th>
                  <th className="px-2 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.recentOrders.customer}</th>
                  <th className="px-2 pb-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.recentOrders.total}</th>
                  <th className="px-2 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.recentOrders.payment}</th>
                  <th className="px-2 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.recentOrders.time}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-violet-50/70">
                      <td className="px-2 py-2.5"><Skeleton className="h-4 w-20 bg-violet-50" /></td>
                      <td className="px-2 py-2.5"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                      <td className="px-2 py-2.5 text-right"><Skeleton className="ml-auto h-4 w-16 bg-slate-100" /></td>
                      <td className="px-2 py-2.5"><Skeleton className="h-5 w-14 rounded-full bg-slate-100" /></td>
                      <td className="px-2 py-2.5"><Skeleton className="h-4 w-12 bg-slate-100" /></td>
                    </tr>
                  ))
                ) : (data?.recent_sales.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-2 py-8 text-center" colSpan={5}>
                      <p className="text-sm text-slate-400">{t.recentOrders.noOrders}</p>
                      <Link href={`/${locale}/sales`} className="mt-2 inline-block rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700">
                        {t.recentOrders.openPos}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  data!.recent_sales.map((sale: DashboardRecentSale) => (
                    <tr key={sale.id} className="border-b border-violet-50/70 transition last:border-0 hover:bg-violet-50/30">
                      <td className="px-2 py-2.5"><span className="nums text-xs font-bold text-slate-900 whitespace-nowrap">{sale.sale_number}</span></td>
                      <td className="px-2 py-2.5 text-xs text-slate-600">{sale.customer_name || t.recentOrders.walkIn}</td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-slate-800">{formatCurrency(sale.total_amount, locale)}</td>
                      <td className="px-2 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${paymentBadgeClass(sale.payment_method)}`}>
                          {localizePaymentMethod(sale.payment_method, t.paymentMethods)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-[11px] text-slate-500">{formatTime(sale.sold_at, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
