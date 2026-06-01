"use client";

type Dict = {
  quantityNumpadTitle: string;
  quantityNumpadClear: string;
  quantityNumpadBackspace: string;
  quantityNumpadCancel: string;
  quantityNumpadApply: string;
};

type Props = {
  value: string;
  isOpen: boolean;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDigit: (d: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onCancel: () => void;
  onApply: () => void;
  dictionary: Dict;
};

export function QuantityNumpad({
  value,
  isOpen,
  onInputChange,
  onInputKeyDown,
  onDigit,
  onClear,
  onBackspace,
  onCancel,
  onApply,
  dictionary,
}: Props) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 transition-opacity duration-300 sm:items-center ${
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm rounded-[1.75rem] bg-white p-5 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-y-0" : "translate-y-8"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-950">
          {dictionary.quantityNumpadTitle}
        </h3>
        <input
          autoFocus
          className="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          inputMode="numeric"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          pattern="[0-9]*"
          type="text"
          value={value}
        />

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
              key={digit}
              onClick={() => onDigit(digit)}
              type="button"
            >
              {digit}
            </button>
          ))}
          <button
            className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onClear}
            type="button"
          >
            {dictionary.quantityNumpadClear}
          </button>
          <button
            className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-base font-semibold text-slate-900 transition hover:bg-violet-50"
            onClick={() => onDigit("0")}
            type="button"
          >
            0
          </button>
          <button
            className="rounded-lg border border-violet-100 bg-white px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onBackspace}
            type="button"
          >
            {dictionary.quantityNumpadBackspace}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="rounded-lg border border-violet-200 px-3 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onCancel}
            type="button"
          >
            {dictionary.quantityNumpadCancel}
          </button>
          <button
            className="rounded-lg bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            onClick={onApply}
            type="button"
          >
            {dictionary.quantityNumpadApply}
          </button>
        </div>
      </div>
    </div>
  );
}
