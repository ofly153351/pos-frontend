"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { listGoodsReceipts } from "@/services/goods-receipts";
import type { GoodsReceiptDraft, GoodsReceiptStatus } from "@/types/goods-receipt";
import { QueryErrorState } from "@/components/ui/query-error-state";

import { formatDate, formatTHB, template, type WorkspaceNav, type WsDict } from "./workspace-shared";
import { EmptyState, LoadingRows, ReceiptBadge, SupplierText } from "./workspace-ui";

type StatusFilter = "all" | GoodsReceiptStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "draft", "pending_review", "confirmed", "cancelled"];
const PAGE_SIZE = 20;

type Props = {
  dict: WsDict;
  locale: string;
  nav: WorkspaceNav;
};

export function GoodsReceiptsTab({ dict, locale, nav }: Props) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["workspace", "goods-receipts", status, page],
    queryFn: async () =>
      (
        await listGoodsReceipts({
          page,
          limit: PAGE_SIZE,
          status: status === "all" ? undefined : status,
        })
      ).data,
  });

  const pageData = query.data;

  const statusLabel = useMemo<Record<StatusFilter, string>>(
    () => ({
      all: dict.filterAllStatuses,
      draft: dict.rcDraft,
      pending_review: dict.rcPendingReview,
      confirmed: dict.rcConfirmed,
      cancelled: dict.rcCancelled,
    }),
    [dict],
  );

  // Search filters the currently loaded page client-side (status/pagination are server-side).
  const visible = useMemo(() => {
    const rows = pageData?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.document_no.toLowerCase().includes(q) ||
        (r.supplier_name ?? "").toLowerCase().includes(q) ||
        (r.purchase_order_no ?? "").toLowerCase().includes(q),
    );
  }, [pageData, search]);

  function changeStatus(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  function actionLabel(r: GoodsReceiptDraft): string {
    return r.status === "draft" ? dict.actContinueEditing : dict.actView;
  }

  if (query.isError) {
    return <QueryErrorState locale={locale} onRetry={() => query.refetch()} className="m-4" />;
  }

  const totalPages = pageData?.total_pages ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((key) => {
            const active = status === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => changeStatus(key)}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-violet-50"
                }`}
              >
                {statusLabel[key]}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.searchReceipt}
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
        {query.isLoading ? (
          <LoadingRows label={dict.loading} />
        ) : visible.length === 0 ? (
          <EmptyState title={search.trim() ? dict.emptyFiltered : dict.emptyGoodsReceipts} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/40 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">{dict.thReceiptNumber}</th>
                    <th className="px-4 py-3">{dict.thPurchaseOrder}</th>
                    <th className="px-4 py-3">{dict.thSupplier}</th>
                    <th className="px-4 py-3">{dict.thWarehouse}</th>
                    <th className="px-4 py-3">{dict.thReceiveDate}</th>
                    <th className="px-4 py-3 text-center">{dict.thItemCount}</th>
                    <th className="px-4 py-3 text-right">{dict.thValue}</th>
                    <th className="px-4 py-3">{dict.thStatus}</th>
                    <th className="px-4 py-3">{dict.thCreatedBy}</th>
                    <th className="px-5 py-3 text-right">{dict.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {visible.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-violet-50/40">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-violet-700">{r.document_no}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {r.purchase_order_no ? (
                          <span className="font-mono">{r.purchase_order_no}</span>
                        ) : (
                          <span className="text-slate-400">{dict.none}</span>
                        )}
                      </td>
                      <td className="max-w-[180px] px-4 py-3.5">
                        <SupplierText name={r.supplier_name} fallback={dict.none} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.warehouse_name ?? dict.none}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(locale, r.received_at)}</td>
                      <td className="px-4 py-3.5 text-center font-mono text-sm text-slate-700">{r.total_items}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-900">
                        {formatTHB(r.total_amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <ReceiptBadge dict={dict} status={r.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{r.created_by_name ?? dict.none}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => nav.openReceipt(r.id)}
                          className="inline-flex items-center rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:shadow"
                        >
                          {actionLabel(r)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-50 md:hidden">
              {visible.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => nav.openReceipt(r.id)}
                  className="block w-full p-4 text-left transition hover:bg-violet-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-violet-700">{r.document_no}</p>
                      <p className="truncate text-sm font-medium text-slate-800">{r.supplier_name ?? dict.none}</p>
                    </div>
                    <ReceiptBadge dict={dict} status={r.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {r.warehouse_name ?? dict.none} · {formatDate(locale, r.received_at)}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900">{formatTHB(r.total_amount)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pageData && pageData.total_pages > 1 ? (
          <div className="flex items-center justify-between border-t border-violet-50 px-4 py-3">
            <p className="text-xs text-slate-500">{template(dict.pageOf, { page, total: totalPages })}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!pageData.has_prev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {dict.prev}
              </button>
              <button
                type="button"
                disabled={!pageData.has_next}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 disabled:opacity-40"
              >
                {dict.next}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
