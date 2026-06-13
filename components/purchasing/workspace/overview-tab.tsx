"use client";

import { useMemo } from "react";
import {
  Ban,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Package,
  PackageCheck,
  ShoppingCart,
  Timer,
} from "lucide-react";

import type { PurchaseOrder } from "@/services/purchases";
import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { QueryErrorState } from "@/components/ui/query-error-state";

import {
  formatDate,
  formatTHB,
  isOpenPo,
  poProgress,
  template,
  type WorkspaceNav,
  type WsDict,
} from "./workspace-shared";
import { EmptyState, LoadingRows } from "./workspace-ui";

type Props = {
  dict: WsDict;
  locale: string;
  pos: PurchaseOrder[];
  posLoading: boolean;
  posError: boolean;
  onRetryPos: () => void;
  pendingReview: GoodsReceiptDraft[];
  pendingReviewTotal: number;
  pendingLoading: boolean;
  confirmed: GoodsReceiptDraft[];
  confirmedLoading: boolean;
  /** Epoch ms for the first day of the current month (stable per mount). */
  monthStart: number;
  nav: WorkspaceNav;
};

const RECENT_LIMIT = 5;

function tsOf(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function OverviewTab({
  dict,
  locale,
  pos,
  posLoading,
  posError,
  onRetryPos,
  pendingReview,
  pendingReviewTotal,
  pendingLoading,
  confirmed,
  confirmedLoading,
  monthStart,
  nav,
}: Props) {
  const kpis = useMemo(() => {
    let open = 0;
    let notReceived = 0;
    let partial = 0;
    let cancelled = 0;
    for (const po of pos) {
      if (po.status === "pending") notReceived += 1;
      if (po.status === "partial") partial += 1;
      if (po.status === "cancelled") cancelled += 1;
      if (isOpenPo(po)) open += 1;
    }
    // `confirmed` is the most-recent page of confirmed receipts (capped server-side;
    // ordered by received_at DESC). The month count is exact unless a store confirms
    // more than that cap within a single month — a documented high-volume ceiling,
    // since the receipts endpoint has no server-side date filter.
    const completedThisMonth = confirmed.filter(
      (r) => tsOf(r.confirmed_at ?? r.received_at) >= monthStart,
    ).length;
    return { open, notReceived, partial, cancelled, completedThisMonth };
  }, [pos, confirmed, monthStart]);

  const awaitingReceipt = useMemo(
    () =>
      pos
        .filter((po) => isOpenPo(po) && poProgress(po).outstanding > 0)
        .slice(0, RECENT_LIMIT),
    [pos],
  );
  const awaitingApproval = pendingReview.slice(0, RECENT_LIMIT);
  const recentConfirmed = useMemo(
    () => [...confirmed].sort((a, b) => tsOf(b.confirmed_at ?? b.received_at) - tsOf(a.confirmed_at ?? a.received_at)).slice(0, RECENT_LIMIT),
    [confirmed],
  );

  if (posError) return <QueryErrorState locale={locale} onRetry={onRetryPos} className="m-4" />;

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <ReportKpiCard
          label={dict.kpiOpenPo}
          value={posLoading ? "…" : String(kpis.open)}
          icon={<ShoppingCart className="h-5 w-5" />}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          emphasis
        />
        <ReportKpiCard
          label={dict.kpiNotReceived}
          value={posLoading ? "…" : String(kpis.notReceived)}
          icon={<Timer className="h-5 w-5" />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <ReportKpiCard
          label={dict.kpiPartial}
          value={posLoading ? "…" : String(kpis.partial)}
          icon={<Package className="h-5 w-5" />}
          iconBg="bg-sky-100"
          iconColor="text-sky-600"
        />
        <ReportKpiCard
          label={dict.kpiPendingApproval}
          value={pendingLoading ? "…" : String(pendingReviewTotal)}
          icon={<ClipboardCheck className="h-5 w-5" />}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
        />
        <ReportKpiCard
          label={dict.kpiCompletedMonth}
          value={confirmedLoading ? "…" : String(kpis.completedThisMonth)}
          icon={<CalendarCheck className="h-5 w-5" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <ReportKpiCard
          label={dict.kpiCancelledPo}
          value={posLoading ? "…" : String(kpis.cancelled)}
          icon={<Ban className="h-5 w-5" />}
          iconBg="bg-slate-100"
          iconColor="text-slate-500"
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentCard
          title={dict.recentAwaitingReceipt}
          viewAll={dict.viewAll}
          onViewAll={() => nav.switchTab("pending-receiving")}
          loading={posLoading}
          loadingLabel={dict.loading}
          empty={awaitingReceipt.length === 0}
          emptyLabel={dict.emptyPendingReceiving}
          emptyIcon={<Package className="h-7 w-7" />}
        >
          {awaitingReceipt.map((po) => {
            const prog = poProgress(po);
            return (
              <RecentRow
                key={po.id}
                onClick={() => nav.receiveForPo(po.id)}
                primary={po.order_number}
                secondary={po.supplier?.name ?? dict.none}
                meta={template(dict.progressReceived, { received: prog.received, ordered: prog.ordered })}
              />
            );
          })}
        </RecentCard>

        <RecentCard
          title={dict.recentAwaitingApproval}
          viewAll={dict.viewAll}
          onViewAll={() => nav.switchTab("pending-approval")}
          loading={pendingLoading}
          loadingLabel={dict.loading}
          empty={awaitingApproval.length === 0}
          emptyLabel={dict.emptyPendingApproval}
          emptyIcon={<ClipboardCheck className="h-7 w-7" />}
        >
          {awaitingApproval.map((r) => (
            <RecentRow
              key={r.id}
              onClick={() => nav.openReceipt(r.id)}
              primary={r.document_no}
              secondary={r.supplier_name ?? dict.none}
              meta={`${r.total_items} ${dict.itemsUnit}`}
            />
          ))}
        </RecentCard>

        <RecentCard
          title={dict.recentConfirmed}
          viewAll={dict.viewAll}
          onViewAll={() => nav.switchTab("completed")}
          loading={confirmedLoading}
          loadingLabel={dict.loading}
          empty={recentConfirmed.length === 0}
          emptyLabel={dict.emptyCompleted}
          emptyIcon={<PackageCheck className="h-7 w-7" />}
        >
          {recentConfirmed.map((r) => (
            <RecentRow
              key={r.id}
              onClick={() => nav.openReceipt(r.id)}
              primary={r.document_no}
              secondary={r.supplier_name ?? dict.none}
              meta={`${formatTHB(r.total_amount)} · ${formatDate(locale, r.confirmed_at ?? r.received_at)}`}
            />
          ))}
        </RecentCard>
      </div>
    </div>
  );
}

function RecentCard({
  title,
  viewAll,
  onViewAll,
  loading,
  loadingLabel,
  empty,
  emptyLabel,
  emptyIcon,
  children,
}: {
  title: string;
  viewAll: string;
  onViewAll: () => void;
  loading: boolean;
  loadingLabel: string;
  empty: boolean;
  emptyLabel: string;
  emptyIcon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-violet-50 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          {viewAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>
      {loading ? (
        <LoadingRows label={loadingLabel} />
      ) : empty ? (
        <EmptyState icon={emptyIcon} title={emptyLabel} />
      ) : (
        <div className="divide-y divide-violet-50">{children}</div>
      )}
    </section>
  );
}

function RecentRow({
  primary,
  secondary,
  meta,
  onClick,
}: {
  primary: string;
  secondary: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-violet-50/50"
    >
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold text-violet-700">{primary}</p>
        <p className="truncate text-xs text-slate-500">{secondary}</p>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-slate-500">{meta}</span>
    </button>
  );
}
