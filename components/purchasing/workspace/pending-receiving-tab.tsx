"use client";

import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";

import type { PurchaseOrder } from "@/services/purchases";
import { QueryErrorState } from "@/components/ui/query-error-state";

import {
  formatDate,
  isOpenPo,
  poProgress,
  template,
  type WorkspaceNav,
  type WsDict,
} from "./workspace-shared";
import { EmptyState, LoadingRows, ProgressBar, SupplierText } from "./workspace-ui";

type Props = {
  dict: WsDict;
  locale: string;
  canOperate: boolean;
  pos: PurchaseOrder[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

export function PendingReceivingTab({ dict, locale, canOperate, pos, loading, error, onRetry, nav }: Props) {
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Only POs that can still receive stock AND have outstanding quantity.
  const receivable = useMemo(
    () => pos.filter((po) => isOpenPo(po) && poProgress(po).outstanding > 0),
    [pos],
  );

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const po of receivable) {
      if (po.supplier?.id && po.supplier.name) map.set(po.supplier.id, po.supplier.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [receivable]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receivable.filter((po) => {
      if (supplierId && po.supplier?.id !== supplierId) return false;
      if (!q) return true;
      return (
        po.order_number.toLowerCase().includes(q) ||
        (po.supplier?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [receivable, supplierId, search]);

  if (error) return <QueryErrorState locale={locale} onRetry={onRetry} className="m-4" />;

  const isFiltered = supplierId !== "" || search.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          <option value="">{dict.filterAllSuppliers}</option>
          {supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
          <EmptyState title={isFiltered ? dict.emptyFiltered : dict.emptyPendingReceiving} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/40 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">{dict.thPoNumber}</th>
                    <th className="px-4 py-3">{dict.thSupplier}</th>
                    <th className="px-4 py-3">{dict.thOrderDate}</th>
                    <th className="px-4 py-3 text-right">{dict.thOrderedQty}</th>
                    <th className="px-4 py-3 text-right">{dict.thReceivedQty}</th>
                    <th className="px-4 py-3 text-right">{dict.thOutstandingQty}</th>
                    <th className="px-4 py-3">{dict.thProgress}</th>
                    <th className="px-5 py-3 text-right">{dict.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {visible.map((po) => {
                    const prog = poProgress(po);
                    return (
                      <tr key={po.id} className="transition-colors hover:bg-violet-50/40">
                        <td className="px-5 py-3.5">
                          <span className="nums text-xs font-semibold text-violet-700 whitespace-nowrap">{po.order_number}</span>
                        </td>
                        <td className="max-w-[200px] px-4 py-3.5">
                          <SupplierText name={po.supplier?.name} fallback={dict.none} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(locale, po.created_at)}</td>
                        <td className="px-4 py-3.5 text-right nums text-sm text-slate-700">{prog.ordered}</td>
                        <td className="px-4 py-3.5 text-right nums text-sm text-slate-700">{prog.received}</td>
                        <td className="px-4 py-3.5 text-right nums text-sm font-bold text-amber-700">
                          {prog.outstanding}
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
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={!canOperate}
                            onClick={() => nav.receiveForPo(po.id)}
                            title={canOperate ? undefined : dict.receiveDenied}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Package className="h-3.5 w-3.5" />
                            {po.status === "partial" ? dict.actReceiveRemaining : dict.actReceive}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-50 md:hidden">
              {visible.map((po) => {
                const prog = poProgress(po);
                return (
                  <div key={po.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="nums text-xs font-semibold text-violet-700">{po.order_number}</p>
                        <p className="truncate text-sm font-medium text-slate-800">{po.supplier?.name ?? dict.none}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                        {prog.outstanding} {dict.thOutstandingQty}
                      </span>
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
                    <button
                      type="button"
                      disabled={!canOperate}
                      onClick={() => nav.receiveForPo(po.id)}
                      title={canOperate ? undefined : dict.receiveDenied}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
                    >
                      <Package className="h-3.5 w-3.5" />
                      {po.status === "partial" ? dict.actReceiveRemaining : dict.actReceive}
                    </button>
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
