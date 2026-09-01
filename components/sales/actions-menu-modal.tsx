"use client";

import { listParkedBills } from "@/services/sales";
import type { ParkedBill } from "@/services/sales";

type Dict = {
  actionsLabel: string;
  closeReceiptButton: string;
  noteLabel: string;
  holdBillLabel: string;
  restoreBillLabel: string;
  clearCartButton: string;
};

type Props = {
  isOpen: boolean;
  showNoteField: boolean;
  onClose: () => void;
  onToggleNote: () => void;
  onHoldBill: () => void;
  onOpenRestoreDrawer: (bills: ParkedBill[]) => void;
  onClearCart: () => void;
  dictionary: Dict;
};

export function ActionsMenuModal({
  isOpen,
  showNoteField,
  onClose,
  onToggleNote,
  onHoldBill,
  onOpenRestoreDrawer,
  onClearCart,
  dictionary,
}: Props) {
  if (!isOpen) {
    return null;
  }

  async function handleRestoreClick() {
    try {
      const response = await listParkedBills();
      onOpenRestoreDrawer(response.data ?? []);
    } catch {
      onOpenRestoreDrawer([]);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
      <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-2xl smooth-fade-up">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">
            {dictionary.actionsLabel}
          </h3>
          <button
            className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onClose}
            type="button"
          >
            {dictionary.closeReceiptButton}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              showNoteField
                ? "bg-violet-50 text-violet-700"
                : "text-violet-700 hover:bg-violet-50"
            }`}
            onClick={() => {
              onToggleNote();
              onClose();
            }}
            type="button"
          >
            <span>{dictionary.noteLabel}</span>
            <span>{showNoteField ? "✓" : ""}</span>
          </button>
          <button
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
            onClick={() => {
              onHoldBill();
              onClose();
            }}
            type="button"
          >
            <span>{dictionary.holdBillLabel}</span>
          </button>
          <button
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
            onClick={handleRestoreClick}
            type="button"
          >
            <span>{dictionary.restoreBillLabel}</span>
          </button>
          <div className="my-1 border-t border-violet-100" />
          <button
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            onClick={onClearCart}
            type="button"
          >
            {dictionary.clearCartButton}
          </button>
        </div>
      </div>
    </div>
  );
}
