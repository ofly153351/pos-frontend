"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Clock3,
  Coins,
  CreditCard,
  Download,
  Gauge,
  Package,
  PieChart,
  PiggyBank,
  Printer,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { getExecutiveSummary, type GetPnlParams, type PnlPeriod } from "@/services/finance";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import { CategoryDonutChart, type DonutDatum } from "@/components/reports/category-donut-chart";
import { RevenueProfitLineChart, type RevenueProfitDatum } from "@/components/reports/revenue-profit-line-chart";
import { SalesByHourChart } from "@/components/reports/sales-by-hour-chart";
import type { SummaryDictionary } from "@/components/reports/summary-types";

type Props = { dictionary: SummaryDictionary; locale: string };

type Tab = PnlPeriod | "custom";

const PERIOD_TABS: Array<{ key: PnlPeriod; labelKey: "d7" | "d30" | "d90" }> = [
  { key: "7d", labelKey: "d7" },
  { key: "30d", labelKey: "d30" },
  { key: "90d", labelKey: "d90" },
];

const DAY_MS = 86_400_000;
const TOP_RANKED = 5;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Enumerate every UTC day in [fromIso, toIso) — matches the backend's
// `AT TIME ZONE 'UTC'` day buckets so zero-sale days show as gaps.
function enumerateDays(fromIso: string, toIso: string): string[] {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  let guard = 0;
  while (cursor < end && guard < 400) {
    days.push(`${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return days;
}

function rankClass(i: number) {
  if (i === 0) return "bg-amber-100 text-amber-700";
  if (i === 1) return "bg-slate-200 text-slate-700";
  if (i === 2) return "bg-orange-100 text-orange-700";
  return "bg-violet-50 text-violet-600";
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function SummaryManager({ dictionary: t, locale }: Props) {
  const [tab, setTab] = useState<Tab>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [applied, setApplied] = useState<GetPnlParams>({ period: "30d" });

  const summaryQuery = useQuery({
    queryKey: ["finance", "summary", applied],
    queryFn: async () => (await getExecutiveSummary(applied)).data,
  });
  const data = summaryQuery.data;
  const isLoading = summaryQuery.isPending;

  // ── Formatters ──
  const money = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (n: number) => nf.format(n);
  }, [locale]);
  const int = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 });
    return (n: number) => nf.format(n);
  }, [locale]);
  const dtf = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );
  const dayfmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" }),
    [locale],
  );

  const isLoss = !isLoading && (data?.net_profit ?? 0) < 0;

  // Day span of the window → average-daily figures.
  const days = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.round((new Date(data.range.to).getTime() - new Date(data.range.from).getTime()) / DAY_MS));
  }, [data]);

  const trendData = useMemo<RevenueProfitDatum[]>(() => {
    if (!data) return [];
    const byDay = new Map(data.sales_trend.map((p) => [p.day, p]));
    return enumerateDays(data.range.from, data.range.to).map((day) => {
      const point = byDay.get(day);
      return {
        label: dayfmt.format(new Date(`${day}T00:00:00Z`)),
        revenue: point?.revenue ?? 0,
        profit: point?.profit ?? 0,
      };
    });
  }, [data, dayfmt]);

  const categoryRows = useMemo<DonutDatum[]>(
    () => (data?.category_breakdown ?? []).map((c) => ({ name: c.name, value: c.total })),
    [data],
  );

  const paymentRows = useMemo<CategoryValueRow[]>(() => {
    if (!data) return [];
    const denom = data.revenue || 1;
    return data.payment_breakdown.map((p) => ({
      name: (t.method as Record<string, string>)[p.payment_method] ?? p.payment_method,
      value: p.amount,
      percent: (p.amount / denom) * 100,
    }));
  }, [data, t.method]);

  const topRanked = useMemo(() => (data?.top_products ?? []).slice(0, TOP_RANKED), [data]);
  const maxQty = useMemo(() => Math.max(1, ...topRanked.map((p) => p.quantity_sold)), [topRanked]);

  // ── Business snapshot ──
  const snapshot = useMemo(() => {
    if (!data) return null;
    const growth = data.previous_revenue > 0 ? ((data.revenue - data.previous_revenue) / data.previous_revenue) * 100 : null;
    const margin = data.revenue > 0 ? (data.net_profit / data.revenue) * 100 : 0;
    return {
      avgDailySales: data.revenue / days,
      avgDailyOrders: data.orders / days,
      growth,
      margin,
    };
  }, [data, days]);

  // ── Filter actions ──
  function selectPeriod(p: PnlPeriod) {
    setTab(p);
    setApplied({ period: p });
  }
  const customValid = customFrom !== "" && customTo !== "" && customFrom <= customTo;
  function applyCustom() {
    if (!customValid) return;
    setApplied({ from: customFrom, to: customTo });
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function exportCsv() {
    if (!data || typeof document === "undefined") return;
    const header = [t.topTable.colRank, t.topTable.colProduct, t.topTable.colQty, t.topTable.colRevenue, t.topTable.colProfit];
    const lines = data.top_products.map((p, i) => [i + 1, p.product_name, p.quantity_sold, p.revenue, p.profit]);
    const csv = [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.exports.csvFilename}-${data.range.from.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rangeLabel = data
    ? t.period.rangeLabel
        .replace("{from}", dtf.format(new Date(data.range.from)))
        .replace("{to}", dtf.format(new Date(new Date(data.range.to).getTime() - 1)))
    : "";

  // ── KPI row (6 sales metrics) ──
  type KpiItem = {
    label: string;
    value: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    hint?: string;
    emphasis?: boolean;
    warning?: boolean;
    valueTone?: "default" | "danger";
  };
  const KPIS: KpiItem[] = data
    ? [
        { label: t.kpi.revenue, value: money(data.revenue), icon: Wallet, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
        { label: t.kpi.orders, value: `${int(data.orders)} ${t.kpi.ordersSuffix}`, icon: ShoppingCart, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
        { label: t.kpi.avgOrderValue, value: money(data.average_order_value), icon: Coins, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
        { label: t.kpi.productsSold, value: `${int(data.products_sold)} ${t.kpi.itemsSuffix}`, icon: Package, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
        {
          label: t.kpi.profit,
          value: isLoss ? `-${money(Math.abs(data.net_profit))}` : money(data.net_profit),
          icon: isLoss ? TrendingDown : PiggyBank,
          iconBg: isLoss ? "bg-rose-100" : "bg-emerald-100",
          iconColor: isLoss ? "text-rose-600" : "text-emerald-600",
          emphasis: true,
          warning: isLoss,
          valueTone: isLoss ? "danger" : "default",
          hint: t.kpi.grossProfitHint.replace("{value}", money(data.gross_profit)),
        },
        { label: t.kpi.customers, value: `${int(data.customers)} ${t.kpi.customersSuffix}`, icon: Users, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
      ]
    : [];

  const sectionHead = (icon: LucideIcon, iconWrap: string, title: string, subtitle: string) => {
    const Icon = icon;
    return (
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconWrap}`}><Icon className="h-4 w-4" /></span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
    );
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-white text-violet-700 shadow" : "text-violet-100 hover:bg-violet-500/60 hover:text-white"}`;

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Hero banner */}
      <div className="my-4 rounded-2xl bg-violet-600 px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-white">{t.title}</h2>
            <p className="text-sm text-violet-100">
              {t.subtitle}
              {rangeLabel ? <span className="text-violet-200"> · {rangeLabel}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl bg-violet-700/50">
              {PERIOD_TABS.map((p) => (
                <button key={p.key} type="button" onClick={() => selectPeriod(p.key)} className={pillClass(tab === p.key)}>
                  {t.period[p.labelKey]}
                </button>
              ))}
              <button type="button" onClick={() => setTab("custom")} className={`inline-flex items-center gap-1 ${pillClass(tab === "custom")}`}>
                <CalendarRange className="h-3.5 w-3.5" /> {t.period.custom}
              </button>
            </div>
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">
              <Printer className="h-3.5 w-3.5" /> {t.exports.print}
            </button>
            <button type="button" onClick={exportCsv} disabled={!data} className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> {t.exports.csv}
            </button>
          </div>
        </div>
        {tab === "custom" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2">
            <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} aria-label={t.period.from} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none" />
            <span className="text-xs text-slate-400">–</span>
            <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} aria-label={t.period.to} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none" />
            <button type="button" onClick={applyCustom} disabled={!customValid} className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
              {t.period.apply}
            </button>
          </div>
        ) : null}
      </div>

      {/* KPI row — 6 sales metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-100" />)
          : KPIS.map((k) => (
              <ReportKpiCard key={k.label} label={k.label} value={k.value} icon={<k.icon className="h-5 w-5" />} iconBg={k.iconBg} iconColor={k.iconColor} hint={k.hint} emphasis={k.emphasis} warning={k.warning} valueTone={k.valueTone} />
            ))}
      </div>

      {/* Row A — Sales trend (primary) + Category donut + Top ranked */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-6">
          {sectionHead(TrendingUp, "bg-violet-100 text-violet-600", t.salesTrend.title, t.salesTrend.subtitle)}
          {isLoading ? (
            <Skeleton className="h-[240px] w-full rounded-lg bg-slate-100" />
          ) : (
            <RevenueProfitLineChart data={trendData} currency={money} emptyLabel={t.salesTrend.empty} revenueLabel={t.salesTrend.revenue} profitLabel={t.salesTrend.profit} height={240} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-3">
          {sectionHead(PieChart, "bg-violet-100 text-violet-600", t.salesByCategory.title, t.salesByCategory.subtitle)}
          {isLoading ? (
            <Skeleton className="h-[260px] w-full rounded-lg bg-slate-100" />
          ) : (
            <CategoryDonutChart rows={categoryRows} currency={money} emptyLabel={t.salesByCategory.empty} othersLabel={t.salesByCategory.others} uncategorizedLabel={t.salesByCategory.uncategorized} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-3">
          {sectionHead(Trophy, "bg-amber-100 text-amber-600", t.topRanked.title, t.topRanked.subtitle)}
          {isLoading ? (
            <div className="space-y-3">{[...Array(TOP_RANKED)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
          ) : topRanked.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-400">{t.topRanked.empty}</div>
          ) : (
            <div className="space-y-3">
              {topRanked.map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${rankClass(i)}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800" title={p.product_name}>{p.product_name}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{money(p.revenue)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-violet-50">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(4, (p.quantity_sold / maxQty) * 100)}%` }} />
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{int(p.quantity_sold)} {t.topRanked.soldSuffix}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Row B — Payment methods + Sales by hour + Business snapshot */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          {sectionHead(CreditCard, "bg-violet-100 text-violet-600", t.paymentBreakdown.title, t.paymentBreakdown.subtitle)}
          {isLoading ? (
            <div className="space-y-3.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={paymentRows} currency={money} emptyLabel={t.paymentBreakdown.empty} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          {sectionHead(Clock3, "bg-indigo-100 text-indigo-600", t.salesByHour.title, t.salesByHour.subtitle)}
          {isLoading ? (
            <Skeleton className="h-[200px] w-full rounded-lg bg-slate-100" />
          ) : (
            <SalesByHourChart hours={data?.sales_by_hour ?? []} currency={money} emptyLabel={t.salesByHour.empty} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          {sectionHead(Gauge, "bg-emerald-100 text-emerald-600", t.businessSnapshot.title, t.businessSnapshot.subtitle)}
          {isLoading || !snapshot ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <ul className="space-y-2.5">
              <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Wallet className="h-4 w-4 text-violet-500" /> {t.businessSnapshot.avgDailySales}</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">{money(snapshot.avgDailySales)}</span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-600"><ShoppingCart className="h-4 w-4 text-indigo-500" /> {t.businessSnapshot.avgDailyOrders}</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">{snapshot.avgDailyOrders.toFixed(1)}</span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  {snapshot.growth !== null && snapshot.growth < 0 ? <ArrowDownRight className="h-4 w-4 text-rose-500" /> : <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                  {t.businessSnapshot.revenueGrowth}
                </span>
                {snapshot.growth === null ? (
                  <span className="text-xs font-medium text-slate-400">{t.businessSnapshot.noBaseline}</span>
                ) : (
                  <span className={`text-sm font-bold tabular-nums ${snapshot.growth < 0 ? "text-rose-600" : "text-emerald-600"}`}>{snapshot.growth >= 0 ? "+" : ""}{snapshot.growth.toFixed(1)}%</span>
                )}
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Gauge className="h-4 w-4 text-emerald-500" /> {t.businessSnapshot.profitMargin}</span>
                <span className={`text-sm font-bold tabular-nums ${snapshot.margin < 0 ? "text-rose-600" : "text-slate-900"}`}>{snapshot.margin.toFixed(1)}%</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      {/* Row C — Top 10 products table */}
      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        {sectionHead(Trophy, "bg-amber-100 text-amber-600", t.topTable.title, t.topTable.subtitle)}
        {isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
        ) : (data?.top_products.length ?? 0) === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-400">{t.topTable.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-violet-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="w-10 px-3 py-2.5 font-bold">{t.topTable.colRank}</th>
                  <th className="px-3 py-2.5 font-bold">{t.topTable.colProduct}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.topTable.colQty}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.topTable.colRevenue}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.topTable.colProfit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.top_products.map((p, i) => (
                  <tr key={p.product_id} className="transition hover:bg-violet-50/40">
                    <td className="px-3 py-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${rankClass(i)}`}>{i + 1}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block max-w-[280px] truncate text-sm font-medium text-slate-800" title={p.product_name}>{p.product_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-700">{int(p.quantity_sold)}</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-slate-900">{money(p.revenue)}</td>
                    <td className={`px-3 py-2.5 text-right text-sm font-bold tabular-nums ${p.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
