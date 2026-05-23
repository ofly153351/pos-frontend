"use client";

import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { ReceiveDictionary } from "./receive-shared";

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

export function ReceiptStatusBadge({
  dictionary,
  receipt,
}: {
  dictionary: ReceiveDictionary;
  receipt: GoodsReceiptDraft;
}) {
  const badgeClassName =
    receipt.status === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : receipt.status === "cancelled"
        ? "bg-rose-100 text-rose-700"
        : "bg-violet-100 text-violet-700";
  const label =
    receipt.status === "confirmed"
      ? dictionary.badgeConfirmed
      : receipt.status === "cancelled"
        ? dictionary.badgeCancelled
        : dictionary.badgeDraft;

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`}>{label}</span>
  );
}
