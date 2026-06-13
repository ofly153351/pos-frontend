"use client";

import { useRef } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import type { SaleDiscountType } from "@/types/sale";
import type { Product } from "@/types/product";
import { formatAmount, getCartLine } from "./utils/sales-calculations";

type CartItem = {
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

type CartSummary = {
  subtotal: number;
  discountAmount: number;
};

type Dict = {
  cartTitle: string;
  netTotalLabel: string;
  discountBillLabel: string;
  couponLabel: string;
  totalDiscountLabel: string;
  summary: { subtotalLabel: string };
  notePlaceholder: string;
  emptyCart: string;
  discountTypeLabel: string;
  removeItemButton: string;
  checkoutButton: string;
};

type Props = {
  cart: CartItem[];
  cartSummary: CartSummary;
  settlementTotal: number;
  vatAmount: number;
  applyVat: boolean;
  billDiscount: string;
  billDiscountType: "amount" | "percent";
  couponCode: string;
  totalDiscountAmount: number;
  showNoteField: boolean;
  note: string;
  isPending: boolean;
  isBillDiscountFieldOpen: boolean;
  cartScrollRef: React.RefObject<HTMLDivElement | null>;
  dictionary: Dict;
  onClearCart: () => void;
  onToggleBillDiscountField: () => void;
  onBillDiscountTypeChange: (type: "amount" | "percent") => void;
  onCouponChange: (v: string) => void;
  onOpenAmountNumpad: (field: "bill_discount" | "paid_amount") => void;
  onNoteChange: (v: string) => void;
  onOpenDiscountEditor: (productId: string) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onOpenQuantityNumpad: (productId: string, current: number, max: number) => void;
  onOpenCheckout: () => void;
  onLongPressStart: (product: Product) => void;
  onLongPressEnd: () => void;
};

export function CartPanel({
  cart,
  cartSummary,
  settlementTotal,
  vatAmount,
  applyVat,
  billDiscount,
  billDiscountType,
  couponCode,
  totalDiscountAmount,
  showNoteField,
  note,
  isPending,
  isBillDiscountFieldOpen,
  cartScrollRef,
  dictionary,
  onClearCart,
  onToggleBillDiscountField,
  onBillDiscountTypeChange,
  onCouponChange,
  onOpenAmountNumpad,
  onNoteChange,
  onOpenDiscountEditor,
  onUpdateQuantity,
  onOpenQuantityNumpad,
  onOpenCheckout,
  onLongPressStart,
  onLongPressEnd,
}: Props) {
  return (
    <div className="xl:h-full xl:min-h-0">
      <section className="flex h-full min-h-[74dvh] flex-col rounded-[2rem] border border-violet-100 bg-white shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:min-h-[78dvh]">
        {/* Header */}
        <div className="shrink-0 border-b border-violet-50 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {dictionary.cartTitle}
              </h2>
              <p className="mt-0.5 text-xs text-violet-400">
                {cart.length > 0
                  ? `สินค้า ${cart.length} รายการ`
                  : "ยังไม่มีสินค้า"}
              </p>
            </div>
            <button
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-100"
              onClick={onClearCart}
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              ล้าง
            </button>
          </div>

          {/* Summary bar */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-2.5">
            <button
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              onClick={onToggleBillDiscountField}
              type="button"
            >
              <ChevronDown
                className={`h-4 w-4 text-violet-400 transition-transform ${isBillDiscountFieldOpen ? "rotate-180" : ""}`}
              />
              {dictionary.netTotalLabel}
            </button>
            <span className="text-lg font-bold text-violet-700">
              ฿{formatAmount(settlementTotal)}
            </span>
          </div>

          {/* Collapsible discount/note area */}
          {isBillDiscountFieldOpen && (
            <div className="mt-2 space-y-2 rounded-xl border border-violet-100 bg-white p-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-violet-700">
                  {dictionary.discountBillLabel}
                </label>
                <div className="flex items-stretch">
                  <input
                    className="w-full rounded-l-xl rounded-r-none border border-r-0 border-violet-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    inputMode="decimal"
                    min="0"
                    onClick={() => onOpenAmountNumpad("bill_discount")}
                    onFocus={(e) => e.target.blur()}
                    placeholder="0.00"
                    readOnly
                    value={billDiscount}
                  />
                  <div className="flex items-center gap-1 rounded-r-xl border border-violet-200 bg-violet-100/60 p-1">
                    <button
                      className={`h-7 min-w-8 rounded-lg px-2 text-[11px] font-extrabold transition ${billDiscountType === "amount" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-white/90"}`}
                      onClick={() => onBillDiscountTypeChange("amount")}
                      type="button"
                    >
                      ฿
                    </button>
                    <button
                      className={`h-7 min-w-8 rounded-lg px-2 text-[11px] font-extrabold transition ${billDiscountType === "percent" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-white/90"}`}
                      onClick={() => onBillDiscountTypeChange("percent")}
                      type="button"
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-violet-700">
                  {dictionary.couponLabel}
                </label>
                <input
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs uppercase tracking-wide text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => onCouponChange(e.target.value)}
                  placeholder={dictionary.couponLabel}
                  value={couponCode}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{dictionary.summary.subtotalLabel}</span>
                <span>฿{formatAmount(cartSummary.subtotal)}</span>
              </div>
              {totalDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600">
                  <span>{dictionary.totalDiscountLabel}</span>
                  <span>-฿{formatAmount(totalDiscountAmount)}</span>
                </div>
              )}
              {applyVat && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>VAT 7%</span>
                  <span>฿{formatAmount(vatAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Note field */}
          {showNoteField && (
            <textarea
              className="mt-2 min-h-16 w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={dictionary.notePlaceholder}
              value={note}
            />
          )}
        </div>

        {/* ── Cart items (scrollable) ── */}
        <div
          className="pretty-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3"
          ref={cartScrollRef}
        >
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map((item) => {
                const line = getCartLine(item);
                return (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3.5 shadow-sm select-none"
                    onPointerDown={() => onLongPressStart(item.product)}
                    onPointerUp={onLongPressEnd}
                    onPointerLeave={onLongPressEnd}
                    onPointerCancel={onLongPressEnd}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {/* Thumbnail */}
                    {item.product.image_url ? (
                      <img
                        alt={item.product.name}
                        className="h-10 w-10 shrink-0 rounded-xl border border-violet-100 object-cover"
                        loading="lazy"
                        src={item.product.image_url}
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-600">
                        {item.product.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Name + unit price */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        ฿{formatAmount(line.unitPrice)}/{item.product.product_unit_name ?? item.product.unit_type ?? "หน่วย"}
                      </p>
                    </div>

                    {/* Discount button */}
                    <button
                      className="shrink-0 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
                      onClick={() => onOpenDiscountEditor(item.product.id)}
                      title={dictionary.discountTypeLabel}
                      type="button"
                    >
                      {line.lineDiscount > 0 ? (
                        <span className="text-emerald-600">
                          -฿{formatAmount(line.lineDiscount)}
                        </span>
                      ) : (
                        "%ลด"
                      )}
                    </button>

                    {/* Qty stepper */}
                    <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-violet-200">
                      <button
                        className="flex h-8 w-8 items-center justify-center text-sm font-bold text-violet-600 transition hover:bg-violet-50"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        type="button"
                      >
                        −
                      </button>
                      <input
                        className="h-8 w-8 bg-white text-center text-sm font-bold text-slate-900 outline-none"
                        inputMode="numeric"
                        max={item.product.total_stock ?? 0}
                        min="1"
                        onClick={() =>
                          onOpenQuantityNumpad(
                            item.product.id,
                            item.quantity,
                            item.product.total_stock ?? 0,
                          )
                        }
                        onFocus={(e) => e.target.blur()}
                        pattern="[0-9]*"
                        readOnly
                        type="number"
                        value={item.quantity}
                      />
                      <button
                        className="flex h-8 w-8 items-center justify-center text-sm font-bold text-violet-600 transition hover:bg-violet-50"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="shrink-0 w-20 text-right text-sm font-bold text-slate-900">
                      ฿{formatAmount(line.lineTotal)}
                    </span>

                    {/* Delete */}
                    <button
                      aria-label={dictionary.removeItemButton}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => onUpdateQuantity(item.product.id, 0)}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/40 text-sm text-violet-300">
              {dictionary.emptyCart}
            </div>
          )}
        </div>

        {/* ── Checkout button ── */}
        <div className="shrink-0 border-t border-violet-50 px-4 pb-4 pt-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.3)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cart.length === 0 || isPending}
            onClick={onOpenCheckout}
            type="button"
          >
            {dictionary.checkoutButton} (฿{formatAmount(settlementTotal)})
            <span className="ml-1">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
