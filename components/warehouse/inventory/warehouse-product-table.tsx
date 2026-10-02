"use client";

import { ArrowLeftRight, MapPin } from "lucide-react";

import { formatNumber, totalBarClass } from "./utils";
import { StatusChip } from "./status-chip";
import type { WarehouseProductTableProps } from "./types";




function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "—";
}

export function WarehouseProductTable({ dict, items, onViewLocations, onTransfer, canTransfer }: WarehouseProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3 font-semibold text-center ">{dict.colImage}</th>
            <th className="px-3 py-3 font-semibold">{dict.colProduct}</th>
            <th className="px-3 py-3 font-semibold">{dict.colStock}</th>
            <th className="px-3 py-3 font-semibold">{dict.colStatus}</th>
            <th className="px-3 py-3 text-right font-semibold">{dict.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const maxRef = Math.max(item.total_stock, item.min_stock * 2, 1);
            const pct = Math.min(100, Math.round((item.total_stock / maxRef) * 100));
            return (
              <tr
                key={item.product_id}
                onClick={() => onViewLocations(item)}
                className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-violet-50/40"
              >
                <td className="px-3 py-2.5 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-500">
                    {initials(item.product_name)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewLocations(item);
                    }}
                    className="block max-w-[260px] truncate text-left font-semibold text-slate-800 hover:text-violet-700"
                  >
                    {item.product_name}
                  </button>
                  {item.unit ? <span className="text-xs text-slate-400">{item.unit}</span> : null}
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {item.sku || "—"} · {item.barcode || dict.noBarcode} · {item.category_name || dict.uncategorized}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="grid min-w-[360px] grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{dict.colReady}</div>
                      <div className="mt-0.5 font-semibold tabular-nums text-emerald-600">{formatNumber(item.ready_stock)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{dict.colStorage}</div>
                      <div className="mt-0.5 tabular-nums text-slate-500">{formatNumber(item.storage_stock)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{dict.colTotal}</div>
                      <div className="mt-0.5 font-bold tabular-nums text-slate-900">{formatNumber(item.total_stock)}</div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${totalBarClass(item.status)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StatusChip dict={dict} status={item.status} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewLocations(item);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {dict.viewLocations}
                    </button>
                    {canTransfer ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransfer(item);
                        }}
                        aria-label={dict.actionTransfer}
                        title={dict.actionTransfer}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
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
  );
}
