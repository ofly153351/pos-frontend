"use client";

type Dict = {
  holdBillLabel: string;
  holdBillPlaceholderLabel: string;
  holdBillCancelLabel: string;
  holdBillConfirmLabel: string;
  emptyCart: string;
};

type Props = {
  isOpen: boolean;
  label: string;
  onLabelChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  dictionary: Dict;
};

export function HoldBillModal({ isOpen, label, onLabelChange, onCancel, onConfirm, dictionary }: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
      <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl smooth-fade-up">
        <h3 className="text-lg font-semibold text-slate-950">
          {dictionary.holdBillLabel}
        </h3>
        <div className="mt-4">
          <input
            className="w-full rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={dictionary.holdBillPlaceholderLabel}
            type="text"
            value={label}
          />
        </div>
        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-lg border border-violet-200 px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onCancel}
            type="button"
          >
            {dictionary.holdBillCancelLabel}
          </button>
          <button
            className="flex-1 rounded-lg bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            onClick={onConfirm}
            type="button"
          >
            {dictionary.holdBillConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
