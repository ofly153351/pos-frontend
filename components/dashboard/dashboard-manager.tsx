"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDashboard } from "@/services/dashboard";
import type {
  DashboardPeriod,
  DashboardQueryInput,
  DashboardRecentSale,
  StoreDashboard,
} from "@/types/dashboard";

type DashboardDictionary = {
  actions: {
    newSaleDescription: string;
    newSaleTitle: string;
    stockDescription: string;
    stockTitle: string;
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
  loading: string;
  quickActionsTitle: string;
  requestFailedLabel: string;
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
  validation: {
    customRangeRequired: string;
  };
};

type DashboardManagerProps = {
  dictionary: DashboardDictionary;
  locale: string;
};

type FilterPeriod = DashboardPeriod | "custom";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocaleTag(locale: string) {
  return locale === "th" ? "th-TH" : "en-US";
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
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

function compactRangeText(data: StoreDashboard | null, locale: string) {
  if (!data?.range) return "-";
  return `${formatDateTime(data.range.from, locale)} – ${formatDateTime(data.range.to, locale)}`;
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const CHART_COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#d946ef", "#8b5cf6", "#ef4444"];

const PAYMENT_BADGE: Record<string, string> = {
  cash:     "bg-emerald-100 text-emerald-700",
  card:     "bg-violet-100 text-violet-700",
  transfer: "bg-amber-100 text-amber-700",
  qr:       "bg-sky-100 text-sky-700",
};

function paymentBadgeClass(method: string) {
  return PAYMENT_BADGE[method.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DashboardManager({ dictionary, locale }: DashboardManagerProps) {
  const [period, setPeriod] = useState<FilterPeriod>("today");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [topLimit, setTopLimit]   = useState(5);
  const [recentLimit, setRecentLimit]       = useState(10);
  const [lowStockLimit, setLowStockLimit]   = useState(10);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [data, setData]       = useState<StoreDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const input: DashboardQueryInput = {
        low_stock_limit: lowStockLimit,
        low_stock_threshold: lowStockThreshold,
        recent_limit: recentLimit,
        top_limit: topLimit,
      };
      if (period === "custom") {
        if (!fromDate || !toDate) {
          setError(dictionary.validation.customRangeRequired);
          setIsLoading(false);
          return;
        }
        input.from = fromDate;
        input.to   = toDate;
      } else {
        input.period = period;
      }
      const response = await getDashboard(input);
      setData(response.data);
      setIsFilterOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : dictionary.requestFailedLabel);
    } finally {
      setIsLoading(false);
    }
  }, [dictionary.requestFailedLabel, dictionary.validation.customRangeRequired,
      fromDate, lowStockLimit, lowStockThreshold, period, recentLimit, toDate, topLimit]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const chartData = useMemo(() => {
    return [...(data?.recent_sales ?? [])]
      .sort((a, b) => new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime())
      .slice(-12)
      .map((sale) => ({
        name: new Date(sale.sold_at).toLocaleDateString(toLocaleTag(locale), { day: "numeric", month: "short" }),
        amount: sale.total_amount ?? 0,
        fullDate: sale.sold_at,
      }));
  }, [data?.recent_sales, locale]);

  const paymentBreakdown = useMemo(() => {
    const total = (data?.payment_breakdown ?? []).reduce((s, i) => s + i.amount, 0);
    return (data?.payment_breakdown ?? []).map((item) => ({
      ...item,
      ratio: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [data?.payment_breakdown]);

  const topProducts    = data?.top_products ?? [];
  const lowStockList   = [...(data?.low_stock_products ?? [])].sort((a, b) => a.quantity - b.quantity).slice(0, 5);
  const highStockList  = [...(data?.low_stock_products ?? [])].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const kpiCards = [
    {
      icon: TrendingUp,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      label: dictionary.summary.revenue,
      value: formatCurrency(data?.summary.revenue ?? 0, locale),
    },
    {
      icon: ShoppingCart,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      label: dictionary.summary.salesCount,
      value: (data?.summary.sales_count ?? 0).toLocaleString(toLocaleTag(locale)),
    },
    {
      icon: Wallet,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      label: dictionary.summary.averageTicket,
      value: formatCurrency(data?.summary.average_ticket ?? 0, locale),
    },
    {
      icon: AlertTriangle,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      label: dictionary.sections.lowStockProducts,
      value: (data?.low_stock_products.length ?? 0).toLocaleString(toLocaleTag(locale)),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 p-6 text-white shadow-lg shadow-violet-200/60">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-32 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-80 rounded-full bg-pink-500/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{dictionary.title}</h1>
              <p className="mt-0.5 text-xs text-violet-200">{compactRangeText(data, locale)}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
              {([
                { label: dictionary.filters.periodToday, value: "today" },
                { label: dictionary.filters.period7d,    value: "7d" },
                { label: dictionary.filters.period30d,   value: "30d" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    period === opt.value ? "bg-white text-violet-700 shadow-sm" : "text-white/80 hover:text-white"
                  }`}
                  onClick={() => setPeriod(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              className={`rounded-xl p-2 transition ${isFilterOpen ? "bg-white text-violet-700" : "bg-white/10 text-white hover:bg-white/20"}`}
              title={dictionary.filters.periodLabel}
              onClick={() => setIsFilterOpen((c) => !c)}
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <button
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadDashboard()}
              type="button"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {dictionary.filters.refresh}
            </button>
          </div>
        </div>

        {/* Advanced filter panel */}
        {isFilterOpen && (
          <div className="relative mt-4 grid gap-2 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-6">
            <label className="flex flex-col gap-1 text-xs text-white/90">
              <span>{dictionary.filters.periodLabel}</span>
              <select
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white outline-none backdrop-blur-sm focus:border-white/50 focus:ring-2 focus:ring-white/20"
                onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
                value={period}
              >
                <option className="text-slate-900" value="today">{dictionary.filters.periodToday}</option>
                <option className="text-slate-900" value="7d">{dictionary.filters.period7d}</option>
                <option className="text-slate-900" value="30d">{dictionary.filters.period30d}</option>
                <option className="text-slate-900" value="custom">{dictionary.filters.periodCustom}</option>
              </select>
            </label>

            {period === "custom" && (
              <>
                <label className="flex flex-col gap-1 text-xs text-white/90">
                  <span>{dictionary.filters.fromLabel}</span>
                  <input
                    className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white outline-none backdrop-blur-sm focus:border-white/50 focus:ring-2 focus:ring-white/20"
                    onChange={(e) => setFromDate(e.target.value)}
                    type="date"
                    value={fromDate}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-white/90">
                  <span>{dictionary.filters.toLabel}</span>
                  <input
                    className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white outline-none backdrop-blur-sm focus:border-white/50 focus:ring-2 focus:ring-white/20"
                    onChange={(e) => setToDate(e.target.value)}
                    type="date"
                    value={toDate}
                  />
                </label>
              </>
            )}

            {[
              { key: "topLimit",          label: dictionary.filters.topLimitLabel,      options: [5, 10, 15, 20],        setter: setTopLimit },
              { key: "recentLimit",       label: dictionary.filters.recentLimitLabel,   options: [10, 20, 30, 40, 50],   setter: setRecentLimit },
              { key: "lowStockLimit",     label: dictionary.filters.lowStockLimitLabel, options: [5, 10, 20, 30, 40, 50], setter: setLowStockLimit },
            ].map(({ key, label, options, setter }) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-white/90">
                <span>{label}</span>
                <select
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white outline-none backdrop-blur-sm focus:border-white/50 focus:ring-2 focus:ring-white/20"
                  onChange={(e) => setter(parseNumber(e.target.value, 10))}
                  defaultValue={10}
                >
                  {options.map((o) => <option key={o} className="text-slate-900" value={o}>{o}</option>)}
                </select>
              </label>
            ))}

            <label className="flex flex-col gap-1 text-xs text-white/90">
              <span>{dictionary.filters.lowStockThresholdLabel}</span>
              <input
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs text-white outline-none backdrop-blur-sm focus:border-white/50 focus:ring-2 focus:ring-white/20"
                min={1}
                onChange={(e) => setLowStockThreshold(parseNumber(e.target.value, 10))}
                type="number"
                value={lowStockThreshold}
              />
            </label>

            <button
              className="self-end rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50 sm:col-span-2 lg:col-span-1"
              onClick={() => void loadDashboard()}
              type="button"
            >
              {dictionary.filters.apply}
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}

      {/* ── Quick actions ────────────────────────────────────────────────────── */}
      <section>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.quickActionsTitle}</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/${locale}/sales`}
            className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-sm">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{dictionary.actions.newSaleTitle}</p>
              <p className="truncate text-xs text-slate-500">{dictionary.actions.newSaleDescription}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
          </Link>

          <Link
            href={`/${locale}/stock`}
            className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{dictionary.actions.stockTitle}</p>
              <p className="truncate text-xs text-slate-500">{dictionary.actions.stockDescription}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>
        </div>
      </section>

      {/* ── KPI cards ────────────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ icon: Icon, iconBg, iconColor, label, value }) => (
          <article
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">{label}</p>
              {isLoading
                ? <div className="mt-1 h-6 w-24 animate-pulse rounded-lg bg-violet-50" />
                : <p className="mt-0.5 truncate text-xl font-black text-slate-900">{value}</p>}
            </div>
          </article>
        ))}
      </section>

      {/* ── Revenue chart + Payment breakdown ────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Revenue area chart */}
        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">{dictionary.summary.revenue}</h2>
              <p className="text-xs text-slate-400">{dictionary.sections.range}</p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              {compactCurrency(data?.summary.revenue ?? 0, locale)}
            </span>
          </div>

          <div className="h-[280px] rounded-xl bg-gradient-to-b from-violet-50/60 to-transparent p-3">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">{dictionary.loading}</div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">{dictionary.empty}</div>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={chartData} margin={{ bottom: 4, left: 0, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" fontSize={9} interval="preserveStartEnd" minTickGap={40} tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} />
                  <YAxis axisLine={false} fontSize={9} tick={{ fill: "#94a3b8", fontSize: 9 }} tickFormatter={(v: number) => compactCurrency(v, locale)} tickLine={false} width={48} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-slate-900 px-3 py-2 text-white shadow-lg">
                          <p className="text-[10px] text-slate-400">{new Date(d.fullDate).toLocaleDateString(toLocaleTag(locale), { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" })}</p>
                          <p className="text-sm font-bold">{formatCurrency(d.amount, locale)}</p>
                        </div>
                      );
                    }}
                    cursor={false}
                  />
                  <Area activeDot={{ fill: "#7c3aed", r: 5, stroke: "#fff", strokeWidth: 2 }} dataKey="amount" fill="url(#revenueGradient)" stroke="#7c3aed" strokeWidth={2.5} type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Payment breakdown donut */}
        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">{dictionary.sections.paymentBreakdown}</h2>
          {isLoading ? (
            <p className="text-sm text-slate-400">{dictionary.loading}</p>
          ) : paymentBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400">{dictionary.empty}</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <ResponsiveContainer height={140} width={140}>
                  <RechartsPieChart>
                    <Pie cx="50%" cy="50%" data={paymentBreakdown} dataKey="amount" endAngle={-270} innerRadius={36} nameKey="payment_method" outerRadius={62} paddingAngle={3} startAngle={90} stroke="none">
                      {paymentBreakdown.map((_item, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 px-3 py-2 text-white shadow-lg">
                            <p className="text-xs font-semibold capitalize">{d.payment_method}</p>
                            <p className="text-sm font-bold">{formatCurrency(d.amount, locale)}</p>
                            <p className="text-[10px] text-slate-400">{d.ratio.toFixed(1)}%</p>
                          </div>
                        );
                      }}
                      cursor={false}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {paymentBreakdown.map((item, i) => (
                  <div key={item.payment_method}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs font-semibold capitalize text-slate-700">{item.payment_method}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{item.ratio.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-violet-100/50">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length], width: `${Math.max(item.ratio, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>

      {/* ── Top products + Stock alerts ───────────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Top products bar chart */}
        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">{dictionary.sections.topProducts}</h2>
          {isLoading ? (
            <p className="text-sm text-slate-400">{dictionary.loading}</p>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">{dictionary.empty}</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart barCategoryGap={8} data={topProducts.slice(0, 8)} layout="vertical" margin={{ bottom: 4, left: 0, right: 8, top: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#f8fafc" />
                  <XAxis axisLine={false} dataKey="amount" fontSize={9} tick={{ fill: "#94a3b8", fontSize: 9 }} tickFormatter={(v: number) => compactCurrency(v, locale)} tickLine={false} type="number" />
                  <YAxis axisLine={false} dataKey="product_name" fontSize={10} tick={{ fill: "#1e293b", fontSize: 10 }} tickLine={false} type="category" width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-slate-900 px-3 py-2 text-white shadow-lg">
                          <p className="text-xs font-semibold">{d.product_name}</p>
                          <p className="text-sm font-bold">{formatCurrency(d.amount, locale)}</p>
                          <p className="text-[10px] text-slate-400">sold {d.quantity_sold}</p>
                        </div>
                      );
                    }}
                    cursor={false}
                  />
                  <Bar dataKey="amount" maxBarSize={14} radius={[0, 6, 6, 0]}>
                    {topProducts.slice(0, 8).map((_e, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        {/* Low & high stock */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-1 xl:gap-4">
          {/* Low stock */}
          <article className="rounded-[1.75rem] border border-rose-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-rose-700">{dictionary.sections.lowStockProducts}</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-rose-50" />)}</div>
            ) : lowStockList.length === 0 ? (
              <p className="text-sm text-slate-400">{dictionary.empty}</p>
            ) : (
              <ul className="space-y-1.5">
                {lowStockList.map((p) => (
                  <li key={p.product_id} className="flex items-center justify-between rounded-xl bg-rose-50/60 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Package className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span className="truncate text-xs font-medium text-slate-800">{p.name}</span>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {p.total_stock ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* High stock */}
          <article className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-emerald-700">{dictionary.sections.highStockProducts}</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-emerald-50" />)}</div>
            ) : highStockList.length === 0 ? (
              <p className="text-sm text-slate-400">{dictionary.empty}</p>
            ) : (
              <ul className="space-y-1.5">
                {highStockList.map((p) => (
                  <li key={p.product_id} className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Package className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate text-xs font-medium text-slate-800">{p.name}</span>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {p.total_stock ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      {/* ── Recent sales ─────────────────────────────────────────────────────── */}
      <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{dictionary.sections.recentSales}</h2>
          {(data?.recent_sales.length ?? 0) > 0 && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
              {data!.recent_sales.length}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-violet-50">
                <th className="px-3 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.table.saleNumber}</th>
                <th className="px-3 pb-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.table.amount}</th>
                <th className="px-3 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.table.paymentMethod}</th>
                <th className="px-3 pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.table.soldAt}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-3 py-2">
                      <div className="h-8 animate-pulse rounded-xl bg-violet-50" />
                    </td>
                  </tr>
                ))
              ) : (data?.recent_sales.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-400" colSpan={4}>{dictionary.empty}</td>
                </tr>
              ) : (
                data!.recent_sales.map((sale: DashboardRecentSale) => (
                  <tr key={sale.id} className="group border-b border-violet-50/70 transition last:border-0 hover:bg-violet-50/40">
                    <td className="px-3 py-3">
                      <span className="font-mono text-sm font-bold text-slate-900">{sale.sale_number}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-800">{formatCurrency(sale.total_amount, locale)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${paymentBadgeClass(sale.payment_method)}`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(sale.sold_at, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
