"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";

import type { CreateReturnInput } from "@/services/sales";
import type { Sale, SaleItem } from "@/types/sale";
import type { SalesHistoryDict } from "./sales-history-dict";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function effectiveUnitPrice(item: SaleItem): number {
  if (item.line_total != null && item.quantity > 0) return item.line_total / item.quantity;
  return item.unit_price ?? 0;
}

// Stable per-line key — prefer the sale_item id (two lines can share a product).
function lineKey(item: SaleItem): string {
  return item.id ?? item.product_id;
}

function remainingQty(item: SaleItem): number {
  return Math.max(0, item.quantity - (item.returned_quantity ?? 0));
}

export function ReturnModal({
  sale,
  dict,
  onClose,
  onConfirm,
}: {
  sale: Sale;
  dict: SalesHistoryDict;
  onClose: () => void;
  onConfirm: (input: CreateReturnInput) => Promise<void>;
}) {
  const items: SaleItem[] = sale.items ?? [];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalRefund = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = quantities[lineKey(item)] ?? 0;
        return sum + qty * effectiveUnitPrice(item);
      }, 0),
    [items, quantities],
  );

  const hasSelected = Object.values(quantities).some((q) => q > 0);
  // A bill is returnable only if at least one line still has units left.
  const anyReturnable = items.some((item) => remainingQty(item) > 0);

  function setQty(key: string, value: number, max: number) {
    const clamped = Math.min(max, Math.max(0, Math.round(value)));
    setQuantities((prev) => ({ ...prev, [key]: clamped }));
    if (error) setError("");
  }

  async function handleConfirm() {
    if (!hasSelected) { setError(dict.returnNoItemSelected); return; }
    const payloadItems = items
      .filter((item) => (quantities[lineKey(item)] ?? 0) > 0)
      .map((item) => ({
        sale_item_id: item.id,
        product_id: item.product_id,
        quantity: quantities[lineKey(item)],
      }));
    const input: CreateReturnInput = {
      refund_method: payMethod,
      reason: note.trim() || undefined,
      items: payloadItems,
    };
    setLoading(true);
    try {
      await onConfirm(input);
    } finally {
      setLoading(false);
    }
  }

  const billNo = sale.sale_number ?? sale.id.slice(0, 8).toUpperCase();
  const customer = sale.customer_name ?? dict.generalCustomer;
  const billTotal = sale.total_amount ?? 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm smooth-fade"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl smooth-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-600 to-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <RotateCcw className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{dict.returnConfirmTitle}</h2>
              <p className="text-xs text-violet-200">{dict.returnModalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!loading) onClose(); }}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
            aria-label={dict.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bill info */}
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm">
          <span className="text-slate-500">{dict.returnBillLabel}</span>
          <span className="font-semibold text-slate-900">{billNo}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">{dict.detailCustomer}</span>
          <span className="font-medium text-slate-800">{customer}</span>
          <span className="nums ml-auto font-semibold text-violet-700">฿{fmt(billTotal)}</span>
        </div>

        {/* Items table */}
        <div className="max-h-[420px] overflow-y-auto pretty-scroll">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{dict.noItems}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-2 pl-5 pr-2 text-left text-xs font-medium text-slate-400">{dict.thProduct}</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">{dict.thUnitPrice}</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-slate-400">{dict.returnThSold}</th>
                  <th className="py-2 pl-2 pr-5 text-center text-xs font-medium text-slate-400">{dict.returnThReturnQty}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const key = lineKey(item);
                  const sold = item.quantity;
                  const alreadyReturned = item.returned_quantity ?? 0;
                  const max = remainingQty(item);
                  const qty = quantities[key] ?? 0;
                  const selected = qty > 0;
                  const exhausted = max <= 0;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-slate-50 transition ${
                        exhausted ? "opacity-50" : selected ? "bg-violet-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-2.5 pl-5 pr-2">
                        <span className="font-medium text-slate-900">{item.product_name}</span>
                        {item.sku && (
                          <span className="ml-1.5 text-xs text-slate-400">{item.sku}</span>
                        )}
                      </td>
                      <td className="nums px-2 py-2.5 text-right text-slate-700">
                        ฿{fmt(effectiveUnitPrice(item))}
                      </td>
                      <td className="nums px-2 py-2.5 text-right text-slate-500">
                        {sold}
                        {alreadyReturned > 0 && (
                          <span className="ml-1 text-xs text-amber-600">−{alreadyReturned}</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-2 pr-5">
                        {exhausted ? (
                          <div className="flex justify-center">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                              {dict.returnFullyDone}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(key, qty - 1, max)}
                              disabled={qty === 0}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={max}
                              value={qty}
                              onChange={(e) => setQty(key, Number(e.target.value), max)}
                              className="nums w-12 rounded-lg border border-slate-200 px-1 py-0.5 text-center text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(key, qty + 1, max)}
                              disabled={qty >= max}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment method + refund total */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {dict.returnPayMethod} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="cash">{dict.paymentCash}</option>
                <option value="transfer">{dict.paymentTransfer}</option>
                <option value="card">{dict.paymentCard}</option>
                <option value="qr">{dict.paymentQr}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">{dict.returnTotalRefund}</label>
            <div className="nums flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-violet-700">
              ฿{fmt(totalRefund)}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="px-5 pt-3 pb-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">{dict.returnReasonLabel}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={dict.returnReasonPlaceholder}
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => { if (!loading) onClose(); }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
            disabled={loading}
          >
            {dict.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !hasSelected}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.returnConfirmBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
