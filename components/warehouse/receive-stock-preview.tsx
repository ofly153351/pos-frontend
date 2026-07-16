"use client";

import { Loader2, TrendingUp } from "lucide-react";

import type { GoodsReceiptStockImpact } from "@/types/goods-receipt";
import { formatNumber, formatSignedNumber, type ReceiveDictionary } from "./receive-shared";

export type ReceiveStockPreviewProps = {
  dictionary: ReceiveDictionary;
  stockPreview: GoodsReceiptStockImpact[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function ReceiveStockPreview({ dictionary: t, stockPreview, isLoading, isError, error }: ReceiveStockPreviewProps) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-900">{t.labelStockPreview}</h2>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-violet-700">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
          {t.stateLoadingStockPreview}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
          {error instanceof Error ? error.message : t.emptyStockPreview}
        </div>
      ) : stockPreview.length ? (
        <>
          <p className="mb-3 text-xs font-medium text-slate-500">{t.stateStockImpactSummary.replace("{count}", String(stockPreview.length))}</p>
          <div className="overflow-x-auto rounded-2xl border border-violet-100">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">{t.labelProduct}</th>
                  <th className="px-4 py-2.5">{t.labelLocation}</th>
                  <th className="px-4 py-2.5 text-center">{t.stockBefore}</th>
                  <th className="px-4 py-2.5 text-center">{t.stockChange}</th>
                  <th className="px-4 py-2.5 text-center">{t.stockAfter}</th>
                </tr>
              </thead>
              <tbody>
                {stockPreview.map((p) => (
                  <tr key={p.item_id} className="border-b border-violet-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.product_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.location_name}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-slate-600">{formatNumber(p.before_quantity)}</td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-emerald-600">{formatSignedNumber(p.quantity)}</td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-slate-900">{formatNumber(p.after_quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">{t.emptyStockPreview}</div>
      )}
    </section>
  );
}
