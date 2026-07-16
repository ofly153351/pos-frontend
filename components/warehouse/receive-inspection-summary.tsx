"use client";

import { AlertTriangle, ClipboardCheck } from "lucide-react";

import { formatNumber, type ReceiveDictionary } from "./receive-shared";

export type InspectionMismatch = {
  productId: string;
  productName: string;
  ordered: number;
  received: number;
  difference: number;
  kind: "short" | "over";
};

export type InspectionCounts = {
  totalLines: number;
  totalOrdered: number;
  totalReceived: number;
  complete: number;
  short: number;
  over: number;
  notReceived: number;
};

export type ReceiveInspectionSummaryProps = {
  dictionary: ReceiveDictionary;
  hasPo: boolean;
  counts: InspectionCounts;
  mismatches: InspectionMismatch[];
  hasOver: boolean;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function ReceiveInspectionSummary({ dictionary: t, hasPo, counts, mismatches, hasOver }: ReceiveInspectionSummaryProps) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <ClipboardCheck className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-900">{t.sectionInspection}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <Stat label={t.inspectionTotalLines} value={formatNumber(counts.totalLines)} />
        {hasPo ? <Stat label={t.inspectionTotalOrdered} value={formatNumber(counts.totalOrdered)} /> : null}
        <Stat label={t.inspectionTotalReceived} value={formatNumber(counts.totalReceived)} tone="text-violet-700" />
        {hasPo ? <Stat label={t.inspectionComplete} value={formatNumber(counts.complete)} tone="text-emerald-600" /> : null}
        {hasPo ? <Stat label={t.inspectionShort} value={formatNumber(counts.short)} tone="text-amber-600" /> : null}
        {hasPo ? <Stat label={t.inspectionOver} value={formatNumber(counts.over)} tone="text-violet-600" /> : null}
        {hasPo ? <Stat label={t.inspectionNotReceived} value={formatNumber(counts.notReceived)} tone="text-slate-500" /> : null}
      </div>

      {hasOver ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm font-medium text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <span>{t.inspectionOverWarning}</span>
        </div>
      ) : null}

      {mismatches.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-bold text-amber-800">{t.inspectionMismatchTitle.replace("{count}", String(mismatches.length))}</p>
          <ul className="mt-2 space-y-1.5">
            {mismatches.map((m) => (
              <li key={m.productId} className="flex flex-wrap items-center gap-x-2 text-xs text-slate-700">
                <span className="font-medium text-slate-900">{m.productName}</span>
                <span className="text-slate-400">·</span>
                <span>{t.colOrdered} {formatNumber(m.ordered)}</span>
                <span className="text-slate-400">/</span>
                <span>{t.colActualReceived} {formatNumber(m.received)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.kind === "short" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                  {m.kind === "short" ? t.statusShort : t.statusOver} {m.kind === "short" ? formatNumber(Math.abs(m.difference)) : `+${formatNumber(m.difference)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-slate-400">{t.inspectionReceivedNote}</p>
    </section>
  );
}
