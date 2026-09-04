"use client";

import Link from "next/link";
import { AlertTriangle, Minus, Package, Plus, X } from "lucide-react";

import {
  formatCurrency,
  formatNumber,
  type LocationResolveStatus,
  type ReceiveDictionary,
  type ReceiveRowStatus,
} from "./receive-shared";

export type EditorRowView = {
  key: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  discountValue: string;
  hasPo: boolean;
  ordered: number;
  prevReceived: number;
  remaining: number;
  /** null = no PO verdict is applicable (confirmed/cancelled doc, or no PO link). */
  difference: number | null;
  status: ReceiveRowStatus;
  lineTotal: number;
  overReceipt: boolean;
  error: string;
  // Per-line receiving location: chosen id + resolved label/status for the picker.
  locationId: string;
  locationName: string;
  locationStatus: LocationResolveStatus;
  locationWarning: string;
  productEditHref: string;
};

const STATUS_STYLE: Record<ReceiveRowStatus, string> = {
  complete: "bg-emerald-100 text-emerald-700",
  short: "bg-amber-100 text-amber-700",
  over: "bg-violet-100 text-violet-700",
  not_received: "bg-slate-100 text-slate-500",
  received: "bg-emerald-100 text-emerald-700",
};

export type ReceiveItemsTableProps = {
  dictionary: ReceiveDictionary;
  rows: EditorRowView[];
  hasPo: boolean;
  editable: boolean;
  locationOptions: { id: string; label: string }[];
  onQtyChange: (key: string, value: string) => void;
  onQtyBlur: (key: string) => void;
  onStep: (key: string, delta: number) => void;
  onUnitCostChange: (key: string, value: string) => void;
  onLocationChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
};

function statusLabel(t: ReceiveDictionary, status: ReceiveRowStatus) {
  switch (status) {
    case "complete": return t.statusComplete;
    case "short": return t.statusShort;
    case "over": return t.statusOver;
    case "not_received": return t.statusNotReceived;
    case "received": return t.statusReceived;
  }
}

function LocationCell({
  t,
  row,
  editable,
  options,
  onChange,
}: {
  t: ReceiveDictionary;
  row: EditorRowView;
  editable: boolean;
  options: { id: string; label: string }[];
  onChange: (key: string, value: string) => void;
}) {
  // Read-only (pending/confirmed/cancelled): show the resolved label or a dash.
  if (!editable) {
    if (row.locationStatus === "ok") {
      return (
        <span className="inline-flex max-w-[220px] items-center rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
          {row.locationName}
        </span>
      );
    }
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (row.locationStatus === "resolving") {
    return <span className="text-xs text-slate-400">…</span>;
  }

  const unresolved =
    row.locationStatus === "missing" || row.locationStatus === "unavailable" || row.locationStatus === "wrong_warehouse";
  // Only show a value the picker actually offers; an invalid/stale id falls back to
  // the placeholder until the reconcile pass clears it.
  const value = options.some((o) => o.id === row.locationId) ? row.locationId : "";

  return (
    <div className="flex min-w-[180px] flex-col gap-1">
      <select
        className={`w-full rounded-lg border bg-white px-2 py-1.5 text-xs font-medium outline-none focus:ring-2 ${
          unresolved
            ? "border-amber-300 text-amber-800 focus:border-amber-400 focus:ring-amber-100"
            : "border-violet-200 text-slate-700 focus:border-violet-400 focus:ring-violet-100"
        }`}
        onChange={(e) => onChange(row.key, e.target.value)}
        value={value}
      >
        <option value="">{t.placeholderLocation}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {unresolved && options.length === 0 ? (
        <Link
          className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-amber-700 transition hover:underline"
          href={row.productEditHref}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t.actionGoSetProductLocation}
        </Link>
      ) : null}
    </div>
  );
}

export function ReceiveItemsTable({
  dictionary: t,
  rows,
  hasPo,
  editable,
  locationOptions,
  onQtyChange,
  onQtyBlur,
  onStep,
  onUnitCostChange,
  onLocationChange,
  onRemove,
}: ReceiveItemsTableProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-violet-100 px-6 py-4">
        <Package className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-900">{t.sectionItems}</h2>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="m-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-12 text-center text-sm text-slate-500">{t.emptyItems}</div>
      ) : (
        <>
          <p className="px-6 pt-4 text-xs text-slate-500">{t.autoLocationHint}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{t.labelProduct}</th>
                  <th className="px-3 py-3">{t.colDestination}</th>
                  <th className="px-3 py-3 text-right">{t.colOrdered}</th>
                  <th className="px-3 py-3 text-right">{t.colPrevReceived}</th>
                  <th className="px-3 py-3 text-right">{t.colRemaining}</th>
                  <th className="px-3 py-3 text-center">{t.colActualReceived}</th>
                  <th className="px-3 py-3 text-right">{t.colDifference}</th>
                  <th className="px-3 py-3 text-right">{t.labelUnitPrice}</th>
                  <th className="px-3 py-3 text-right">{t.labelLineTotal}</th>
                  <th className="px-3 py-3 text-center">{t.colStatus}</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const qty = Number(row.quantity || 0);
                  return (
                    <tr key={row.key} className={`border-b border-violet-50 last:border-0 align-top ${row.overReceipt ? "bg-rose-50/40" : "hover:bg-violet-50/30"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.productName}</p>
                        {row.sku ? <p className="text-xs text-slate-400">{row.sku}</p> : null}
                        {row.error ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                            <AlertTriangle className="h-3 w-3" />{row.error}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <LocationCell editable={editable} onChange={onLocationChange} options={locationOptions} row={row} t={t} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{hasPo ? formatNumber(row.ordered) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{hasPo ? formatNumber(row.prevReceived) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{hasPo ? formatNumber(row.remaining) : "—"}</td>
                      <td className="px-3 py-3">
                        {editable ? (
                          <div className="flex items-center justify-center gap-1">
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40" disabled={qty <= 0} onClick={() => onStep(row.key, -1)} type="button">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input className="w-16 rounded-lg border border-violet-200 bg-white py-1.5 text-center text-sm font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" inputMode="numeric" min="0" onBlur={() => onQtyBlur(row.key)} onChange={(e) => onQtyChange(row.key, e.target.value)} value={row.quantity} />
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => onStep(row.key, 1)} type="button">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-center font-semibold text-slate-900">{formatNumber(qty)}</p>
                        )}
                      </td>
                      <td className={`px-3 py-3 text-right tabular-nums font-semibold ${row.difference === null ? "text-slate-400" : row.difference < 0 ? "text-amber-600" : row.difference > 0 ? "text-violet-600" : "text-slate-500"}`}>
                        {hasPo && row.difference !== null ? (row.difference > 0 ? `+${formatNumber(row.difference)}` : formatNumber(row.difference)) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {editable ? (
                          <input className="w-24 rounded-lg border border-violet-200 bg-white px-2 py-1 text-right text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" min="0" onChange={(e) => onUnitCostChange(row.key, e.target.value)} step="0.01" type="number" value={row.unitPrice} />
                        ) : (
                          <span className="text-slate-600">{formatCurrency(Number(row.unitPrice || 0))}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(row.lineTotal)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{statusLabel(t, row.status)}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {editable ? (
                          <button aria-label={t.actionRemoveAttachment} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" onClick={() => onRemove(row.key)} type="button">
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
