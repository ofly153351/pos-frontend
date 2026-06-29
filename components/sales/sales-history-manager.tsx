"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { History, Receipt, Search, SlidersHorizontal, Wallet, X } from "lucide-react";

import { listSales } from "@/services/sales";
import { resolvePaymentLabel } from "@/lib/payment-method";
import type { Sale } from "@/types/sale";

import { SaleDetailModal } from "./sale-detail-modal";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import type { SalesHistoryDict } from "./sales-history-dict";

type DateFilter = "today" | "7d" | "30d" | "all";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function cutoffMs(filter: DateFilter): number {
  if (filter === "all") return 0;
  if (filter === "today") return startOfToday();
  const days = filter === "7d" ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function baht(n: number | undefined | null): string {
  const v = n ?? 0;
  return "฿" + v.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
}

function statusMeta(status: string, dict: SalesHistoryDict): { label: string; cls: string } {
  switch (status) {
    case "voided":
      return { label: dict.statusVoided, cls: "bg-red-50 text-red-600" };
    case "fully_returned":
      return { label: dict.statusFullyReturned, cls: "bg-amber-100 text-amber-700" };
    case "partially_returned":
      return { label: dict.statusPartiallyReturned, cls: "bg-violet-100 text-violet-700" };
    default:
      return { label: dict.statusCompleted, cls: "bg-emerald-100 text-emerald-700" };
  }
}

export function SalesHistoryManager({ dict, embedded = false }: { dict: SalesHistoryDict; embedded?: boolean }) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "th";
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cashierFilter, setCashierFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sales, isLoading, isError } = useQuery({
    queryKey: ["sales-history"],
    queryFn: async () => (await listSales()).data,
    staleTime: 30_000,
  });

  // Canonical resolver → identical wording across dashboard / reports / history.
  const paymentLabel = (method: string): string => resolvePaymentLabel(method, locale);

  // Distinct values for the dropdown filters, derived from the loaded data.
  const cashiers = useMemo(() => {
    const set = new Set<string>();
    (sales ?? []).forEach((s) => s.cashier_name && set.add(s.cashier_name));
    return [...set].sort();
  }, [sales]);

  const payments = useMemo(() => {
    const set = new Set<string>();
    (sales ?? []).forEach((s) => s.payment_method && set.add(s.payment_method));
    return [...set];
  }, [sales]);

  const filtered = useMemo<Sale[]>(() => {
    if (!sales) return [];
    const cutoff = cutoffMs(dateFilter);
    const q = search.toLowerCase().trim();
    const min = amountMin ? parseFloat(amountMin) : null;
    const max = amountMax ? parseFloat(amountMax) : null;
    return sales
      .filter((s) => new Date(s.created_at).getTime() >= cutoff)
      .filter((s) => {
        if (!q) return true;
        return (
          (s.sale_number ?? "").toLowerCase().includes(q) ||
          (s.customer_name ?? "").toLowerCase().includes(q) ||
          (s.cashier_name ?? "").toLowerCase().includes(q)
        );
      })
      .filter((s) => !paymentFilter || s.payment_method === paymentFilter)
      .filter((s) => !statusFilter || (s.status ?? "completed") === statusFilter)
      .filter((s) => !cashierFilter || s.cashier_name === cashierFilter)
      .filter((s) => min === null || (s.total_amount ?? 0) >= min)
      .filter((s) => max === null || (s.total_amount ?? 0) <= max)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sales, dateFilter, search, paymentFilter, statusFilter, cashierFilter, amountMin, amountMax]);

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, s) => sum + (s.total_amount ?? 0), 0),
    [filtered],
  );

  const hasActiveFilters =
    !!search || !!paymentFilter || !!statusFilter || !!cashierFilter || !!amountMin || !!amountMax;

  function clearFilters() {
    setSearch("");
    setPaymentFilter("");
    setStatusFilter("");
    setCashierFilter("");
    setAmountMin("");
    setAmountMax("");
  }

  const filterTabs: { key: DateFilter; label: string }[] = [
    { key: "today", label: dict.filterToday },
    { key: "7d", label: dict.filter7d },
    { key: "30d", label: dict.filter30d },
    { key: "all", label: dict.filterAll },
  ];

  const selectClass =
    "rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";

  return (
    <div className={`flex h-full min-h-0 flex-col gap-4${embedded ? " px-6 pb-6 pt-4" : ""}`}>
      {/* Page header — hidden when embedded (the Documents page supplies its own). */}
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dict.title}</h1>
          <p className="text-sm text-slate-500">{dict.subtitle}</p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ReportKpiCard
          label={dict.kpiTotalBills}
          value={String(filtered.length)}
          icon={<Receipt className="h-5 w-5" />}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
        />
        <ReportKpiCard
          label={dict.kpiRevenue}
          value={baht(totalRevenue)}
          icon={<Wallet className="h-5 w-5" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDateFilter(tab.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  dateFilter === tab.key
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-violet-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict.searchFull}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition ${
              showMore || hasActiveFilters
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {dict.moreFilters}
          </button>
        </div>

        {showMore && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm field-slide-in">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {dict.filterPayment}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">{dict.filterAllPayments}</option>
                {payments.map((p) => (
                  <option key={p} value={p}>
                    {paymentLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {dict.filterStatus}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">{dict.filterAllStatuses}</option>
                <option value="completed">{dict.statusCompleted}</option>
                <option value="partially_returned">{dict.statusPartiallyReturned}</option>
                <option value="fully_returned">{dict.statusFullyReturned}</option>
                <option value="voided">{dict.statusVoided}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {dict.filterCashier}
              <select
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">{dict.filterAllCashiers}</option>
                {cashiers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {dict.amountMin}
              <input
                type="number"
                min={0}
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className={`${selectClass} w-28 tabular-nums`}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              {dict.amountMax}
              <input
                type="number"
                min={0}
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className={`${selectClass} w-28 tabular-nums`}
                placeholder="∞"
              />
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                {dict.clearFilters}
              </button>
            )}
            <p className="ml-auto self-center text-xs text-slate-400">{dict.skuSearchHint}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="flex h-48 items-center justify-center text-sm text-rose-500">
            {dict.errorLoad}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <History className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">{dict.empty}</p>
              <p className="mt-0.5 text-sm text-slate-400">{dict.emptyDesc}</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto pretty-scroll">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <Th>{dict.colTime}</Th>
                  <Th>{dict.colBillNo}</Th>
                  <Th>{dict.colCustomer}</Th>
                  <Th className="hidden lg:table-cell">{dict.colCashier}</Th>
                  <Th center className="hidden sm:table-cell">{dict.colItems}</Th>
                  <Th right>{dict.colTotal}</Th>
                  <Th className="hidden md:table-cell">{dict.colPayment}</Th>
                  <Th center>{dict.colStatus}</Th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sale) => {
                  const st = statusMeta(sale.status ?? "completed", dict);
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedId(sale.id)}
                      className="cursor-pointer transition-colors hover:bg-violet-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="block text-xs text-slate-400">{fmtDate(sale.created_at)}</span>
                        <span className="font-medium tabular-nums">{fmtTime(sale.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {sale.sale_number ?? sale.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="max-w-[160px] px-4 py-3">
                        <span className="block truncate text-slate-800">
                          {sale.customer_name || dict.generalCustomer}
                        </span>
                      </td>
                      <td className="hidden max-w-[140px] px-4 py-3 lg:table-cell">
                        <span className="block truncate text-slate-600">{sale.cashier_name || "—"}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-center sm:table-cell">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
                          {sale.total_items ?? sale.items?.length ?? 0} {dict.itemsSuffix}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {baht(sale.total_amount)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {paymentLabel(sale.payment_method ?? "")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(sale.id);
                          }}
                          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                        >
                          {dict.viewDetail}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <SaleDetailModal saleId={selectedId} dict={dict} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function Th({
  children,
  center,
  right,
  className,
}: {
  children: React.ReactNode;
  center?: boolean;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        center ? "text-center" : right ? "text-right" : "text-left"
      } ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function TableSkeleton() {
  return (
    <div className="h-full overflow-hidden p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-3.5">
          <div className="h-8 w-12 shrink-0 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-slate-100" />
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
          <div className="hidden h-4 w-20 shrink-0 animate-pulse rounded bg-slate-100 sm:block" />
          <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-slate-100" />
          <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="h-7 w-20 shrink-0 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
