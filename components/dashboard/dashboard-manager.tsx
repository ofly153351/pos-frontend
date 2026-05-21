"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Package,
  PieChart,
  TrendingUp,
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

type MetricCard = {
  accentClass: string;
  label: string;
  value: string;
};

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeRecentSalesSeries(recentSales: DashboardRecentSale[]) {
  return [...recentSales]
    .sort((a, b) => new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime())
    .slice(-12);
}

function buildMetrics(data: StoreDashboard | null, dictionary: DashboardDictionary, locale: string): MetricCard[] {
  return [
    {
      accentClass: "bg-violet-500/12 text-violet-700",
      label: dictionary.summary.revenue,
      value: formatCurrency(data?.summary.revenue ?? 0, locale),
    },
    {
      accentClass: "bg-violet-500/12 text-violet-700",
      label: dictionary.summary.salesCount,
      value: (data?.summary.sales_count ?? 0).toLocaleString(toLocaleTag(locale)),
    },
    {
      accentClass: "bg-emerald-500/12 text-emerald-700",
      label: dictionary.summary.averageTicket,
      value: formatCurrency(data?.summary.average_ticket ?? 0, locale),
    },
    {
      accentClass: "bg-rose-500/12 text-rose-700",
      label: dictionary.sections.lowStockProducts,
      value: (data?.low_stock_products.length ?? 0).toLocaleString(toLocaleTag(locale)),
    },
  ];
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
  if (!data?.range) {
    return "-";
  }

  return `${formatDateTime(data.range.from, locale)} - ${formatDateTime(data.range.to, locale)}`;
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export function DashboardManager({ dictionary, locale }: DashboardManagerProps) {
  const [period, setPeriod] = useState<FilterPeriod>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [topLimit, setTopLimit] = useState(5);
  const [recentLimit, setRecentLimit] = useState(10);
  const [lowStockLimit, setLowStockLimit] = useState(10);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [data, setData] = useState<StoreDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        input.to = toDate;
      } else {
        input.period = period;
      }

      const response = await getDashboard(input);
      setData(response.data);
      setIsFilterOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : dictionary.requestFailedLabel);
    } finally {
      setIsLoading(false);
    }
  }, [
    dictionary.requestFailedLabel,
    dictionary.validation.customRangeRequired,
    fromDate,
    lowStockLimit,
    lowStockThreshold,
    period,
    recentLimit,
    toDate,
    topLimit,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const recentSeries = useMemo(() => normalizeRecentSalesSeries(data?.recent_sales ?? []), [data?.recent_sales]);

  const chartData = useMemo(() => {
    return recentSeries.map((sale) => ({
      name: new Date(sale.sold_at).toLocaleDateString(toLocaleTag(locale), {
        day: "numeric",
        month: "short",
      }),
      amount: sale.total_amount ?? 0,
      fullDate: sale.sold_at,
    }));
  }, [recentSeries, locale]);

  const paymentBreakdown = useMemo(() => {
    const total = (data?.payment_breakdown ?? []).reduce((sum, item) => sum + item.amount, 0);

    return (data?.payment_breakdown ?? []).map((item) => ({
      ...item,
      ratio: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [data?.payment_breakdown]);

  const topProducts = data?.top_products ?? [];
  const lowStockProducts = [...(data?.low_stock_products ?? [])]
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);
  const highStockProducts = [...(data?.low_stock_products ?? [])]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const metrics = useMemo(() => buildMetrics(data, dictionary, locale), [data, dictionary, locale]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-white via-violet-50/50 to-purple-50/40 p-5 shadow-[0_24px_60px_rgba(59,130,246,0.08)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">{dictionary.title}</h1>
            <p className="mt-1 text-xs text-slate-500">{compactRangeText(data, locale)}</p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/90 p-1.5 shadow-sm">
            {([
              { label: dictionary.filters.periodToday, value: "today" },
              { label: dictionary.filters.period7d, value: "7d" },
              { label: dictionary.filters.period30d, value: "30d" },
            ] as const).map((option) => (
              <button
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  period === option.value
                    ? "bg-violet-600 text-white"
                    : "text-violet-600 hover:bg-violet-50"
                }`}
                key={option.value}
                onClick={() => setPeriod(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
            <button
              aria-label={dictionary.filters.periodLabel}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
              onClick={() => setIsFilterOpen((current) => !current)}
              type="button"
            >
              ...
            </button>
            <button
              className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadDashboard()}
              type="button"
            >
              {dictionary.filters.refresh}
            </button>
          </div>
        </div>

        {isFilterOpen ? (
          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span>{dictionary.filters.periodLabel}</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setPeriod(event.target.value as FilterPeriod)}
                value={period}
              >
                <option value="today">{dictionary.filters.periodToday}</option>
                <option value="7d">{dictionary.filters.period7d}</option>
                <option value="30d">{dictionary.filters.period30d}</option>
                <option value="custom">{dictionary.filters.periodCustom}</option>
              </select>
            </label>

            {period === "custom" ? (
              <>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  <span>{dictionary.filters.fromLabel}</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => setFromDate(event.target.value)}
                    type="date"
                    value={fromDate}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  <span>{dictionary.filters.toLabel}</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => setToDate(event.target.value)}
                    type="date"
                    value={toDate}
                  />
                </label>
              </>
            ) : null}

            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span>{dictionary.filters.topLimitLabel}</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setTopLimit(parseNumber(event.target.value, 5))}
                value={topLimit}
              >
                {[5, 10, 15, 20].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span>{dictionary.filters.recentLimitLabel}</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setRecentLimit(parseNumber(event.target.value, 10))}
                value={recentLimit}
              >
                {[10, 20, 30, 40, 50].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span>{dictionary.filters.lowStockLimitLabel}</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setLowStockLimit(parseNumber(event.target.value, 10))}
                value={lowStockLimit}
              >
                {[5, 10, 20, 30, 40, 50].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span>{dictionary.filters.lowStockThresholdLabel}</span>
              <input
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                min={1}
                onChange={(event) => setLowStockThreshold(parseNumber(event.target.value, 10))}
                type="number"
                value={lowStockThreshold}
              />
            </label>

            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:col-span-2 lg:col-span-1"
              onClick={() => void loadDashboard()}
              type="button"
            >
              {dictionary.filters.apply}
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            key={metric.label}
          >
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${metric.accentClass}`}>
              {metric.label}
            </span>
            <p className="mt-3 truncate text-2xl font-semibold text-slate-950">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">{dictionary.summary.revenue}</h2>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                {dictionary.sections.range}
              </span>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              {compactCurrency(data?.summary.revenue ?? 0, locale)}
            </span>
          </div>

          <div className="mt-4 h-[300px] rounded-2xl bg-gradient-to-b from-violet-100/60 to-white p-3">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">{dictionary.loading}</div>
            ) : recentSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">{dictionary.empty}</div>
            ) : (
              <ResponsiveContainer className="h-full w-full" height="100%" width="100%">
                <AreaChart data={chartData} margin={{ bottom: 4, left: 0, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    fontSize={10}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    fontSize={10}
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    tickFormatter={(v: number) => compactCurrency(v, locale)}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                          <p className="text-[10px] text-slate-300">
                            {new Date(d.fullDate).toLocaleDateString(toLocaleTag(locale), {
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                            })}
                          </p>
                          <p className="text-sm font-bold">
                            {formatCurrency(d.amount, locale)}
                          </p>
                        </div>
                      );
                    }}
                    cursor={false}
                  />
                  <Area
                    activeDot={{ fill: "#7c3aed", r: 5, stroke: "#fff", strokeWidth: 2 }}
                    dataKey="amount"
                    fill="url(#revenueGradient)"
                    stroke="#6d28d9"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">{dictionary.sections.paymentBreakdown}</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">{dictionary.loading}</p>
            ) : paymentBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">{dictionary.empty}</p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <ResponsiveContainer height={140} width={140}>
                    <RechartsPieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={paymentBreakdown}
                        dataKey="amount"
                        endAngle={-270}
                        innerRadius={34}
                        nameKey="payment_method"
                        outerRadius={60}
                        paddingAngle={2}
                        startAngle={90}
                        stroke="none"
                      >
                        {paymentBreakdown.map((_item, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={["#7c3aed","#10b981","#f59e0b","#d946ef","#8b5cf6","#ef4444"][i % 6]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                              <p className="text-xs font-semibold capitalize">{d.payment_method}</p>
                              <p className="text-sm font-bold">{formatCurrency(d.amount, locale)}</p>
                              <p className="text-[10px] text-slate-300">{d.ratio.toFixed(1)}%</p>
                            </div>
                          );
                        }}
                        cursor={false}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {paymentBreakdown.map((item, index) => (
                    <div key={`${item.payment_method}`}>
                      <div className="mb-0.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${["#7c3aed","#10b981","#f59e0b","#d946ef","#8b5cf6","#ef4444"][index % 6]}, ${["#6d28d9","#059669","#d97706","#c026d3","#7c3aed","#dc2626"][index % 6]})`,
                            }}
                          />
                          <span className="font-semibold capitalize text-slate-700">{item.payment_method}</span>
                        </div>
                        <span className="text-xs text-slate-500">{item.ratio.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-violet-100/50">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            background: `linear-gradient(90deg, ${["#7c3aed","#10b981","#f59e0b","#d946ef","#8b5cf6","#ef4444"][index % 6]}, ${["#6d28d9","#059669","#d97706","#c026d3","#7c3aed","#dc2626"][index % 6]})`,
                            width: `${Math.max(item.ratio, 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">{dictionary.sections.topProducts}</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">{dictionary.loading}</p>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">{dictionary.empty}</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer className="h-full w-full" height="100%" width="100%">
                  <BarChart
                    barCategoryGap={8}
                    barGap={2}
                    data={topProducts.slice(0, 8)}
                    layout="vertical"
                    margin={{ bottom: 4, left: 0, right: 8, top: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      axisLine={false}
                      dataKey="amount"
                      fontSize={9}
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      tickFormatter={(v: number) => compactCurrency(v, locale)}
                      tickLine={false}
                      type="number"
                    />
                    <YAxis
                      axisLine={false}
                      dataKey="product_name"
                      fontSize={10}
                      stroke="#94a3b8"
                      tick={{ fill: "#1e293b", fontSize: 10 }}
                      tickLine={false}
                      type="category"
                      width={100}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                            <p className="text-xs font-semibold">{d.product_name}</p>
                            <p className="text-sm font-bold">{formatCurrency(d.amount, locale)}</p>
                            <p className="text-[10px] text-slate-300">sold {d.quantity_sold}</p>
                          </div>
                        );
                      }}
                      cursor={false}
                    />
                    <Bar
                      dataKey="amount"
                      maxBarSize={16}
                      radius={[0, 4, 4, 0]}
                    >
                      {topProducts.slice(0, 8).map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#7c3aed","#8b5cf6","#f59e0b","#8b5cf6","#ef4444","#ec4899","#06b6d4","#10b981"][index % 8]}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </article>

        <section className="grid grid-cols-1 gap-4 rounded-xl bg-slate-100 p-4 lg:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-white p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              {dictionary.sections.lowStockProducts}
            </h4>
            <div className="mt-3 space-y-2">
              {isLoading ? (
                <p className="text-sm text-slate-500">{dictionary.loading}</p>
              ) : lowStockProducts.length === 0 ? (
                <p className="text-sm text-slate-500">{dictionary.empty}</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-rose-50/60 px-3 py-2"
                    key={`dashboard-low-${product.product_id}`}
                  >
                    <div className="flex min-w-0 items-center gap-2 pr-3">
                      <Package className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="truncate text-sm font-medium text-slate-800">{product.name}</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-rose-700">
                      {product.total_stock ?? 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <TrendingUp className="h-4 w-4" />
              {dictionary.sections.highStockProducts}
            </h4>
            <div className="mt-3 space-y-2">
              {isLoading ? (
                <p className="text-sm text-slate-500">{dictionary.loading}</p>
              ) : highStockProducts.length === 0 ? (
                <p className="text-sm text-slate-500">{dictionary.empty}</p>
              ) : (
                highStockProducts.map((product) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2"
                    key={`dashboard-high-${product.product_id}`}
                  >
                    <div className="flex min-w-0 items-center gap-2 pr-3">
                      <Package className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate text-sm font-medium text-slate-800">{product.name}</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {product.total_stock ?? 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </section>

      <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">{dictionary.sections.recentSales}</h2>
          <span className="text-xs text-slate-500">{data?.recent_sales.length ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2">{dictionary.table.saleNumber}</th>
                <th className="px-2 py-2">{dictionary.table.amount}</th>
                <th className="px-2 py-2">{dictionary.table.paymentMethod}</th>
                <th className="px-2 py-2">{dictionary.table.soldAt}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={4}>
                    {dictionary.loading}
                  </td>
                </tr>
              ) : (data?.recent_sales.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={4}>
                    {dictionary.empty}
                  </td>
                </tr>
              ) : (
                data?.recent_sales.map((sale: DashboardRecentSale) => (
                  <tr className="border-t border-slate-100" key={sale.id}>
                    <td className="px-2 py-3 font-medium text-slate-900">{sale.sale_number}</td>
                    <td className="px-2 py-3 text-slate-700">{formatCurrency(sale.total_amount, locale)}</td>
                    <td className="px-2 py-3 capitalize text-slate-700">{sale.payment_method}</td>
                    <td className="px-2 py-3 text-slate-700">{formatDateTime(sale.sold_at, locale)}</td>
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
