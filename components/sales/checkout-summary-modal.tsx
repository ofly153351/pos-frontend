"use client";

import { FileText, Loader2 } from "lucide-react";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import { formatCurrency, formatAmount, parsePaidAmountAsCeilInt } from "./utils/sales-calculations";

type Dict = {
  checkoutSectionTitle: string;
  closeReceiptButton: string;
  customerLabel: string;
  customerPlaceholder: string;
  customerTypeLabel: string;
  customerSettlementLabel: string;
  customerSettlementCashNow: string;
  customerSettlementInvoice: string;
  paymentMethodLabel: string;
  paymentMethodCashLabel: string;
  paymentMethodPromptPay: string;
  customerPaymentLabel: string;
  changeLabel: string;
  quickCashLabel: string;
  quickCashExactAmountLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  discountBillLabel: string;
  customerDiscountLabel: string;
  vatAmountLabel: string;
  summary: {
    subtotalLabel: string;
    discountLabel: string;
    totalLabel: string;
  };
  totalPaidLabel: string;
  confirmPaymentButton: string;
};

type CartSummary = {
  subtotal: number;
  discountAmount: number;
};

type QuickCashOption = {
  amount: number;
  isExact: boolean;
};

type Props = {
  isOpen: boolean;
  customers: Customer[];
  customerLevelDiscounts: CustomerLevelDiscount[];
  cartSummary: CartSummary;
  settlementTotal: number;
  vatAmount: number;
  applyVat: boolean;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  customerSettlementMode: "cash_now" | "invoice";
  setCustomerSettlementMode: (mode: "cash_now" | "invoice") => void;
  invoiceDueDate: string;
  setInvoiceDueDate: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  paidAmount: string;
  note: string;
  setNote: (v: string) => void;
  billDiscountAmount: number;
  billDiscountPercent: number;
  billDiscountType: "amount" | "percent";
  customerDiscountAmount: number;
  customerDiscountPercent: number;
  effectivePaidAmount: number;
  changeAmount: number;
  isPending: boolean;
  isCreatingQuotation: boolean;
  quotationMode: boolean;
  setQuotationMode: (v: boolean) => void;
  quotationValidUntil: string;
  setQuotationValidUntil: (v: string) => void;
  quickCashOptions: QuickCashOption[];
  lastQuickCashAmount: number | null;
  isNetworkCustomerSelected: boolean;
  isInvoiceSettlement: boolean;
  customerTypeLabel: string;
  cartLength: number;
  onClose: () => void;
  onSubmit: () => void;
  onCreateQuotation: () => void;
  onApplyQuickCash: (amount: number, isExact?: boolean) => void;
  onOpenAmountNumpad: (field: "bill_discount" | "paid_amount") => void;
  dictionary: Dict;
};

