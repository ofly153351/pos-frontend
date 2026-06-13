"use client";

import { Coins } from "lucide-react";

import { formatCurrency, type ReceiveDictionary } from "./receive-shared";

export type ReceiveFinancialSummaryProps = {
  dictionary: ReceiveDictionary;
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
};

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? "text-lg font-black text-violet-700" : "font-semibold text-slate-900"}`}>{value}</span>
    </div>
  );
}

export function ReceiveFinancialSummary({ dictionary: t, subtotal, discount, vatAmount, total }: ReceiveFinancialSummaryProps) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Coins className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-900">{t.sectionFinancial}</h2>
      </div>
      <div className="space-y-2.5">
        <Line label={t.labelSubtotal} value={formatCurrency(subtotal)} />
        <Line label={t.labelDiscount} value={`- ${formatCurrency(discount)}`} />
        <Line label={t.labelVatAmount} value={formatCurrency(vatAmount)} />
        <div className="my-2 border-t border-dashed border-violet-100" />
        <Line label={t.labelTotal} strong value={formatCurrency(total)} />
      </div>
    </section>
  );
}
