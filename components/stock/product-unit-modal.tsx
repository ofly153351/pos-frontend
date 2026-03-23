"use client";

import type { UnitsDictionary } from "@/components/stock/types";

type ProductUnitModalProps = {
  activeLabel: string;
  cancelLabel: string;
  description: string;
  error: string;
  isActive: boolean;
  isEditing: boolean;
  isOpen: boolean;
  isPending: boolean;
  name: string;
  onActiveChange: (checked: boolean) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
  unitsDictionary: UnitsDictionary;
};

export function ProductUnitModal({
  activeLabel,
  cancelLabel,
  description,
  error,
  isActive,
  isEditing,
  isOpen,
  isPending,
  name,
  onActiveChange,
  onClose,
  onDescriptionChange,
  onNameChange,
  onSubmit,
  submitLabel,
  title,
  unitsDictionary,
}: ProductUnitModalProps) {
  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/35 p-4 backdrop-blur-[1px] transition-opacity duration-400 md:p-8 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[35vw] ${
          isOpen ? "translate-x-0" : "translate-x-[105%]"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <button
            className="rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            {cancelLabel}
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {unitsDictionary.nameLabel}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              onChange={(event) => onNameChange(event.target.value)}
              value={name}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {unitsDictionary.descriptionLabel}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              onChange={(event) => onDescriptionChange(event.target.value)}
              value={description}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              checked={isActive}
              onChange={(event) => onActiveChange(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium text-slate-700">{activeLabel}</span>
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
              disabled={isPending}
              type="submit"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
