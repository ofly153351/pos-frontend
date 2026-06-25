"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Search, X, XCircle } from "lucide-react";

import { cancelPurchaseOrder, type PurchaseOrder } from "@/services/purchases";
import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/ui/query-error-state";

import {
  formatDate,
  formatTHB,
  isOpenPo,
  poProgress,
  template,
  type PurchaseOrderStatus,
  type WorkspaceNav,
  type WsDict,
} from "./workspace-shared";
import { EmptyState, LoadingRows, PoBadge, ProgressBar, SupplierText } from "./workspace-ui";

type StatusFilter = "all" | PurchaseOrderStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "partial", "completed", "cancelled"];

type Props = {
  dict: WsDict;
  locale: string;
  canOperate: boolean;
  canManage: boolean;
  pos: PurchaseOrder[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export function PurchaseOrdersTab({
  dict,
  locale,
  canOperate,
  canManage,
  pos,
  loading,
  error,
  onRetry,
  nav,
}: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const statusLabel = useMemo<Record<StatusFilter, string>>(
    () => ({
      all: dict.filterAllStatuses,
      pending: dict.poPending,
      partial: dict.poPartial,
      completed: dict.poCompleted,
      cancelled: dict.poCancelled,
    }),
    [dict],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos.filter((po) => {
      if (status !== "all" && po.status !== status) return false;
      if (!q) return true;
      return (
        po.order_number.toLowerCase().includes(q) ||
        (po.supplier?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [pos, status, search]);

  async function handleCancel(po: PurchaseOrder) {
    if (!window.confirm(dict.confirmCancelOrder)) return;
    setCancellingId(po.id);
    try {
      await cancelPurchaseOrder(po.id);
      await queryClient.invalidateQueries({ queryKey: ["workspace", "purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(`${dict.cancelOrderSuccess} — ${po.order_number}`);
    } catch {
      toast.error(dict.requestFailed);
    } finally {
      setCancellingId(null);
    }
  }

  if (error) return <QueryErrorState locale={locale} onRetry={onRetry} className="m-4" />;

  const isFiltered = status !== "all" || search.trim() !== "";

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((key) => {
            const active = status === key;
            const count = key === "all" ? pos.length : pos.filter((p) => p.status === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-violet-50"
                }`}
              >
                {statusLabel[key]}
                {count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 text-[10px] leading-none ${
                      active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.searchPo}
            className="h-9 w-full rounded-lg border border-violet-200 bg-white pl-9 pr-8 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={dict.resetFilters}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        {loading ? (
          <LoadingRows label={dict.loading} />
        ) : visible.length === 0 ? (
          <EmptyState title={isFiltered ? dict.emptyFiltered : dict.emptyPo} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/40 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">{dict.thPoNumber}</th>
                    <th className="px-4 py-3">{dict.thSupplier}</th>
                    <th className="px-4 py-3">{dict.thOrderDate}</th>
                    <th className="px-4 py-3 text-center">{dict.thItems}</th>
                    <th className="px-4 py-3 text-right">{dict.thOrderedValue}</th>
                    <th className="px-4 py-3">{dict.thProgress}</th>
                    <th className="px-4 py-3">{dict.thStatus}</th>
                    <th className="px-5 py-3 text-right">{dict.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {visible.map((po) => {
                    const prog = poProgress(po);
                    const actionable = isOpenPo(po);
                    return (
                      <tr
                        key={po.id}
                        className={`transition-colors hover:bg-violet-50/40 ${po.status === "cancelled" ? "opacity-60" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="nums text-xs font-semibold text-violet-700 whitespace-nowrap">{po.order_number}</span>
                        </td>
                        <td className="max-w-[200px] px-4 py-3.5">
                          <SupplierText name={po.supplier?.name} fallback={dict.none} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(locale, po.created_at)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            <Package className="h-3 w-3" />
                            {po.items?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="nums text-sm font-bold text-slate-900">{formatTHB(po.total_cost)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <ProgressBar
                            progress={prog}
                            caption={template(dict.progressReceived, {
                              received: prog.received,
                              ordered: prog.ordered,
                            })}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <PoBadge dict={dict} status={po.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {actionable ? (
                              <button
                                type="button"
                                disabled={!canOperate}
                                onClick={() => nav.receiveForPo(po.id)}
                                title={canOperate ? undefined : dict.receiveDenied}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Package className="h-3.5 w-3.5" />
                                {po.status === "partial" ? dict.actReceiveRemaining : dict.actReceive}
                              </button>
                            ) : null}
                            {actionable && canManage ? (
                              <button
                                type="button"
                                disabled={cancellingId === po.id}
                                onClick={() => handleCancel(po)}
                                title={dict.actCancelOrder}
                                aria-label={dict.actCancelOrder}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-violet-50 md:hidden">
              {visible.map((po) => {
                const prog = poProgress(po);
                const actionable = isOpenPo(po);
                return (
                  <div key={po.id} className={`p-4 ${po.status === "cancelled" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="nums text-xs font-semibold text-violet-700">{po.order_number}</p>
                        <p className="truncate text-sm font-medium text-slate-800">{po.supplier?.name ?? dict.none}</p>
                      </div>
                      <PoBadge dict={dict} status={po.status} />
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar
                        progress={prog}
                        caption={template(dict.progressReceived, {
                          received: prog.received,
                          ordered: prog.ordered,
                        })}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{formatDate(locale, po.created_at)}</span>
                      <span className="nums text-sm font-bold text-slate-900">{formatTHB(po.total_cost)}</span>
                    </div>
                    {actionable ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={!canOperate}
                          onClick={() => nav.receiveForPo(po.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40"
                        >
                          <Package className="h-3.5 w-3.5" />
                          {po.status === "partial" ? dict.actReceiveRemaining : dict.actReceive}
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            disabled={cancellingId === po.id}
                            onClick={() => handleCancel(po)}
                            aria-label={dict.actCancelOrder}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-400 transition hover:bg-rose-50 disabled:opacity-40"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
