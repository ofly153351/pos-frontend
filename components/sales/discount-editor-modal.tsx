"use client";

import type { SaleDiscountType } from "@/types/sale";
import type { CartItem } from "./utils/sales-calculations";
import { formatAmount, getCartLine } from "./utils/sales-calculations";

type Dict = {
  closeReceiptButton: string;
  discountTypeLabel: string;
  discountAmountLabel: string;
  discountPercentLabel: string;
  discountValueLabel: string;
  quantityNumpadClear: string;
  quantityNumpadBackspace: string;
  quantityNumpadApply: string;
  discountScopeLabel: string;
  discountScopeWholeLine: string;
  discountScopePerUnit: string;
  discountPreviewUnitPriceLabel: string;
  discountPreviewQtyLabel: string;
  discountPreviewLineSubtotalLabel: string;
  discountPreviewLineDiscountLabel: string;
  discountPreviewPerUnitDiscountLabel: string;
  discountPreviewTotalDiscountLabel: string;
  discountPreviewAfterDiscountLabel: string;
};

type Props = {
  item: CartItem | null;
  onClose: () => void;
  onDiscountTypeChange: (productId: string, type: SaleDiscountType) => void;
  onDiscountScopeChange: (productId: string, scope: "line" | "unit") => void;
  onInputChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onClear: () => void;
  onBackspace: () => void;
  onApply: () => void;
  dictionary: Dict;
};

export function DiscountEditorModal({
  item,
  onClose,
  onDiscountTypeChange,
  onDiscountScopeChange,
  onInputChange,
  onInputKeyDown,
  onDigit,
  onDecimal,
  onClear,
  onBackspace,
  onApply,
  dictionary,
}: Props) {
  if (!item) {
    return null;
  }

  const line = getCartLine(item);
  const isPercent = item.discountType === "percent";
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? Math.max(rawValue, 0) : 0;

  // Preview rows depend on type + scope
  const previewRows: { label: string; value: string; isDiscount?: boolean; isBold?: boolean }[] = [];

  if (isPercent) {
    previewRows.push(
      { label: dictionary.discountPreviewLineSubtotalLabel, value: `฿${formatAmount(line.lineSubtotal)}` },
      { label: `${dictionary.discountTypeLabel} ${discountValue}%`, value: `-฿${formatAmount(line.lineDiscount)}`, isDiscount: true },
      { label: dictionary.discountPreviewAfterDiscountLabel, value: `฿${formatAmount(line.lineTotal)}`, isBold: true },
    );
  } else if (item.discountScope === "line") {
    const effectiveDiscount = Math.min(discountValue, line.lineSubtotal);
    previewRows.push(
      { label: dictionary.discountPreviewUnitPriceLabel, value: `฿${formatAmount(line.unitPrice)}` },
      { label: dictionary.discountPreviewQtyLabel, value: String(item.quantity) },
      { label: dictionary.discountPreviewLineSubtotalLabel, value: `฿${formatAmount(line.lineSubtotal)}` },
      { label: dictionary.discountPreviewLineDiscountLabel, value: `-฿${formatAmount(effectiveDiscount)}`, isDiscount: true },
      { label: dictionary.discountPreviewAfterDiscountLabel, value: `฿${formatAmount(line.lineTotal)}`, isBold: true },
    );
  } else {
    // per-unit scope
    const discountPerUnit = Math.min(discountValue, line.unitPrice);
    const totalDiscount = discountPerUnit * item.quantity;
    previewRows.push(
      { label: dictionary.discountPreviewUnitPriceLabel, value: `฿${formatAmount(line.unitPrice)}` },
      { label: dictionary.discountPreviewQtyLabel, value: String(item.quantity) },
      { label: dictionary.discountPreviewPerUnitDiscountLabel, value: `-฿${formatAmount(discountPerUnit)}`, isDiscount: true },
      { label: dictionary.discountPreviewTotalDiscountLabel, value: `-฿${formatAmount(totalDiscount)}`, isDiscount: true },
      { label: dictionary.discountPreviewAfterDiscountLabel, value: `฿${formatAmount(line.lineTotal)}`, isBold: true },
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
      <div className="w-full max-w-sm rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl smooth-fade-up">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">
            {item.product.name}
          </h3>
          <button
            className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onClose}
            type="button"
          >
            {dictionary.closeReceiptButton}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Discount type: บาท / % */}
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {dictionary.discountTypeLabel}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "฿", label: dictionary.discountAmountLabel, value: "amount" as const },
                { icon: "%", label: dictionary.discountPercentLabel, value: "percent" as const },
              ].map((option) => (
                <button
                  aria-label={option.label}
                  key={option.value}
                  className={`rounded-lg border px-3 py-2 text-base font-bold transition ${
                    item.discountType === option.value
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  }`}
                  onClick={() => onDiscountTypeChange(item.product.id, option.value)}
                  type="button"
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Discount scope: ลดทั้งรายการ / ลดต่อชิ้น (hidden for percent) */}
          {!isPercent && (
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {dictionary.discountScopeLabel}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: dictionary.discountScopeWholeLine, value: "line" as const },
                  { label: dictionary.discountScopePerUnit, value: "unit" as const },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      item.discountScope === option.value
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                    onClick={() => onDiscountScopeChange(item.product.id, option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {dictionary.discountValueLabel}
            </span>
            <input
              autoFocus
              className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              inputMode="decimal"
              min="0"
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="0"
              value={item.discountValue}
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
                key={digit}
                onClick={() => onDigit(digit)}
                type="button"
              >
                {digit}
              </button>
            ))}
            <button
              className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              onClick={onClear}
              type="button"
            >
              {dictionary.quantityNumpadClear}
            </button>
            <button
              className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
              onClick={() => onDigit("0")}
              type="button"
            >
              0
            </button>
            <button
              className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-violet-50"
              onClick={onDecimal}
              type="button"
            >
              .
            </button>
          </div>

          <button
            className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onBackspace}
            type="button"
          >
            {dictionary.quantityNumpadBackspace}
          </button>

          {/* Live preview */}
          {discountValue > 0 && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
              <dl className="space-y-1">
                {previewRows.map((row, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2">
                    <dt className={`text-xs ${row.isBold ? "font-semibold text-slate-700" : "text-slate-500"}`}>
                      {row.label}
                    </dt>
                    <dd className={`nums text-xs ${row.isDiscount ? "font-semibold text-emerald-600" : row.isBold ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <button
            className="w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
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
