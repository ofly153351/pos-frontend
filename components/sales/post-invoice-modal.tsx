"use client";

import { Loader2, Truck } from "lucide-react";

type Props = {
  docId: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PostInvoiceModal({ docId, isPending, onConfirm, onClose }: Props) {
  if (!docId) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30 smooth-fade"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white p-6 shadow-2xl smooth-fade-up">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Truck className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">สร้างใบส่งของ?</h3>
              <p className="text-xs text-slate-500">ใบส่งของ / ใบกำกับภาษี จากใบแจ้งหนี้นี้</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-violet-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-violet-50"
            >
              ข้าม
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              สร้างใบส่งของ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
