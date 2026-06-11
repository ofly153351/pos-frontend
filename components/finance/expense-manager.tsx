"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Hash, Pencil, Plus, Scale, Tags, Trash2, Wallet, type LucideIcon } from "lucide-react";

import { getAuthSession } from "@/lib/auth-storage";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/services/api";
import { deleteExpense, getExpenseSummary, listExpenseCategories, listExpenses } from "@/services/expenses";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { CategoryValueBars, type CategoryValueRow } from "@/components/reports/category-value-bars";
import { BarTrendChart, type BarTrendDatum } from "@/components/reports/bar-trend-chart";
import { ExpenseFormModal } from "@/components/finance/expense-form-modal";
import type { ExpenseDictionary } from "@/components/finance/finance-types";
import type { Expense } from "@/types/expense";

type Props = { dictionary: ExpenseDictionary; locale: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ExpenseManager({ dictionary: t, locale }: Props) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role drives which action buttons show (backend enforces regardless).
  const [role, setRole] = useState("");
  useEffect(() => {
    async function loadRole() {
      setRole(getAuthSession()?.user?.role ?? "");
    }
    void loadRole();
  }, []);
  const canManage = role === "owner" || role === "manager" || role === "platform_admin";
  const canDelete = role === "owner" || role === "platform_admin";

  // Current-month window (snapshot once) for the table + the month label.
  const [monthRange] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    return { start, end };
  });

  const summaryQuery = useQuery({
    queryKey: ["expenses", "summary"],
    queryFn: async () => (await getExpenseSummary()).data,
  });
  const categoriesQuery = useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: async () => (await listExpenseCategories()).data,
  });
  const listQuery = useQuery({
    queryKey: ["expenses", "list", monthRange.start, monthRange.end],
    queryFn: async () => (await listExpenses({ from: monthRange.start, to: monthRange.end, limit: 200 })).data,
  });

  const summary = summaryQuery.data;
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const expenses = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  // ── Formatters ──
  const money = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n: number) => nf.format(n);
  }, [locale]);
  const int = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 });
    return (n: number) => nf.format(n);
  }, [locale]);
  const dtf = useMemo(() => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" }), [locale]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" }).format(new Date(`${monthRange.start}T00:00:00`)),
    [locale, monthRange.start],
  );
  const shortMonth = useMemo(() => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { month: "short" }), [locale]);

  const categoryRows = useMemo<CategoryValueRow[]>(() => {
    if (!summary) return [];
    const denom = summary.monthly_total || 1;
    return summary.by_category.map((c) => ({ name: c.name || "—", value: c.total, percent: (c.total / denom) * 100 }));
  }, [summary]);

  const trendData = useMemo<BarTrendDatum[]>(() => {
    if (!summary) return [];
    return summary.trend.map((m) => ({ label: shortMonth.format(new Date(`${m.month}-01T00:00:00`)), value: m.total }));
  }, [summary, shortMonth]);

  const listedTotal = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(expense: Expense) {
    setEditing(expense);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deletingId);
      toast.success(t.toast.deleted);
      setDeletingId(null);
      refetchAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.toast.error);
    } finally {
      setIsDeleting(false);
    }
  }

  function methodLabel(method: string) {
    return (t.method as Record<string, string>)[method] ?? method;
  }

  const summaryLoading = summaryQuery.isPending;

  type KpiItem = { label: string; value: string; icon: LucideIcon; iconBg: string; iconColor: string; hint?: string };
  const KPIS: KpiItem[] = summary
    ? [
        { label: t.kpi.monthlyTotal, value: money(summary.monthly_total), icon: Wallet, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
        { label: t.kpi.count, value: `${int(summary.monthly_count)} ${t.kpi.countSuffix}`, icon: Hash, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
        { label: t.kpi.topCategory, value: summary.top_category_name || t.kpi.none, icon: Tags, iconBg: "bg-amber-100", iconColor: "text-amber-600", hint: summary.top_category_total > 0 ? money(summary.top_category_total) : undefined },
        { label: t.kpi.average, value: money(summary.average_amount), icon: Scale, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
      ]
    : [];

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Header */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-500">{t.subtitle} · {monthLabel}</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700">
          <Plus className="h-4 w-4" /> {t.addBtn}
        </button>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-100" />)
          : KPIS.map((k) => (
              <ReportKpiCard key={k.label} label={k.label} value={k.value} icon={<k.icon className="h-5 w-5" />} iconBg={k.iconBg} iconColor={k.iconColor} hint={k.hint} />
            ))}
      </div>

      {/* Charts: by category + 6-month trend */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Tags className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.byCategory.title}</h3>
              <p className="text-[11px] text-slate-400">{t.byCategory.subtitle}</p>
            </div>
          </div>
          {summaryLoading ? (
            <div className="space-y-3.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-100" />)}</div>
          ) : (
            <CategoryValueBars rows={categoryRows} currency={money} emptyLabel={t.byCategory.empty} />
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><CalendarDays className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.trend.title}</h3>
              <p className="text-[11px] text-slate-400">{t.trend.subtitle}</p>
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-[200px] w-full rounded-lg bg-slate-100" />
          ) : (
            <BarTrendChart data={trendData} currency={money} emptyLabel={t.trend.empty} />
          )}
        </section>
      </div>

      {/* Expense table */}
      <section className="rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-slate-900">{t.table.title}</h3>
          {!canManage ? <span className="text-[11px] text-slate-400">{t.readOnlyNote}</span> : null}
        </div>
        {listQuery.isPending ? (
          <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg bg-slate-100" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-slate-400">{t.table.empty}</p>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">
              <Plus className="h-4 w-4" /> {t.addBtn}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-violet-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-3 font-bold">{t.table.colDate}</th>
                  <th className="px-4 py-3 font-bold">{t.table.colCategory}</th>
                  <th className="px-4 py-3 font-bold">{t.table.colDescription}</th>
                  <th className="px-4 py-3 text-right font-bold">{t.table.colAmount}</th>
                  <th className="px-4 py-3 font-bold">{t.table.colMethod}</th>
                  <th className="px-4 py-3 font-bold">{t.table.colRecorder}</th>
                  <th className="px-4 py-3 text-right font-bold">{t.table.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="transition hover:bg-violet-50/40">
                    <td className="px-4 py-3 text-sm text-slate-600">{dtf.format(new Date(e.expense_date))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{e.category_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[260px] truncate text-sm font-medium text-slate-800" title={e.description}>{e.description}</span>
                      {e.note ? <span className="block max-w-[260px] truncate text-[11px] text-slate-400" title={e.note}>{e.note}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-rose-600">{money(e.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{methodLabel(e.payment_method)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{e.created_by_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage ? (
                          <button type="button" onClick={() => openEdit(e)} title={t.actions.edit} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button type="button" onClick={() => setDeletingId(e.id)} title={t.actions.delete} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                        {!canManage && !canDelete ? <span className="text-[11px] text-slate-300">—</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50/60">
                  <td className="px-4 py-3 text-sm font-bold text-slate-700" colSpan={3}>{t.table.totalRow}</td>
                  <td className="px-4 py-3 text-right text-sm font-black tabular-nums text-slate-900">{money(listedTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <ExpenseFormModal
          dictionary={t}
          categories={categories}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={refetchAll}
          onCategoryCreated={() => queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] })}
        />
      ) : null}

      {/* Delete confirm */}
      {deletingId ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => !isDeleting && setDeletingId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"><Trash2 className="h-5 w-5" /></span>
                <p className="text-sm font-medium text-slate-700">{t.actions.deleteConfirm}</p>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" disabled={isDeleting} onClick={() => setDeletingId(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  {t.form.cancel}
                </button>
                <button type="button" disabled={isDeleting} onClick={confirmDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {isDeleting ? t.form.saving : t.actions.delete}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
