"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarRange,
  Coins,
  CreditCard,
  PiggyBank,
  Receipt,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { getPnl, type GetPnlParams, type PnlPeriod } from "@/services/finance";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import { RevenueCostProfitBars, type RcpRow } from "@/components/finance/revenue-cost-profit-bars";
import type { PnlDictionary } from "@/components/finance/pnl-types";

type Props = { dictionary: PnlDictionary; locale: string };

type Tab = PnlPeriod | "custom";

const PERIOD_TABS: Array<{ key: PnlPeriod; labelKey: "d7" | "d30" | "d90" }> = [
  { key: "7d", labelKey: "d7" },
  { key: "30d", labelKey: "d30" },
  { key: "90d", labelKey: "d90" },
];

export function PnlManager({ dictionary: t, locale }: Props) {
  const [tab, setTab] = useState<Tab>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // What's actually fetched. Period tabs apply instantly; custom waits for Apply.
  const [applied, setApplied] = useState<GetPnlParams>({ period: "30d" });

  const pnlQuery = useQuery({
    queryKey: ["finance", "pnl", applied],
    queryFn: async () => (await getPnl(applied)).data,
  });
  const report = pnlQuery.data;

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
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const dtf = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
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

  const expenseRows = useMemo<CategoryValueRow[]>(() => {
    const denom = calc.opex || 1;
    return (report?.expense_by_category ?? []).map((c) => ({
      name: c.name?.trim() || t.expenseBreakdown.uncategorized,
      value: c.total,
      percent: (c.total / denom) * 100,
    }));
  }, [report, calc.opex, t.expenseBreakdown.uncategorized]);

  const paymentRows = useMemo<CategoryValueRow[]>(() => {
    const denom = calc.grossRevenue || 1;
    return (report?.payment_breakdown ?? []).map((p) => ({
      name: (t.method as Record<string, string>)[p.payment_method] ?? p.payment_method,
      value: p.amount,
      percent: (p.amount / denom) * 100,
    }));
  }, [report, calc.grossRevenue, t.method]);

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

  const RATIOS: Array<{ label: string; value: string; danger?: boolean }> = [
    { label: t.ratios.grossMargin, value: pct(calc.grossMargin), danger: calc.grossMargin < 0 },
    { label: t.ratios.netMargin, value: pct(calc.netMargin), danger: calc.netMargin < 0 },
    { label: t.ratios.expenseRatio, value: pct(calc.expenseRatio) },
    { label: t.ratios.costRatio, value: pct(calc.costRatio) },
  ];

  if (pnlQuery.isError) {
    return (
      <div className="w-full xl:px-2 2xl:px-4">
        <QueryErrorState locale={locale} onRetry={() => pnlQuery.refetch()} className="my-6" />
      </div>
    );
  }

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Header + period filter */}
      <div className="my-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-500">
            {t.subtitle}
            {rangeLabel ? <span className="text-slate-400"> · {rangeLabel}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {PERIOD_TABS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  tab === p.key ? "bg-violet-600 text-white shadow" : "text-slate-600 hover:bg-white hover:text-violet-700"
                }`}
              >
                {t.period[p.labelKey]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTab("custom")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition ${
                tab === "custom" ? "bg-violet-600 text-white shadow" : "text-slate-600 hover:bg-white hover:text-violet-700"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" /> {t.period.custom}
            </button>
          </div>
          {tab === "custom" ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label={t.period.from}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label={t.period.to}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyCustom}
                disabled={!customValid}
                className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.period.apply}
              </button>
            </div>
          ) : null}
        </div>
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

      {/* Data quality — sold lines with no cost understate COGS */}
      {!pnlQuery.isPending && calc.missingCostLines > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-800">{t.dataQuality.title}</p>
            <p className="text-xs text-amber-700/80">
              {t.dataQuality.missingCost.replace("{count}", int(calc.missingCostLines))}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* P&L statement */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <ScrollText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.statement.title}</h3>
              <p className="text-[11px] text-slate-400">{t.statement.subtitle}</p>
            </div>
          </div>

          {pnlQuery.isPending ? (
            <div className="space-y-2.5">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <div className="text-sm">
              {/* Revenue */}
              <Row label={t.statement.revenue} value={money(calc.grossRevenue)} strong />
              <SubRow label={t.statement.discountInfo} value={money(calc.discount)} />
              <SubRow label={t.statement.vatInfo} value={money(calc.vat)} />
              <SubRow label={t.statement.refunds} value={money(calc.refunds)} note={t.statement.refundsNote} negative />
              <Divider />
              {/* Net revenue */}
              <Row label={t.statement.netRevenue} value={money(calc.netRevenue)} strong subtotal />
              <Row label={t.statement.cogs} value={`-${money(calc.cogs)}`} tone="cost" />
              <Divider />
              {/* Gross profit */}
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
              {/* Net profit */}
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

              {/* Ratios strip */}
              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
                {RATIOS.map((r) => (
                  <div key={r.label} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.label}</p>
                    <p className={`mt-0.5 text-sm font-bold tabular-nums ${r.danger ? "text-rose-600" : "text-slate-800"}`}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Revenue vs Cost vs Profit */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.rcp.title}</h3>
              <p className="text-[11px] text-slate-400">{t.rcp.subtitle}</p>
            </div>
          </div>
          {pnlQuery.isPending ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <RevenueCostProfitBars rows={rcpRows} currency={money} emptyLabel={t.rcp.empty} />
          )}
        </section>
      </div>

      {/* Expense breakdown + payment method */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Receipt className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.expenseBreakdown.title}</h3>
              <p className="text-[11px] text-slate-400">{t.expenseBreakdown.subtitle}</p>
            </div>
          </div>
          {pnlQuery.isPending ? (
            <div className="space-y-3.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={expenseRows} currency={money} emptyLabel={t.expenseBreakdown.empty} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.paymentBreakdown.title}</h3>
              <p className="text-[11px] text-slate-400">{t.paymentBreakdown.subtitle}</p>
            </div>
          </div>
          {pnlQuery.isPending ? (
            <div className="space-y-3.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={paymentRows} currency={money} emptyLabel={t.paymentBreakdown.empty} />
          )}
        </section>
      </div>
    </div>
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
