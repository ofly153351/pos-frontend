"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, ChevronDown, FileText, Loader2, Search, ShoppingCart, X } from "lucide-react";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import { formatCurrency, formatAmount, parsePaidAmountAsCeilInt } from "./utils/sales-calculations";

type Dict = {
  checkoutSectionTitle: string;
  closeReceiptButton: string;
  saleModeAriaLabel: string;
  saleModeCashLabel: string;
  saleModeCashDescription: string;
  saleModeInvoiceLabel: string;
  saleModeInvoiceDescription: string;
  saleModeQuotationLabel: string;
  saleModeQuotationDescription: string;
  quoteValidUntilLabel: string;
  dayUnitLabel: string;
  quotationValidUntilPrefix: string;
  clearDateButton: string;
  invoiceDueDateLabel: string;
  invoiceDueDatePrefix: string;
  createQuotationButton: string;
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

// ── Customer Combobox ────────────────────────────────────────────────────────
type CustomerComboboxProps = {
  customers: Customer[];
  customerLevelDiscounts: CustomerLevelDiscount[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
};

function CustomerCombobox({ customers, customerLevelDiscounts, value, onChange, placeholder }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = query.trim()
    ? customers.filter((c) => c.full_name.toLowerCase().includes(query.toLowerCase()))
    : customers;

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectCustomer(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function getDiscountLabel(customer: Customer) {
    const pct = customerLevelDiscounts.find((r) => r.level === Number(customer.level ?? 1))?.discount_percent ?? 0;
    return `L${customer.level ?? 1} • ${pct}%`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm text-left outline-none transition hover:border-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-slate-800">{selected.full_name}</span>
            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{getDiscountLabel(selected)}</span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <span className="flex shrink-0 items-center gap-1 ml-2">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-violet-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="ค้นหาลูกค้า..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">ไม่พบลูกค้า</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c.id)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-violet-50 ${c.id === value ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-700"}`}
                >
                  <span className="truncate">{c.full_name}</span>
                  <span className="ml-3 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">{getDiscountLabel(c)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const dueDatePresetDays = [7, 14, 30, 45];

function getDueDatePresetValue(days: number) {
  const target = new Date();
  target.setDate(target.getDate() + days);

  return target.toISOString().split("T")[0];
}

function getDueDatePresetOptions() {
  return dueDatePresetDays.map((days) => ({
    days,
    value: getDueDatePresetValue(days),
  }));
}

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
  const [dueDatePresetOptions] = useState(() => getDueDatePresetOptions());


  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 smooth-fade">
      <div className="w-full max-w-4xl rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-2xl smooth-fade-up">
        {/* ── Header: 3-mode toggle + close ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div
            aria-label={dictionary.saleModeAriaLabel}
            className="grid gap-1.5 rounded-2xl border border-violet-100 bg-violet-50/70 p-1 shadow-inner shadow-violet-100/60 sm:grid-cols-3"
            role="group"
          >
            {[
              {
                active: !quotationMode && customerSettlementMode === "cash_now",
                description: dictionary.saleModeCashDescription,
                icon: ShoppingCart,
                label: dictionary.saleModeCashLabel,
                onClick: () => { setQuotationMode(false); setQuotationValidUntil(""); setCustomerSettlementMode("cash_now"); setSelectedCustomerId(""); },
              },
              {
                active: !quotationMode && customerSettlementMode === "invoice",
                description: dictionary.saleModeInvoiceDescription,
                icon: Banknote,
                label: dictionary.saleModeInvoiceLabel,
                onClick: () => { setQuotationMode(false); setQuotationValidUntil(""); setCustomerSettlementMode("invoice"); },
              },
              {
                active: quotationMode,
                description: dictionary.saleModeQuotationDescription,
                icon: FileText,
                label: dictionary.saleModeQuotationLabel,
                onClick: () => { setQuotationMode(true); setQuotationValidUntil(""); setCustomerSettlementMode("cash_now"); },
              },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={option.active}
                  onClick={option.onClick}
                  className={`flex min-w-[8.5rem] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                    option.active
                      ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-200 scale-[1.02]"
                      : "text-slate-500 hover:bg-white/70 hover:text-violet-700 scale-100"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-in-out ${
                    option.active
                      ? "bg-violet-600 text-white shadow-md shadow-violet-300/50"
                      : "bg-white text-violet-400 ring-1 ring-violet-100"
                  }`}>
                    <Icon className={`h-4 w-4 transition-transform duration-200 ${option.active ? "scale-110" : "scale-100"}`} aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className={`block text-sm font-bold transition-colors duration-200 ${option.active ? "text-violet-800" : "text-slate-500"}`}>{option.label}</span>
                    <span className="block text-[11px] font-medium text-slate-400">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className="self-start rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            onClick={onClose}
            type="button"
          >
            {dictionary.closeReceiptButton}
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            {/* Customer select */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-violet-800">
                {dictionary.customerLabel}
                {!quotationMode && customerSettlementMode === "cash_now" && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                    (เพื่อออกใบกำกับภาษี — ไม่บังคับ)
                  </span>
                )}
              </label>
              {customerSettlementMode === "invoice" ? (
                <CustomerCombobox
                  customers={customers}
                  customerLevelDiscounts={customerLevelDiscounts}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder="เลือกลูกค้า..."
                />
              ) : quotationMode ? (
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
              ) : (
                /* cash_now — optional customer for tax invoice */
                <CustomerCombobox
                  customers={customers}
                  customerLevelDiscounts={customerLevelDiscounts}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder={dictionary.customerPlaceholder}
                />
              )}
              <p className="mt-2 text-xs font-medium text-slate-600">
                {dictionary.customerTypeLabel}: {customerTypeLabel}
              </p>
            </div>

            {/* Quotation mode fields */}
            {quotationMode && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-violet-800">{dictionary.quoteValidUntilLabel}</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {dueDatePresetOptions.map((option) => (
                      <button
                        key={option.days}
                        type="button"
                        onClick={() =>
                          setQuotationValidUntil(
                            quotationValidUntil === option.value ? "" : option.value,
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                          quotationValidUntil === option.value
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                        }`}
                      >
                        {option.days} {dictionary.dayUnitLabel}
                      </button>
                    ))}
                    <input
                      type="date"
                      className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      value={quotationValidUntil}
                      onChange={(e) => setQuotationValidUntil(e.target.value)}
                    />
                  </div>
                  {quotationValidUntil && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {dictionary.quotationValidUntilPrefix} {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(quotationValidUntil))}
                      <button type="button" onClick={() => setQuotationValidUntil("")} className="ml-2 underline hover:text-slate-600">{dictionary.clearDateButton}</button>
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


            {/* Invoice due date */}
            {!quotationMode && customerSettlementMode === "invoice" ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-violet-800">
                  {dictionary.invoiceDueDateLabel}
                </label>
                <div className="flex items-center gap-2">
                  {dueDatePresetOptions.map((option) => {
                    const active = invoiceDueDate === option.value;

                    return (
                      <button
                        key={option.days}
                        type="button"
                        onClick={() =>
                          setInvoiceDueDate(active ? "" : option.value)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                        }`}
                      >
                        {option.days} {dictionary.dayUnitLabel}
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
                    {dictionary.invoiceDueDatePrefix} {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(invoiceDueDate))}
                    <button
                      type="button"
                      onClick={() => setInvoiceDueDate("")}
                      className="ml-2 text-slate-400 underline hover:text-slate-600"
                    >
                      {dictionary.clearDateButton}
                    </button>
                  </p>
                )}
              </div>
            ) : null}

            {/* Note for invoice settlement */}
            {!quotationMode && customerSettlementMode === "invoice" ? (
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
            {!quotationMode && customerSettlementMode === "cash_now" ? (
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
            {!quotationMode && customerSettlementMode === "cash_now" ? (
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

              {/* Paid & change — cash_now only */}
              {!quotationMode && customerSettlementMode === "cash_now" && (<>
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
              </>)}
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
          {quotationMode ? dictionary.createQuotationButton : dictionary.confirmPaymentButton}
        </button>
      </div>
    </div>
  );
}