export function CheckoutSummaryModal({
  isOpen,
  customers,
  customerLevelDiscounts,
  cartSummary,
  settlementTotal,
  vatAmount,
  applyVat,
  selectedCustomerId,
  setSelectedCustomerId,
  customerSettlementMode,
  setCustomerSettlementMode,
  invoiceDueDate,
  setInvoiceDueDate,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  note,
  setNote,
  billDiscountAmount,
  billDiscountPercent,
  billDiscountType,
  customerDiscountAmount,
  customerDiscountPercent,
  effectivePaidAmount,
  changeAmount,
  isPending,
  isCreatingQuotation,
  quotationMode,
  setQuotationMode,
  quotationValidUntil,
  setQuotationValidUntil,
  quickCashOptions,
  lastQuickCashAmount,
  isNetworkCustomerSelected,
  isInvoiceSettlement,
  customerTypeLabel,
  cartLength,
  onClose,
  onSubmit,
  onCreateQuotation,
  onApplyQuickCash,
  onOpenAmountNumpad,
  dictionary,
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
      <div className="w-full max-w-4xl rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl smooth-fade-up">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">
            {dictionary.checkoutSectionTitle}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setQuotationMode(!quotationMode); setQuotationValidUntil(""); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                quotationMode
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              ใบเสนอราคา
            </button>
            <button
              className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              onClick={onClose}
              type="button"
            >
              {dictionary.closeReceiptButton}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            {/* Customer select */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-violet-800">
                {dictionary.customerLabel}
              </label>
              <select
                className="w-full rounded-lg border border-violet-200 bg-violet-50/30 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                value={selectedCustomerId}
              >
                <option value="">{dictionary.customerPlaceholder}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} (L{customer.level ?? 1} •{" "}
                    {customerLevelDiscounts.find(
                      (rule) => rule.level === Number(customer.level ?? 1),
                    )?.discount_percent ?? 0}
                    %)
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-medium text-slate-600">
                {dictionary.customerTypeLabel}: {customerTypeLabel}
              </p>
            </div>

            {/* Quotation mode fields */}
            {quotationMode && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-violet-800">ยืนราคาถึง</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[7, 14, 30, 45].map((d) => {
                      const val = new Date(Date.now() + d * 86400000).toISOString().split("T")[0];
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setQuotationValidUntil(quotationValidUntil === val ? "" : val)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                            quotationValidUntil === val
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                          }`}
                        >
                          {d} วัน
                        </button>
                      );
                    })}
                    <input
                      type="date"
                      className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      value={quotationValidUntil}
                      onChange={(e) => setQuotationValidUntil(e.target.value)}
                    />
                  </div>
                  {quotationValidUntil && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      ยืนราคาถึง {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(quotationValidUntil))}
                      <button type="button" onClick={() => setQuotationValidUntil("")} className="ml-2 underline hover:text-slate-600">ล้าง</button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-violet-800">{dictionary.noteLabel}</label>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-lg border border-violet-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder={dictionary.notePlaceholder}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Settlement mode (network customer, non-quotation) */}
            {!quotationMode && isNetworkCustomerSelected ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-violet-800">
                  {dictionary.customerSettlementLabel}
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                      customerSettlementMode === "cash_now"
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                    onClick={() => setCustomerSettlementMode("cash_now")}
                    type="button"
                  >
                    {dictionary.customerSettlementCashNow}
                  </button>
                  <button
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                      customerSettlementMode === "invoice"
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                    onClick={() => setCustomerSettlementMode("invoice")}
                    type="button"
                  >
                    {dictionary.customerSettlementInvoice}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Invoice due date */}
            {!quotationMode && isInvoiceSettlement ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-violet-800">
                  กำหนดชำระ
                </label>
                <div className="flex items-center gap-2">
                  {[7, 14, 30, 45].map((days) => {
                    const target = new Date();
                    target.setDate(target.getDate() + days);
                    const val = target.toISOString().split("T")[0];
                    const active = invoiceDueDate === val;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setInvoiceDueDate(active ? "" : val)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                        }`}
                      >
                        {days} วัน
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                {invoiceDueDate && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    ครบกำหนด {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(invoiceDueDate))}
                    <button
                      type="button"
                      onClick={() => setInvoiceDueDate("")}
                      className="ml-2 text-slate-400 underline hover:text-slate-600"
                    >
                      ล้าง
                    </button>
                  </p>
                )}
              </div>
            ) : null}

            {/* Note for invoice settlement */}
            {!quotationMode && isInvoiceSettlement ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-violet-800">
                  {dictionary.noteLabel}
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-lg border border-violet-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder={dictionary.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            ) : null}

            {/* Payment method */}
            {!quotationMode && !isInvoiceSettlement ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-violet-800">
                  {dictionary.paymentMethodLabel}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: dictionary.paymentMethodCashLabel, value: "cash" },
                    { label: dictionary.paymentMethodPromptPay, value: "transfer" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                        paymentMethod === option.value
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                      }`}
                      onClick={() => setPaymentMethod(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Paid amount + quick cash */}
            {!quotationMode && !isInvoiceSettlement ? (
              <div className="flex flex-col gap-3">
                <div
                  className={`grid gap-3 ${
                    paymentMethod === "transfer" ? "grid-cols-1" : "grid-cols-2"
                  }`}
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-violet-800">
                      {dictionary.customerPaymentLabel}
                    </label>
                    <input
                      className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-right text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      inputMode="numeric"
                      min="0"
                      onClick={() => onOpenAmountNumpad("paid_amount")}
                      onFocus={(event) => event.target.blur()}
                      placeholder="0"
                      readOnly
                      value={
                        paidAmount
                          ? `฿${formatAmount(parsePaidAmountAsCeilInt(paidAmount))}`
                          : ""
                      }
                    />
                  </div>
                  {paymentMethod !== "transfer" ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-violet-800">
                        {dictionary.changeLabel}
                      </label>
                      <input
                        className="w-full rounded-lg border border-violet-100 bg-violet-50 px-3 py-2.5 text-right text-xs font-semibold text-slate-700 outline-none"
                        readOnly
                        value={formatCurrency(Math.max(changeAmount, 0))}
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {dictionary.quickCashLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickCashOptions.map((option) => (
                      <button
                        key={option.isExact ? `exact-${option.amount}` : option.amount}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                          lastQuickCashAmount === option.amount
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        }`}
                        onClick={() => onApplyQuickCash(option.amount, option.isExact)}
                        type="button"
                      >
                        {option.isExact
                          ? dictionary.quickCashExactAmountLabel
                          : `+฿${option.amount}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: summary */}
          <div className="flex flex-col-reverse lg:flex-col">
            <div className="space-y-1.5 border-t border-violet-100 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{dictionary.summary.subtotalLabel}</span>
                <span>{formatCurrency(cartSummary.subtotal)}</span>
              </div>
              <div
                className={`flex items-center justify-between text-sm ${cartSummary.discountAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
              >
                <span>{dictionary.summary.discountLabel}</span>
                <span>
                  {cartSummary.discountAmount > 0
                    ? `-${formatCurrency(cartSummary.discountAmount)}`
                    : formatCurrency(0)}
                </span>
              </div>
              <div
                className={`flex items-center justify-between text-sm ${billDiscountAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
              >
                <span>
                  {dictionary.discountBillLabel}
                  {billDiscountType === "percent" && billDiscountPercent > 0
                    ? ` (${billDiscountPercent}%)`
                    : ""}
                </span>
                <span>
                  {billDiscountAmount > 0
                    ? `-${formatCurrency(billDiscountAmount)}`
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{dictionary.customerTypeLabel}</span>
                <span className="font-medium text-slate-600">
                  {customerTypeLabel}
                </span>
              </div>
              {selectedCustomerId && customerDiscountAmount > 0 ? (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>
                    {dictionary.customerDiscountLabel} (
                    {customerDiscountPercent}%)
                  </span>
                  <span>-{formatCurrency(customerDiscountAmount)}</span>
                </div>
              ) : null}
              {applyVat && (
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{dictionary.vatAmountLabel}</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}

              <div className="my-1.5 border-t border-dashed border-violet-100" />

              {/* Net total */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-700">
                  {dictionary.summary.totalLabel}
                </span>
                <span className="text-xl font-bold text-violet-700">
                  {formatCurrency(settlementTotal)}
                </span>
              </div>

              {/* Paid & change */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {dictionary.totalPaidLabel}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(effectivePaidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {dictionary.changeLabel}
                </span>
                <span
                  className={`text-sm font-bold ${changeAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {formatCurrency(Math.max(changeAmount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          className="mt-5 w-full rounded-lg bg-violet-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={cartLength === 0 || isPending || isCreatingQuotation}
          onClick={() => {
            if (quotationMode) {
              onCreateQuotation();
            } else {
              onSubmit();
            }
          }}
          type="button"
        >
          {isCreatingQuotation && <Loader2 className="h-4 w-4 animate-spin" />}
          {quotationMode ? "สร้างใบเสนอราคา" : dictionary.confirmPaymentButton}
        </button>
      </div>
    </div>
  );
}
