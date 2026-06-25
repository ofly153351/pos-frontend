"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Search, X } from "lucide-react";

import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import { QueryErrorState } from "@/components/ui/query-error-state";

import { formatDate, type WorkspaceNav, type WsDict } from "./workspace-shared";
import { EmptyState, LoadingRows, SupplierText } from "./workspace-ui";

type Props = {
  dict: WsDict;
  locale: string;
  items: GoodsReceiptDraft[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export function PendingApprovalTab({ dict, locale, items, loading, error, onRetry, nav }: Props) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.document_no.toLowerCase().includes(q) ||
        (r.supplier_name ?? "").toLowerCase().includes(q) ||
        (r.purchase_order_no ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  if (error) return <QueryErrorState locale={locale} onRetry={onRetry} className="m-4" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
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
        {loading ? (
          <LoadingRows label={dict.loading} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-7 w-7" />}
            title={search.trim() ? dict.emptyFiltered : dict.emptyPendingApproval}
          />
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
                    <th className="px-4 py-3">{dict.thSubmittedBy}</th>
                    <th className="px-4 py-3">{dict.thReceiveDate}</th>
                    <th className="px-4 py-3 text-center">{dict.thItemCount}</th>
                    <th className="px-5 py-3 text-right">{dict.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {visible.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-amber-50/40">
                      <td className="px-5 py-3.5">
                        <span className="nums text-xs font-semibold text-violet-700 whitespace-nowrap">{r.document_no}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {r.purchase_order_no ? (
                          <span className="nums whitespace-nowrap">{r.purchase_order_no}</span>
                        ) : (
                          <span className="text-slate-400">{dict.none}</span>
                        )}
                      </td>
                      <td className="max-w-[180px] px-4 py-3.5">
                        <SupplierText name={r.supplier_name} fallback={dict.none} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.warehouse_name ?? dict.none}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.created_by_name ?? dict.none}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(locale, r.received_at)}</td>
                      <td className="px-4 py-3.5 text-center nums text-sm text-slate-700">{r.total_items}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => nav.openReceipt(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          {dict.actReview}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-50 md:hidden">
              {visible.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="nums text-xs font-semibold text-violet-700">{r.document_no}</p>
                      <p className="truncate text-sm font-medium text-slate-800">{r.supplier_name ?? dict.none}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{r.total_items} {dict.itemsUnit}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {r.warehouse_name ?? dict.none} · {r.created_by_name ?? dict.none} · {formatDate(locale, r.received_at)}
                  </div>
                  <button
                    type="button"
                    onClick={() => nav.openReceipt(r.id)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {dict.actReview}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
