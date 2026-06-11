"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Coins,
  Layers3,
  PackageX,
  ShieldAlert,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { getDashboard } from "@/services/dashboard";
import { listProducts } from "@/services/products";
import { listMovements, type StockMovement } from "@/services/stock-movements";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/product";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import type { ReportsInventoryDictionary } from "@/components/reports/reports-types";

type Props = { dictionary: ReportsInventoryDictionary; locale: string };

const DAY_MS = 86_400_000;
const TOP_CATEGORIES = 6;
// How many recent movements to scan for per-product "last sold" dates. Products
// whose last sale predates this window surface as "no recent sales" (= dead),
// which is still correct for dead-stock classification.
const MOVEMENT_SCAN_LIMIT = 2000;

type DeadDays = 30 | 60 | 90;
type Severity = "normal" | "warning" | "critical";

// A sale reduces stock and is tagged by type ("sale"/"sell") or note
// ("sale deduction") — mirrors how the inventory activity feed classifies sales.
function isSaleMovement(m: StockMovement): boolean {
  if (m.quantity_change >= 0) return false;
  const type = (m.type ?? "").toLowerCase();
  const note = (m.note ?? "").toLowerCase();
  return type.includes("sale") || type.includes("sell") || note.includes("sale deduction");
}

// A stock-in: stock increased and tagged as receive/add/in — used to estimate
// "stock age" (how long the current pile has sat since it last came in).
function isReceiveMovement(m: StockMovement): boolean {
  if (m.quantity_change <= 0) return false;
  const type = (m.type ?? "").toLowerCase();
  const note = (m.note ?? "").toLowerCase();
  return type.includes("receive") || type.includes("add") || type === "in" || note.includes("received") || note.includes("stock addition");
}

function severityOf(daysSince: number | null): Severity {
  if (daysSince === null || daysSince >= 90) return "critical";
  if (daysSince >= 60) return "warning";
  return "normal";
}

type DeadAction = "review" | "discount" | "clearance" | "returnSupplier";

// Suggest the cheapest sensible next step per dead-stock item:
//  never sold → likely a bad buy, try returning it; ≥90d → clear it out;
//  60–89d → mark it down; 30–59d → just keep an eye on it.
function recommendedAction(daysSince: number | null, lastAt: number | null): DeadAction {
  if (lastAt === null) return "returnSupplier";
  if (daysSince === null) return "review";
  if (daysSince >= 90) return "clearance";
  if (daysSince >= 60) return "discount";
  return "review";
}

