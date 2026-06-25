"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Coins,
  CreditCard,
  Lightbulb,
  Percent,
  PiggyBank,
  Receipt,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { getExecutiveSummary, getPnl, type GetPnlParams } from "@/services/finance";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import { RevenueCostProfitBars, type RcpRow } from "@/components/finance/revenue-cost-profit-bars";
import { RevenueProfitLineChart, type RevenueProfitDatum } from "@/components/reports/revenue-profit-line-chart";
import { DashboardHero, type HeroPeriod } from "@/components/shared/dashboard-hero";
import type { PnlDictionary } from "@/components/finance/pnl-types";

type Props = { dictionary: PnlDictionary; locale: string };

// Display-only insight thresholds (do not affect any financial calculation).
const HEALTHY_MARGIN = 10; // net margin ≥ 10% reads as healthy
const HIGH_EXPENSE_RATIO = 30; // opex > 30% of net revenue reads as high
// Store timezone offset (Asia/Bangkok = UTC+7, no DST) — aligns the trend
// gap-fill with the backend's Bangkok day buckets (mirrors summary-manager).
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Enumerate every Bangkok calendar day in [fromIso, toIso) so zero-activity days
// surface as gaps and day keys line up with backend buckets.
function enumerateDays(fromIso: string, toIso: string): string[] {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: string[] = [];
  const startBkk = new Date(start.getTime() + BKK_OFFSET_MS);
  const endBkk = new Date(end.getTime() + BKK_OFFSET_MS);
  const cursor = new Date(Date.UTC(startBkk.getUTCFullYear(), startBkk.getUTCMonth(), startBkk.getUTCDate()));
  let guard = 0;
  while (cursor.getTime() < endBkk.getTime() && guard < 400) {
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

export function PnlManager({ dictionary: t, locale }: Props) {
  const [tab, setTab] = useState<HeroPeriod>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // What's actually fetched. Period tabs apply instantly; custom waits for Apply.
  const [applied, setApplied] = useState<GetPnlParams>({ period: "30d" });

  const pnlQuery = useQuery({
    queryKey: ["finance", "pnl", applied],
    queryFn: async () => (await getPnl(applied)).data,
  });
  const report = pnlQuery.data;

  // Profit trend reuses the existing executive-summary endpoint (no API change).
  // It carries a daily revenue + gross-profit series the P&L endpoint doesn't.
  // Failure here must not break the P&L page — the chart falls back to empty.
  const trendQuery = useQuery({
    queryKey: ["finance", "summary", "pnl-trend", applied],
    queryFn: async () => (await getExecutiveSummary(applied)).data,
  });

  // ── Formatters ──
  const money = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return (n: number) => nf.format(n);
  }, [locale]);
  const int = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 });
    return (n: number) => nf.format(n);
  }, [locale]);
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const dtf = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );
  const dayfmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" }),
    [locale],
  );

  // ── Derived P&L figures (computed client-side from raw components) ──
  const calc = useMemo(() => {
    const grossRevenue = report?.revenue.gross_revenue ?? 0;
    const refunds = report?.revenue.refunds ?? 0;
    const netRevenue = grossRevenue - refunds;
    const cogs = report?.cogs.total ?? 0;
    const grossProfit = netRevenue - cogs;
    const opex = report?.operating_expenses ?? 0;
    const netProfit = grossProfit - opex;
    const safe = (num: number) => (netRevenue > 0 ? (num / netRevenue) * 100 : 0);
    return {
      grossRevenue,
      refunds,
      netRevenue,
      cogs,
      grossProfit,
      opex,
      netProfit,
      grossMargin: safe(grossProfit),
      netMargin: safe(netProfit),
      expenseRatio: safe(opex),
      costRatio: safe(cogs),
      discount: report?.revenue.discount_amount ?? 0,
      vat: report?.revenue.vat_amount ?? 0,
      salesCount: report?.revenue.sales_count ?? 0,
      missingCostLines: report?.cogs.missing_cost_lines ?? 0,
    };
  }, [report]);

  const isLoss = !pnlQuery.isPending && calc.netProfit < 0;

  // ── Charts data ──
  const rcpRows = useMemo<RcpRow[]>(
    () => [
      { label: t.rcp.revenue, value: calc.netRevenue, tone: "revenue" },
      { label: t.rcp.cost, value: calc.cogs + calc.opex, tone: "cost" },
      { label: t.rcp.profit, value: calc.netProfit, tone: "profit" },
    ],
    [t.rcp.revenue, t.rcp.cost, t.rcp.profit, calc.netRevenue, calc.cogs, calc.opex, calc.netProfit],
  );

  // Expense categories ranked largest-first for the Top Expenses card.
  const expenseRows = useMemo<CategoryValueRow[]>(() => {
    const denom = calc.opex || 1;
    return (report?.expense_by_category ?? [])
      .map((c) => ({
        name: c.name?.trim() || t.expenseBreakdown.uncategorized,
        value: c.total,
        percent: (c.total / denom) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [report, calc.opex, t.expenseBreakdown.uncategorized]);

  const paymentRows = useMemo<CategoryValueRow[]>(() => {
    const denom = calc.grossRevenue || 1;
    return (report?.payment_breakdown ?? []).map((p) => ({
      name: (t.method as Record<string, string>)[p.payment_method] ?? p.payment_method,
      value: p.amount,
      percent: (p.amount / denom) * 100,
    }));
  }, [report, calc.grossRevenue, t.method]);

  const trendData = useMemo<RevenueProfitDatum[]>(() => {
    const data = trendQuery.data;
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
  }, [trendQuery.data, dayfmt]);

  // ── Filter actions ──
  function selectPeriod(p: HeroPeriod) {
    setTab(p);
    if (p === "today") {
      const today = new Date().toISOString().slice(0, 10);
      setApplied({ from: today, to: today });
    } else if (p === "custom") {
      // wait for user to set dates + click apply
    } else {
      setApplied({ period: p });
    }
  }
  const customValid = customFrom !== "" && customTo !== "" && customFrom <= customTo;
  function applyCustom() {
    if (!customValid) return;
    setApplied({ from: customFrom, to: customTo });
  }

  const rangeLabel = report
    ? t.period.rangeLabel
        .replace("{from}", dtf.format(new Date(report.range.from)))
        .replace("{to}", dtf.format(new Date(new Date(report.range.to).getTime() - 1)))
    : "";

  // ── KPI cards ──
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
  const KPIS: KpiItem[] = [
    {
      label: t.kpi.netRevenue,
      value: money(calc.netRevenue),
      icon: Wallet,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      hint: `${int(calc.salesCount)} ${t.kpi.salesCountSuffix}`,
    },
    {
      label: t.kpi.grossProfit,
      value: money(calc.grossProfit),
      icon: TrendingUp,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      hint: pct(calc.grossMargin),
      valueTone: calc.grossProfit < 0 ? "danger" : "default",
    },
    {
      label: t.kpi.operatingExpenses,
      value: money(calc.opex),
      icon: Receipt,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      hint: pct(calc.expenseRatio),
    },
    {
      label: t.kpi.netProfit,
      value: isLoss ? `-${money(Math.abs(calc.netProfit))}` : money(calc.netProfit),
      icon: isLoss ? TrendingDown : PiggyBank,
      iconBg: isLoss ? "bg-rose-100" : "bg-emerald-100",
      iconColor: isLoss ? "text-rose-600" : "text-emerald-600",
      emphasis: true,
      warning: isLoss,
      valueTone: isLoss ? "danger" : "default",
      hint: pct(calc.netMargin),
    },
    {
      label: t.kpi.netMargin,
      value: pct(calc.netMargin),
      icon: Coins,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valueTone: calc.netMargin < 0 ? "danger" : "default",
    },
  ];

  // ── Financial ratio cards ──
  const RATIOS: Array<{ label: string; value: string; danger?: boolean }> = [
    { label: t.ratios.grossMargin, value: pct(calc.grossMargin), danger: calc.grossMargin < 0 },
    { label: t.ratios.netMargin, value: pct(calc.netMargin), danger: calc.netMargin < 0 },
    { label: t.ratios.costRatio, value: pct(calc.costRatio) },
    { label: t.ratios.expenseRatio, value: pct(calc.expenseRatio) },
  ];

  // ── Profit-flow steps (Revenue → COGS → Gross Profit → Opex → Net Profit) ──
  type FlowStep = {
    key: string;
    label: string;
    value: number;
    icon: LucideIcon;
    tone: "revenue" | "cost" | "profit";
    result?: boolean;
    badge?: string;
  };
  const flowSteps: FlowStep[] = [
    { key: "rev", label: t.kpi.netRevenue, value: calc.netRevenue, icon: Wallet, tone: "revenue" },
    { key: "cogs", label: t.statement.cogs, value: -calc.cogs, icon: Boxes, tone: "cost" },
    {
      key: "gp",
      label: t.kpi.grossProfit,
      value: calc.grossProfit,
      icon: TrendingUp,
      tone: calc.grossProfit < 0 ? "cost" : "profit",
      result: true,
      badge: `${t.statement.grossMargin} ${pct(calc.grossMargin)}`,
    },
    { key: "opex", label: t.statement.operatingExpenses, value: -calc.opex, icon: Receipt, tone: "cost" },
    {
      key: "np",
      label: t.kpi.netProfit,
      value: calc.netProfit,
      icon: isLoss ? TrendingDown : PiggyBank,
      tone: isLoss ? "cost" : "profit",
      result: true,
      badge: `${t.statement.netMargin} ${pct(calc.netMargin)}`,
    },
  ];

  // ── Business insights (read-only, derived from existing figures) ──
  type Insight = { key: string; tone: "danger" | "warning" | "success" | "info"; title: string; desc: string };
  const insights: Insight[] = [];
  if (report && !pnlQuery.isPending) {
    if (isLoss) {
      insights.push({ key: "loss", tone: "danger", title: t.insights.lossTitle, desc: t.insights.lossDesc });
    }
    if (calc.missingCostLines > 0) {
      insights.push({
        key: "missing",
        tone: "warning",
        title: t.insights.missingCostTitle,
        desc: t.insights.missingCostDesc.replace("{count}", int(calc.missingCostLines)),
      });
    }
    if (!isLoss && calc.netRevenue > 0 && calc.netMargin < HEALTHY_MARGIN) {
      insights.push({
        key: "low-margin",
        tone: "warning",
        title: t.insights.lowMarginTitle,
        desc: t.insights.lowMarginDesc.replace("{margin}", pct(calc.netMargin)),
      });
    }
    if (!isLoss && calc.netMargin >= HEALTHY_MARGIN) {
      insights.push({
        key: "healthy-margin",
        tone: "success",
        title: t.insights.healthyMarginTitle,
        desc: t.insights.healthyMarginDesc.replace("{margin}", pct(calc.netMargin)),
      });
    }
    if (calc.expenseRatio > HIGH_EXPENSE_RATIO) {
      insights.push({
        key: "high-expense",
        tone: "warning",
        title: t.insights.highExpenseTitle,
        desc: t.insights.highExpenseDesc.replace("{ratio}", pct(calc.expenseRatio)),
      });
    }
    if (expenseRows.length > 0 && expenseRows[0].value > 0) {
      insights.push({
        key: "top-expense",
        tone: "info",
        title: t.insights.topExpenseTitle,
        desc: t.insights.topExpenseDesc
          .replace("{name}", expenseRows[0].name)
          .replace("{value}", money(expenseRows[0].value)),
      });
    }
  }

  if (pnlQuery.isError) {
    return (
      <div className="w-full xl:px-2 2xl:px-4">
        <QueryErrorState locale={locale} onRetry={() => pnlQuery.refetch()} className="my-6" />
      </div>
    );
  }

  const productsHref = `/${locale}/products`;

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Hero banner */}
      <div className="my-4">
        <DashboardHero
          icon={ScrollText}
          title={t.title}
          subtitle={t.subtitle}
          rangeLabel={rangeLabel}
          period={tab}
          onPeriodChange={selectPeriod}
          periodLabels={{
            today: t.period.today,
            d7: t.period.d7,
            d30: t.period.d30,
            d90: t.period.d90,
            custom: t.period.custom,
            from: t.period.from,
            to: t.period.to,
            apply: t.period.apply,
            refresh: t.period.refresh,
          }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onApplyCustom={applyCustom}
          customValid={customValid}
          isLoading={pnlQuery.isFetching}
          onRefresh={() => pnlQuery.refetch()}
        />
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {pnlQuery.isPending
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-100" />)
          : KPIS.map((k) => (
              <ReportKpiCard
                key={k.label}
                label={k.label}
                value={k.value}
                icon={<k.icon className="h-5 w-5" />}
                iconBg={k.iconBg}
                iconColor={k.iconColor}
                hint={k.hint}
                emphasis={k.emphasis}
                warning={k.warning}
                valueTone={k.valueTone}
              />
            ))}
      </div>

      {/* Loss banner */}
      {isLoss ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-rose-800">{t.lossBanner.title}</p>
            <p className="text-xs text-rose-700/80">{t.lossBanner.desc}</p>
          </div>
        </div>
      ) : null}

      {/* Actionable insight — sold lines with no cost understate COGS */}
      {!pnlQuery.isPending && calc.missingCostLines > 0 ? (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-800">{t.dataQuality.title}</p>
            <p className="text-xs text-amber-700/80">
              {t.dataQuality.missingCost.replace("{count}", int(calc.missingCostLines))}
            </p>
            <p className="mt-1 text-xs text-amber-700/80">{t.dataQuality.impact}</p>
          </div>
          <Link
            href={productsHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            {t.dataQuality.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Statement + Profit flow */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* P&L statement */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-7">
          <SectionHead icon={ScrollText} wrap="bg-violet-100 text-violet-600" title={t.statement.title} subtitle={t.statement.subtitle} />
          {pnlQuery.isPending ? (
            <div className="space-y-2.5">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <div className="text-sm">
              <Row label={t.statement.revenue} value={money(calc.grossRevenue)} strong />
              <SubRow label={t.statement.discountInfo} value={money(calc.discount)} />
              <SubRow label={t.statement.vatInfo} value={money(calc.vat)} />
              <SubRow label={t.statement.refunds} value={money(calc.refunds)} note={t.statement.refundsNote} negative />
              <Divider />
              <Row label={t.statement.netRevenue} value={money(calc.netRevenue)} strong subtotal />
              <Row label={t.statement.cogs} value={`-${money(calc.cogs)}`} tone="cost" />
              <Divider />
              <Row
                label={t.statement.grossProfit}
                value={money(calc.grossProfit)}
                badge={`${t.statement.grossMargin} ${pct(calc.grossMargin)}`}
                strong
                subtotal
                tone={calc.grossProfit < 0 ? "cost" : "profit"}
              />
              <Row label={t.statement.operatingExpenses} value={`-${money(calc.opex)}`} tone="cost" />
              <Divider bold />
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-slate-900">{t.statement.netProfit}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isLoss ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isLoss ? t.statement.lossBadge : t.statement.profitBadge} · {t.statement.netMargin} {pct(calc.netMargin)}
                  </span>
                </div>
                <span className={`text-xl font-black tabular-nums ${isLoss ? "text-rose-600" : "text-emerald-600"}`}>
                  {isLoss ? `-${money(Math.abs(calc.netProfit))}` : money(calc.netProfit)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Profit flow */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-5">
          <SectionHead icon={Activity} wrap="bg-indigo-100 text-indigo-600" title={t.flow.title} subtitle={t.flow.subtitle} />
          {pnlQuery.isPending ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-100" />)}</div>
          ) : (
            <ol className="space-y-0">
              {flowSteps.map((step, i) => (
                <li key={step.key}>
                  <FlowRow step={step} money={money} />
                  {i < flowSteps.length - 1 ? (
                    <div className="flex justify-center py-0.5">
                      <ArrowDown className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Financial ratios */}
      <section className="mb-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <SectionHead icon={Percent} wrap="bg-violet-100 text-violet-600" title={t.ratios.title} subtitle={t.ratios.subtitle} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {pnlQuery.isPending
            ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-100" />)
            : RATIOS.map((r) => (
                <div key={r.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-center">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.label}</p>
                  <p className={`mt-1 text-lg font-black tabular-nums ${r.danger ? "text-rose-600" : "text-slate-800"}`}>{r.value}</p>
                </div>
              ))}
        </div>
      </section>

      {/* Profit trend + Revenue/Cost/Profit comparison */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-8">
          <SectionHead icon={TrendingUp} wrap="bg-violet-100 text-violet-600" title={t.trend.title} subtitle={t.trend.subtitle} />
          {trendQuery.isPending ? (
            <Skeleton className="h-[240px] w-full rounded-lg bg-slate-100" />
          ) : (
            <>
              <RevenueProfitLineChart
                data={trendData}
                currency={money}
                emptyLabel={t.trend.empty}
                revenueLabel={t.trend.revenue}
                profitLabel={t.trend.profit}
                height={240}
              />
              <p className="mt-2 text-[11px] text-slate-400">{t.trend.note}</p>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm xl:col-span-4">
          <SectionHead icon={Coins} wrap="bg-emerald-100 text-emerald-600" title={t.rcp.title} subtitle={t.rcp.subtitle} />
          {pnlQuery.isPending ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <RevenueCostProfitBars rows={rcpRows} currency={money} emptyLabel={t.rcp.empty} />
          )}
        </section>
      </div>

      {/* Top expenses + payment method */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <SectionHead icon={Receipt} wrap="bg-rose-100 text-rose-600" title={t.topExpenses.title} subtitle={t.topExpenses.subtitle} />
          {pnlQuery.isPending ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
          ) : expenseRows.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-400">{t.expenseBreakdown.empty}</div>
          ) : (
            <ul className="space-y-3">
              {expenseRows.map((row, i) => (
                <li key={`${row.name}-${i}`} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${rankClass(i)}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800" title={row.name}>{row.name}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{money(row.value)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rose-50">
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(4, Math.min(100, row.percent))}%` }} />
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{pct(row.percent)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <SectionHead icon={CreditCard} wrap="bg-violet-100 text-violet-600" title={t.paymentBreakdown.title} subtitle={t.paymentBreakdown.subtitle} />
          {pnlQuery.isPending ? (
            <div className="space-y-3.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={paymentRows} currency={money} emptyLabel={t.paymentBreakdown.empty} />
          )}
        </section>
      </div>

      {/* Business insights */}
      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <SectionHead icon={Lightbulb} wrap="bg-amber-100 text-amber-600" title={t.insights.title} subtitle={t.insights.subtitle} />
        {pnlQuery.isPending ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-100" />)}</div>
        ) : insights.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-800">{t.insights.empty}</p>
              <p className="text-xs text-emerald-700/80">{t.insights.emptyDesc}</p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {insights.map((ins) => (
              <InsightCard key={ins.key} insight={ins} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Section header ──
function SectionHead({ icon: Icon, wrap, title, subtitle }: { icon: LucideIcon; wrap: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${wrap}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Profit-flow row ──
function FlowRow({ step, money }: { step: { label: string; value: number; icon: LucideIcon; tone: "revenue" | "cost" | "profit"; result?: boolean; badge?: string }; money: (n: number) => string }) {
  const negative = step.value < 0;
  const valueColor = negative ? "text-rose-600" : step.tone === "profit" ? "text-emerald-600" : "text-slate-900";
  const Icon = step.icon;
  const iconWrap =
    step.tone === "revenue"
      ? "bg-violet-100 text-violet-600"
      : step.tone === "cost"
        ? "bg-rose-100 text-rose-600"
        : "bg-emerald-100 text-emerald-600";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        step.result ? "border border-violet-200 bg-violet-50/60" : "bg-slate-50"
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${step.result ? "font-bold text-slate-900" : "font-medium text-slate-600"}`} title={step.label}>
          {step.label}
        </p>
        {step.badge ? <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{step.badge}</p> : null}
      </div>
      <span className={`shrink-0 text-sm font-bold tabular-nums ${valueColor}`}>
        {negative ? `-${money(Math.abs(step.value))}` : money(step.value)}
      </span>
    </div>
  );
}

// ── Insight card ──
function InsightCard({ insight }: { insight: { tone: "danger" | "warning" | "success" | "info"; title: string; desc: string } }) {
  const TONE: Record<typeof insight.tone, { wrap: string; icon: LucideIcon; iconColor: string; title: string }> = {
    danger: { wrap: "border-rose-200 bg-rose-50/70", icon: TrendingDown, iconColor: "text-rose-600", title: "text-rose-800" },
    warning: { wrap: "border-amber-200 bg-amber-50/70", icon: AlertTriangle, iconColor: "text-amber-600", title: "text-amber-800" },
    success: { wrap: "border-emerald-200 bg-emerald-50/70", icon: CheckCircle2, iconColor: "text-emerald-600", title: "text-emerald-800" },
    info: { wrap: "border-violet-200 bg-violet-50/70", icon: Lightbulb, iconColor: "text-violet-600", title: "text-violet-800" },
  };
  const cfg = TONE[insight.tone];
  const Icon = cfg.icon;
  return (
    <li className={`flex items-start gap-3 rounded-xl border p-3.5 ${cfg.wrap}`}>
      <span className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${cfg.title}`}>{insight.title}</p>
        <p className="text-xs text-slate-600">{insight.desc}</p>
      </div>
    </li>
  );
}

// ── Statement row helpers ──

function Row({
  label,
  value,
  strong = false,
  subtotal = false,
  tone = "default",
  badge,
}: {
  label: string;
  value: string;
  strong?: boolean;
  subtotal?: boolean;
  tone?: "default" | "cost" | "profit";
  badge?: string;
}) {
  const valueColor =
    tone === "cost" ? "text-rose-600" : tone === "profit" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className={`flex items-center justify-between gap-3 ${subtotal ? "py-1.5" : "py-1"}`}>
      <div className="flex items-center gap-2">
        <span className={`${strong ? "font-bold text-slate-800" : "text-slate-600"}`}>{label}</span>
        {badge ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {badge}
          </span>
        ) : null}
      </div>
      <span className={`tabular-nums ${strong ? "font-bold" : "font-medium"} ${valueColor}`}>{value}</span>
    </div>
  );
}

function SubRow({
  label,
  value,
  note,
  negative = false,
}: {
  label: string;
  value: string;
  note?: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5 pl-4">
      <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
        {label}
        {note ? <span className="text-[10px] text-slate-300">({note})</span> : null}
      </span>
      <span className="text-[12px] tabular-nums text-slate-400">{negative ? `-${value}` : value}</span>
    </div>
  );
}

function Divider({ bold = false }: { bold?: boolean }) {
  return <div className={`my-1 border-t ${bold ? "border-slate-300" : "border-slate-100"}`} />;
}
