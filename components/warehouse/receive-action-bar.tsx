"use client";

import { CheckCircle2, Loader2, Printer, RotateCcw, Save, Send } from "lucide-react";

import type { GoodsReceiptStatus } from "@/types/goods-receipt";
import { formatCurrency, formatNumber, type ReceiveDictionary } from "./receive-shared";

export type ReceiveActionBarProps = {
  dictionary: ReceiveDictionary;
  status: GoodsReceiptStatus;
  canManage: boolean;
  busy: boolean;
  hasItems: boolean;
  hasBlockingError: boolean;
  totalLines: number;
  totalQty: number;
  totalCost: number;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onReopen: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPrint: () => void;
};

const BTN = "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BTN} bg-violet-600 text-white hover:bg-violet-700`;
const GHOST = `${BTN} border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`;
const DANGER = `${BTN} border border-rose-200 bg-white text-rose-600 hover:bg-rose-50`;

export function ReceiveActionBar({
  dictionary: t,
  status,
  canManage,
  busy,
  hasItems,
  hasBlockingError,
  totalLines,
  totalQty,
  totalCost,
  onSaveDraft,
  onSubmit,
  onReopen,
  onConfirm,
  onCancel,
  onPrint,
}: ReceiveActionBarProps) {
  const spinner = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null;
  const confirmDisabled = busy || !hasItems || hasBlockingError;

  return (
    <div className="sticky bottom-0 z-20 -mx-2 mt-2 border-t border-violet-100 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:mx-0 sm:rounded-b-3xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
          <span><strong className="text-slate-800">{formatNumber(totalLines)}</strong> {t.itemCountLabel}</span>
          <span>{t.colActualReceived}: <strong className="text-slate-800">{formatNumber(totalQty)}</strong></span>
          <span>{t.labelTotal}: <strong className="text-slate-800">{formatCurrency(totalCost)}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" ? (
            <>
              <button className={GHOST} disabled={busy} onClick={onSaveDraft} type="button">
                {spinner ?? <Save className="h-4 w-4" />}{t.actionSaveDraft}
              </button>
              <button className={canManage ? GHOST : PRIMARY} disabled={busy || !hasItems || hasBlockingError} onClick={onSubmit} type="button">
                {spinner ?? <Send className="h-4 w-4" />}{busy ? t.actionSubmitting : t.actionSubmit}
              </button>
              {canManage ? (
                <>
                  <button className={DANGER} disabled={busy} onClick={onCancel} type="button">{t.actionCancel}</button>
                  <button className={PRIMARY} disabled={confirmDisabled} onClick={onConfirm} type="button">
                    {spinner ?? <CheckCircle2 className="h-4 w-4" />}{busy ? t.actionConfirming : t.actionConfirmReceipt}
                  </button>
                </>
              ) : null}
            </>
          ) : status === "pending_review" ? (
            canManage ? (
              <>
                <button className={GHOST} disabled={busy} onClick={onReopen} type="button">
                  {spinner ?? <RotateCcw className="h-4 w-4" />}{t.actionReopen}
                </button>
                <button className={DANGER} disabled={busy} onClick={onCancel} type="button">{t.actionCancel}</button>
                <button className={PRIMARY} disabled={confirmDisabled} onClick={onConfirm} type="button">
                  {spinner ?? <CheckCircle2 className="h-4 w-4" />}{busy ? t.actionConfirming : t.actionConfirmReceipt}
                </button>
              </>
            ) : (
              <span className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">{t.readonlyPending}</span>
            )
          ) : status === "confirmed" ? (
            <>
              <span className="text-sm text-slate-500">{t.readonlyConfirmed}</span>
              <button className={GHOST} disabled={busy} onClick={onPrint} type="button"><Printer className="h-4 w-4" />{t.actionPrint}</button>
            </>
          ) : (
            <span className="text-sm text-slate-500">{t.readonlyCancelled}</span>
          )}
        </div>
      </div>
    </div>
  );
}