export function InventoryValueManager({ dictionary: t, locale }: Props) {
  const [deadDays, setDeadDays] = useState<DeadDays>(30);
  // Snapshot "now" once at mount — keeps the dead-stock memo pure (no Date.now()
  // during render) and gives stable "days idle" figures for this report view.
  const [now] = useState(() => Date.now());

  const productsQuery = useQuery({
    queryKey: ["reports", "inventory-value", "products"],
    queryFn: async () => (await listProducts({ limit: 9999, page: 1 })).data,
  });
  const topQuery = useQuery({
    queryKey: ["reports", "inventory-value", "top-30d"],
    queryFn: async () => (await getDashboard({ period: "30d", top_limit: 10 })).data,
  });
  const movementsQuery = useQuery({
    queryKey: ["reports", "inventory-value", "movements"],
    queryFn: async () => (await listMovements(undefined, 1, MOVEMENT_SCAN_LIMIT)).data,
  });

  const products = useMemo<Product[]>(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const topProducts = useMemo(() => topQuery.data?.top_products ?? [], [topQuery.data]);
  const movements = useMemo(() => movementsQuery.data?.items ?? [], [movementsQuery.data]);

  // Denominator for each product's contribution %: prefer the period's true total
  // revenue; fall back to the sum of the listed top products.
  const topTotalRevenue = useMemo(() => {
    const periodRevenue = topQuery.data?.summary?.revenue ?? 0;
    if (periodRevenue > 0) return periodRevenue;
    const sum = topProducts.reduce((acc, p) => acc + p.amount, 0);
    return sum > 0 ? sum : 1;
  }, [topQuery.data, topProducts]);

  // ── Number / date formatters (locale-aware) ──
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

  // ── Active products are the basis for value, cost, SKU and units (sellable
  //    inventory). Inactive/discontinued items are excluded. ──
  const activeProducts = useMemo(() => products.filter((p) => p.is_active), [products]);

  const totals = useMemo(() => {
    let cost = 0;
    let retail = 0;
    let units = 0;
    let missingCost = 0;
    let costExceedsPrice = 0;
    for (const p of activeProducts) {
      const stock = p.total_stock ?? 0;
      if (stock <= 0) continue;
      const unitCost = p.cost_price ?? 0;
      const unitPrice = p.base_price ?? 0;
      cost += unitCost * stock;
      retail += unitPrice * stock;
      units += stock;
      if (unitCost <= 0) missingCost += 1;
      else if (unitPrice > 0 && unitCost > unitPrice) costExceedsPrice += 1;
    }
    return {
      cost,
      retail,
      profit: retail - cost,
      units,
      sku: activeProducts.length,
      missingCost,
      costExceedsPrice,
    };
  }, [activeProducts]);

  // ── Inventory value by category (retail basis), top N + "Others" ──
  const categoryRows = useMemo<CategoryValueRow[]>(() => {
    const map = new Map<string, number>();
    for (const p of activeProducts) {
      const stock = p.total_stock ?? 0;
      if (stock <= 0) continue;
      const value = (p.base_price ?? 0) * stock;
      const name = p.product_type_name?.trim() || t.category.uncategorized;
      map.set(name, (map.get(name) ?? 0) + value);
    }
    let cats = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (cats.length > TOP_CATEGORIES) {
      const head = cats.slice(0, TOP_CATEGORIES);
      const rest = cats.slice(TOP_CATEGORIES).reduce((sum, c) => sum + c.value, 0);
      head.push({ name: t.category.others, value: rest });
      cats = head;
    }
    const denom = cats.reduce((sum, c) => sum + c.value, 0) || 1;
    return cats.map((c) => ({ name: c.name, value: c.value, percent: (c.value / denom) * 100 }));
  }, [activeProducts, t.category.others, t.category.uncategorized]);

  // ── Per-product last-sold map from recent sale movements ──
  const lastSoldByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      if (!isSaleMovement(m)) continue;
      const ts = Date.parse(m.created_at);
      if (Number.isNaN(ts)) continue;
      const prev = map.get(m.product_id);
      if (prev === undefined || ts > prev) map.set(m.product_id, ts);
    }
    return map;
  }, [movements]);

  // Most recent stock-in per product → "stock age" (days the current pile has
  // sat since its last replenishment). Null when no receive is in the window.
  const lastReceiveByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      if (!isReceiveMovement(m)) continue;
      const ts = Date.parse(m.created_at);
      if (Number.isNaN(ts)) continue;
      const prev = map.get(m.product_id);
      if (prev === undefined || ts > prev) map.set(m.product_id, ts);
    }
    return map;
  }, [movements]);

  // ── Dead stock (filtered by the selected threshold) ──
  const deadStock = useMemo(() => {
    const rows = activeProducts
      .filter((p) => (p.total_stock ?? 0) > 0)
      .map((p) => {
        const lastAt = lastSoldByProduct.get(p.id) ?? null;
        const daysSince = lastAt === null ? null : Math.floor((now - lastAt) / DAY_MS);
        const receivedAt = lastReceiveByProduct.get(p.id) ?? null;
        const stockAgeDays = receivedAt === null ? null : Math.floor((now - receivedAt) / DAY_MS);
        const tiedValue = (p.cost_price ?? 0) * (p.total_stock ?? 0);
        return { product: p, lastAt, daysSince, stockAgeDays, tiedValue };
      })
      .filter((r) => r.lastAt === null || (r.daysSince !== null && r.daysSince >= deadDays))
      .sort((a, b) => b.tiedValue - a.tiedValue);
    const capital = rows.reduce((sum, r) => sum + r.tiedValue, 0);
    return { rows, capital, count: rows.length };
  }, [activeProducts, lastSoldByProduct, lastReceiveByProduct, deadDays, now]);

  const isLoading = productsQuery.isPending;

  // Valuation looks suspicious when costs are missing (cost understated → profit
  // overstated) or some items cost more than they sell for, or profit is negative.
  const valuationSuspect = totals.missingCost > 0 || totals.costExceedsPrice > 0;
  const profitNegative = totals.profit < 0;

  const qualityIssues: Array<{ label: string; count: number | null }> = [];
  if (totals.missingCost > 0) qualityIssues.push({ label: t.dataQuality.missingCost, count: totals.missingCost });
  if (totals.costExceedsPrice > 0) qualityIssues.push({ label: t.dataQuality.costExceedsPrice, count: totals.costExceedsPrice });
  if (profitNegative) qualityIssues.push({ label: t.dataQuality.negativeProfit, count: null });

  // Concentration: graded warning on the single largest real category.
  //   > 85% → high risk, > 70% → watch, otherwise no warning.
  const topCategory = categoryRows[0];
  const concentration: { level: "high" | "medium"; text: string } | null = (() => {
    if (!topCategory || topCategory.name === t.category.others || topCategory.percent <= 70) return null;
    const level: "high" | "medium" = topCategory.percent > 85 ? "high" : "medium";
    const template = level === "high" ? t.category.concentrationHigh : t.category.concentrationMedium;
    return {
      level,
      text: template.replace("{category}", topCategory.name).replace("{percent}", topCategory.percent.toFixed(1)),
    };
  })();

  type KpiItem = {
    label: string;
    value: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    emphasis?: boolean;
    warning?: boolean;
    warningHint?: string;
    valueTone?: "default" | "danger";
    hint?: string;
  };

  // When expected profit is negative the figure is misleading — swap that slot
  // for a Risk Summary card that frames it as a risk + points to the issue count.
  const profitOrRiskCard: KpiItem = profitNegative
    ? {
        label: t.kpi.riskTitle,
        value: t.kpi.riskHigh,
        icon: ShieldAlert,
        iconBg: "bg-rose-100",
        iconColor: "text-rose-600",
        emphasis: true,
        warning: true,
        warningHint: t.kpi.abnormalHint,
        valueTone: "danger",
        hint: `${money(totals.profit)} · ${int(qualityIssues.length)} ${t.kpi.riskIssuesSuffix}`,
      }
    : {
        label: t.kpi.expectedProfit,
        value: money(totals.profit),
        icon: TrendingUp,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        emphasis: true,
        warning: valuationSuspect,
        warningHint: t.kpi.abnormalHint,
      };

  const KPIS: KpiItem[] = [
    { label: t.kpi.totalCost, value: money(totals.cost), icon: Coins, iconBg: "bg-violet-100", iconColor: "text-violet-600", warning: valuationSuspect, warningHint: t.kpi.abnormalHint },
    { label: t.kpi.retailValue, value: money(totals.retail), icon: Wallet, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
    profitOrRiskCard,
    { label: t.kpi.totalSku, value: `${int(totals.sku)} ${t.kpi.skuSuffix}`, icon: Layers3, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
    { label: t.kpi.totalUnits, value: `${int(totals.units)} ${t.kpi.unitsSuffix}`, icon: Boxes, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  ];

  const DEAD_FILTERS: Array<{ key: DeadDays; label: string }> = [
    { key: 30, label: t.deadStock.filter30 },
    { key: 60, label: t.deadStock.filter60 },
    { key: 90, label: t.deadStock.filter90 },
  ];

  const severityClass: Record<Severity, string> = {
    normal: "bg-slate-100 text-slate-600",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };
  const severityLabel: Record<Severity, string> = {
    normal: t.deadStock.statusNormal,
    warning: t.deadStock.statusWarning,
    critical: t.deadStock.statusCritical,
  };
  const actionClass: Record<DeadAction, string> = {
    review: "bg-slate-100 text-slate-600",
    discount: "bg-amber-100 text-amber-700",
    clearance: "bg-orange-100 text-orange-700",
    returnSupplier: "bg-rose-100 text-rose-700",
  };
  const actionLabel: Record<DeadAction, string> = {
    review: t.deadStock.actionReview,
    discount: t.deadStock.actionDiscount,
    clearance: t.deadStock.actionClearance,
    returnSupplier: t.deadStock.actionReturnSupplier,
  };

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Header */}
      <div className="my-4">
        <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
        <p className="text-sm text-slate-500">{t.subtitle}</p>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {isLoading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-100" />)
          : KPIS.map((k) => (
              <ReportKpiCard
                key={k.label}
                label={k.label}
                value={k.value}
                icon={<k.icon className="h-5 w-5" />}
                iconBg={k.iconBg}
                iconColor={k.iconColor}
                emphasis={k.emphasis}
                warning={k.warning}
                warningHint={k.warningHint}
                valueTone={k.valueTone}
                hint={k.hint}
              />
            ))}
      </div>

      {/* Data quality check */}
      {!isLoading ? (
        qualityIssues.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><AlertTriangle className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-bold text-amber-800">{t.dataQuality.title}</p>
                <p className="text-[11px] text-amber-700/80">{t.dataQuality.subtitle}</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {qualityIssues.map((issue) => (
                <li key={issue.label} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {issue.label}
                  {issue.count !== null ? (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700">{int(issue.count)} {t.dataQuality.itemsSuffix}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t.dataQuality.allClear}
          </div>
        )
      ) : null}

      {/* Active-only note */}
      {!isLoading ? <p className="mb-5 text-[11px] text-slate-400">{t.activeOnlyNote}</p> : null}

      {/* Category breakdown + Top selling */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Inventory value by category */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Layers3 className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.category.title}</h3>
              <p className="text-[11px] text-slate-400">{t.category.subtitle}</p>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={categoryRows} currency={money} emptyLabel={t.category.empty} />
          )}
          {!isLoading && concentration ? (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                concentration.level === "high"
                  ? "border-rose-200 bg-rose-50/70 text-rose-800"
                  : "border-amber-200 bg-amber-50/70 text-amber-800"
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${concentration.level === "high" ? "text-rose-500" : "text-amber-500"}`}
              />
              <span>{concentration.text}</span>
            </div>
          ) : null}
        </section>

        {/* Top selling (30 days) */}
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Trophy className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.topSelling.title}</h3>
              <p className="text-[11px] text-slate-400">{t.topSelling.subtitle}</p>
            </div>
          </div>
          {topQuery.isPending ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
          ) : topProducts.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">{t.topSelling.empty}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-violet-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="w-8 px-2 py-2 font-bold">{t.topSelling.colRank}</th>
                    <th className="px-2 py-2 font-bold">{t.topSelling.colProduct}</th>
                    <th className="px-2 py-2 text-right font-bold">{t.topSelling.colQtySold}</th>
                    <th className="px-2 py-2 text-right font-bold">{t.topSelling.colRevenue}</th>
                    <th className="px-2 py-2 text-right font-bold">{t.topSelling.colContribution}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.product_id} className="transition hover:bg-violet-50/40">
                      <td className={`px-2 py-2.5 text-sm font-bold tabular-nums ${i === 0 ? "text-amber-600" : "text-slate-400"}`}>{i + 1}</td>
                      <td className="px-2 py-2.5">
                        <span className="block max-w-[220px] truncate text-sm font-medium text-slate-800" title={p.product_name}>{p.product_name}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-700">{int(p.quantity_sold)}</td>
                      <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-slate-900">{money(p.amount)}</td>
                      <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-500">{((p.amount / topTotalRevenue) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Dead stock analysis */}
      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><PackageX className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.deadStock.title}</h3>
              <p className="text-[11px] text-slate-400">{t.deadStock.subtitle}</p>
            </div>
          </div>
          {/* Threshold filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">{t.deadStock.filterLabel}</span>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {DEAD_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setDeadDays(f.key)}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    deadDays === f.key ? "bg-violet-600 text-white shadow" : "text-slate-600 hover:bg-white hover:text-violet-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.deadStock.countLabel}</p>
              <p className="text-2xl font-black text-slate-900">{int(deadStock.count)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Coins className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.deadStock.capitalLabel}</p>
              <p className="truncate text-2xl font-black text-rose-700">{money(deadStock.capital)}</p>
              <p className="truncate text-[11px] text-slate-400">{t.deadStock.capitalHint}</p>
            </div>
          </div>
        </div>

        {/* Dead stock table */}
        {movementsQuery.isPending || productsQuery.isPending ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg bg-slate-100" />)}</div>
        ) : deadStock.rows.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-400">{t.deadStock.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-violet-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-3 py-2.5 font-bold">{t.deadStock.colProduct}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.deadStock.colCurrentStock}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.deadStock.colValue}</th>
                  <th className="px-3 py-2.5 font-bold">{t.deadStock.colLastSold}</th>
                  <th className="px-3 py-2.5 text-right font-bold">{t.deadStock.colStockAge}</th>
                  <th className="px-3 py-2.5 text-center font-bold">{t.deadStock.colStatus}</th>
                  <th className="px-3 py-2.5 text-center font-bold">{t.deadStock.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deadStock.rows.map(({ product: p, lastAt, daysSince, stockAgeDays, tiedValue }) => {
                  const sev = severityOf(daysSince);
                  const action = recommendedAction(daysSince, lastAt);
                  const unit = p.product_unit_name ?? "";
                  return (
                    <tr key={p.id} className="transition hover:bg-rose-50/30">
                      <td className="px-3 py-3">
                        <span className="block max-w-[240px] truncate text-sm font-semibold text-slate-800" title={p.name}>{p.name}</span>
                        <span className="block truncate font-mono text-[11px] text-slate-400">{p.sku ?? "-"}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-700">{int(p.total_stock ?? 0)}{unit ? ` ${unit}` : ""}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-slate-900">{money(tiedValue)}</td>
                      <td className="px-3 py-3">
                        {lastAt === null ? (
                          <span className="text-sm text-slate-400">{t.deadStock.neverSold}</span>
                        ) : (
                          <>
                            <span className="block text-sm text-slate-600">{dtf.format(new Date(lastAt))}</span>
                            <span className="block text-[11px] text-slate-400">{daysSince === null ? "" : `${int(daysSince)} ${t.deadStock.daysSuffix}`}</span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-700">{stockAgeDays === null ? <span className="text-slate-300">—</span> : `${int(stockAgeDays)} ${t.deadStock.daysSuffix}`}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass[sev]}`}>{severityLabel[sev]}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${actionClass[action]}`}>{actionLabel[action]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Window caveat */}
        <p className="mt-3 text-[11px] text-slate-400">{t.deadStock.windowNote}</p>
      </section>
    </div>
  );
}
