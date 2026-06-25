"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  CreditCard,
  FileText,
  Loader2,
  QrCode,
  Search,
  ShoppingCart,
  Smartphone,
  Ticket,
  X,
} from "lucide-react";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";
import { formatCurrency, formatAmount } from "./utils/sales-calculations";

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
  paymentMethodCard: string;
  paymentMethodPromptPay: string;
  paymentMethodQrLabel: string;
  paymentMethodBankTransferLabel: string;
  paymentMethodCreditCardLabel: string;
  paymentMethodDebitCardLabel: string;
  bankAccountLabel: string;
  bankAccountNone: string;
  bankTransferInstructions: string;
  bankTransferAccountNo: string;
  bankTransferAccountName: string;
  bankTransferBankName: string;
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
  promo?: { tab: string };
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        className="flex w-full items-center justify-between rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-left outline-none transition hover:border-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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

type BankAccountSummary = {
  id: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  is_active: boolean;
  is_default: boolean;
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
  selectedBankAccountId: string;
  setSelectedBankAccountId: (id: string) => void;
  bankAccounts: BankAccountSummary[];
  paidAmount: string;
  note: string;
  setNote: (v: string) => void;
  billDiscountAmount: number;
  billDiscountPercent: number;
  billDiscountType: "amount" | "percent";
  customerDiscountAmount: number;
  customerDiscountPercent: number;
  promoDiscountAmount: number;
  promoNames?: string[];
  changeAmount: number;
  isPending: boolean;
  isCreatingQuotation: boolean;
  quotationMode: boolean;
  setQuotationMode: (v: boolean) => void;
  quotationValidUntil: string;
  setQuotationValidUntil: (v: string) => void;
  quickCashOptions: QuickCashOption[];
  lastQuickCashAmount: number | null;
  customerTypeLabel: string;
  cartLength: number;
  enabledPaymentChannels?: string[];
  onClose: () => void;
  onSubmit: () => void;
  onCreateQuotation: () => void;
  onApplyQuickCash: (amount: number, isExact?: boolean) => void;
  onPaidAmountChange: (v: string) => void;
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
  selectedBankAccountId,
  setSelectedBankAccountId,
  bankAccounts,
  paidAmount,
  note,
  setNote,
  billDiscountAmount,
  billDiscountPercent,
  billDiscountType,
  customerDiscountAmount,
  customerDiscountPercent,
  promoDiscountAmount,
  promoNames,
  changeAmount,
  isPending,
  isCreatingQuotation,
  quotationMode,
  setQuotationMode,
  quotationValidUntil,
  setQuotationValidUntil,
  quickCashOptions,
  lastQuickCashAmount,
  customerTypeLabel,
  cartLength,
  enabledPaymentChannels,
  onClose,
  onSubmit,
  onCreateQuotation,
  onApplyQuickCash,
  onPaidAmountChange,
  dictionary,
}: Props) {
  const [dueDatePresetOptions] = useState(() => getDueDatePresetOptions());

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEsc, true);
    return () => document.removeEventListener("keydown", handleEsc, true);
  }, [isOpen, onClose]);

  const amountInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isCashNow = !quotationMode && customerSettlementMode === "cash_now";
  const isInvoiceMode = !quotationMode && customerSettlementMode === "invoice";

  const paymentOptions = [
    { label: dictionary.paymentMethodCashLabel, value: "cash", always: true },
    { label: dictionary.paymentMethodQrLabel, value: "promptpay", always: true },
    { label: dictionary.paymentMethodBankTransferLabel, value: "bank_transfer", always: true },
    { label: dictionary.paymentMethodCard, value: "card", always: false },
    { label: dictionary.paymentMethodCreditCardLabel, value: "credit_card", always: false },
    { label: dictionary.paymentMethodDebitCardLabel, value: "debit_card", always: false },
  ].filter((o) => o.always || (enabledPaymentChannels ?? []).includes(o.value));

  const numpadDigits = (digit: string) => {
    const el = amountInputRef.current;
    if (!el) { onPaidAmountChange(paidAmount + digit); return; }
    const start = el.selectionStart ?? paidAmount.length;
    const end = el.selectionEnd ?? paidAmount.length;
    const next = paidAmount.slice(0, start) + digit + paidAmount.slice(end);
    onPaidAmountChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + 1, start + 1); });
  };

  const numpadClear = () => { onPaidAmountChange(""); amountInputRef.current?.focus(); };

  const numpadBackspace = () => {
    const el = amountInputRef.current;
    if (!el) { onPaidAmountChange(paidAmount.slice(0, -1)); return; }
    const start = el.selectionStart ?? paidAmount.length;
    const end = el.selectionEnd ?? paidAmount.length;
    let next: string;
    let cursor: number;
    if (start !== end) {
      next = paidAmount.slice(0, start) + paidAmount.slice(end);
      cursor = start;
    } else if (start > 0) {
      next = paidAmount.slice(0, start - 1) + paidAmount.slice(start);
      cursor = start - 1;
    } else {
      return;
    }
    onPaidAmountChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  };

  return (
    <div className="fixed inset-0 z-40 flex bg-white">

      {/* ══════════════════ LEFT PANEL: Summary ══════════════════ */}
      <div className="flex w-[40%] min-w-0 flex-col border-r border-slate-200">

        {/* Header row */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้าขาย
          </button>

          {/* Compact mode toggle */}
          <div
            aria-label={dictionary.saleModeAriaLabel}
            className="flex gap-0.5 rounded-xl border border-violet-100 bg-violet-50/70 p-0.5"
            role="group"
          >
            {[
              {
                active: !quotationMode && customerSettlementMode === "cash_now",
                icon: ShoppingCart,
                label: dictionary.saleModeCashLabel,
                onClick: () => { setQuotationMode(false); setCustomerSettlementMode("cash_now"); setSelectedCustomerId(""); },
              },
              {
                active: !quotationMode && customerSettlementMode === "invoice",
                icon: Banknote,
                label: dictionary.saleModeInvoiceLabel,
                onClick: () => { setQuotationMode(false); setCustomerSettlementMode("invoice"); },
              },
              {
                active: quotationMode,
                icon: FileText,
                label: dictionary.saleModeQuotationLabel,
                onClick: () => { setQuotationMode(true); setCustomerSettlementMode("cash_now"); },
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.label}
                  type="button"
                  aria-pressed={m.active}
                  onClick={m.onClick}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    m.active
                      ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-200"
                      : "text-slate-500 hover:bg-white/70 hover:text-violet-600"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Customer selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-violet-800">
              {dictionary.customerLabel}
              {isCashNow && (
                <span className="ml-1.5 font-normal text-slate-400">(ไม่บังคับ)</span>
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
                className="w-full rounded-lg border border-violet-200 bg-violet-50/30 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                value={selectedCustomerId}
              >
                <option value="">{dictionary.customerPlaceholder}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} (L{c.level ?? 1} •{" "}
                    {customerLevelDiscounts.find((r) => r.level === Number(c.level ?? 1))?.discount_percent ?? 0}%)
                  </option>
                ))}
              </select>
            ) : (
              <CustomerCombobox
                customers={customers}
                customerLevelDiscounts={customerLevelDiscounts}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                placeholder={dictionary.customerPlaceholder}
              />
            )}
            <p className="mt-1.5 text-xs text-slate-500">
              {dictionary.customerTypeLabel}: {customerTypeLabel}
            </p>
          </div>

          {/* Quotation: valid-until */}
          {quotationMode && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-violet-800">{dictionary.quoteValidUntilLabel}</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dueDatePresetOptions.map((o) => (
                    <button
                      key={o.days}
                      type="button"
                      onClick={() => setQuotationValidUntil(quotationValidUntil === o.value ? "" : o.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        quotationValidUntil === o.value
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                      }`}
                    >
                      {o.days} {dictionary.dayUnitLabel}
                    </button>
                  ))}
                  <input
                    type="date"
                    className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={quotationValidUntil}
                    onChange={(e) => setQuotationValidUntil(e.target.value)}
                  />
                </div>
                {quotationValidUntil && (
                  <p className="mt-1 text-xs text-slate-400">
                    {dictionary.quotationValidUntilPrefix}{" "}
                    {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(quotationValidUntil))}
                    <button type="button" onClick={() => setQuotationValidUntil("")} className="ml-2 underline hover:text-slate-600">
                      {dictionary.clearDateButton}
                    </button>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-violet-800">{dictionary.noteLabel}</label>
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

          {/* Invoice: due date + note */}
          {isInvoiceMode && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-violet-800">{dictionary.invoiceDueDateLabel}</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dueDatePresetOptions.map((o) => {
                    const active = invoiceDueDate === o.value;
                    return (
                      <button
                        key={o.days}
                        type="button"
                        onClick={() => setInvoiceDueDate(active ? "" : o.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-700"
                        }`}
                      >
                        {o.days} {dictionary.dayUnitLabel}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                {invoiceDueDate && (
                  <p className="mt-1 text-xs text-slate-400">
                    {dictionary.invoiceDueDatePrefix}{" "}
                    {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(invoiceDueDate))}
                    <button type="button" onClick={() => setInvoiceDueDate("")} className="ml-2 underline hover:text-slate-600">
                      {dictionary.clearDateButton}
                    </button>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-violet-800">{dictionary.noteLabel}</label>
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

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Summary breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{dictionary.summary.subtotalLabel}</span>
              <span>{formatCurrency(cartSummary.subtotal)}</span>
            </div>

            {cartSummary.discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>{dictionary.summary.discountLabel}</span>
                <span>-{formatCurrency(cartSummary.discountAmount)}</span>
              </div>
            )}

            {billDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>
                  {dictionary.discountBillLabel}
                  {billDiscountType === "percent" && billDiscountPercent > 0 ? ` (${billDiscountPercent}%)` : ""}
                </span>
                <span>-{formatCurrency(billDiscountAmount)}</span>
              </div>
            )}

            {promoDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-amber-600">
                <span className="flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5 shrink-0" />
                  {dictionary.promo?.tab ?? "โปรโมชั่น"}
                  {promoNames && promoNames.length > 0 ? ` ×${promoNames.length}` : ""}
                </span>
                <span>-{formatCurrency(promoDiscountAmount)}</span>
              </div>
            )}

            {selectedCustomerId && customerDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>
                  {dictionary.customerDiscountLabel} ({customerDiscountPercent}%)
                </span>
                <span>-{formatCurrency(customerDiscountAmount)}</span>
              </div>
            )}

            {applyVat && (
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{dictionary.vatAmountLabel}</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{dictionary.customerTypeLabel}</span>
              <span className="font-medium text-slate-600">{customerTypeLabel}</span>
            </div>
          </div>
        </div>

        {/* Sticky total */}
        <div className="border-t-2 border-violet-200 bg-white px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-700">{dictionary.summary.totalLabel}</span>
            <span className="text-4xl font-bold tabular-nums text-violet-700">{formatCurrency(settlementTotal)}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════ RIGHT PANEL: Payment ══════════════════ */}
      <div className="flex flex-1 flex-col bg-slate-50/50">

        {/* Cash-now: full payment UI */}
        {isCashNow && (
          <>
            {/* Payment method tabs */}
            <div className="border-b border-slate-200 bg-white px-8 py-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {dictionary.paymentMethodLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {paymentOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setPaymentMethod(o.value)}
                    className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                      paymentMethod === o.value
                        ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash: amount display + quick presets + numpad */}
            {paymentMethod === "cash" && (
              <div className="flex flex-1 flex-col gap-3 px-8 py-5">
                {/* Amount + Change side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {/* จำนวนเงินที่รับ */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">{dictionary.customerPaymentLabel}</p>
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="numeric"
                      value={paidAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        onPaidAmountChange(v);
                      }}
                      placeholder="0"
                      className="w-full rounded-xl border-2 border-violet-400 bg-violet-50 px-4 py-3 text-center text-3xl font-bold tabular-nums text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  {/* เงินทอน */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">{dictionary.changeLabel}</p>
                    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <span className={`text-3xl font-bold tabular-nums ${changeAmount > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {formatCurrency(Math.max(changeAmount, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick cash presets */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {dictionary.quickCashLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Always show exact-amount button */}
                    <button
                      type="button"
                      onClick={() => onApplyQuickCash(settlementTotal, true)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        lastQuickCashAmount === settlementTotal
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {dictionary.quickCashExactAmountLabel}
                    </button>
                    {/* Base presets (non-exact only) */}
                    {quickCashOptions.filter((o) => !o.isExact).map((o) => (
                      <button
                        key={o.amount}
                        type="button"
                        onClick={() => onApplyQuickCash(o.amount, false)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          lastQuickCashAmount === o.amount
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        +฿{formatAmount(o.amount)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline numpad */}
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => numpadDigits(d)}
                      className="flex min-h-[3.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl font-semibold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                    >
                      {d}
                    </button>
                  ))}
                  {/* Bottom row: C, 0, ⌫ */}
                  <button
                    type="button"
                    onClick={numpadClear}
                    className="flex min-h-[3.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-bold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 active:scale-95"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => numpadDigits("0")}
                    className="flex min-h-[3.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl font-semibold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={numpadBackspace}
                    className="flex min-h-[3.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            {/* Bank transfer: account picker */}
            {paymentMethod === "bank_transfer" && (
              <div className="flex-1 px-8 py-6">
                {bankAccounts.filter((a) => a.is_active).length === 0 ? (
                  <p className="text-sm text-amber-600">{dictionary.bankAccountNone}</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-violet-700">{dictionary.bankTransferInstructions}</p>
                    {bankAccounts.filter((a) => a.is_active).map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedBankAccountId(acc.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                          selectedBankAccountId === acc.id
                            ? "border-violet-600 bg-white ring-1 ring-violet-600"
                            : "border-slate-200 bg-white hover:border-violet-300"
                        }`}
                      >
                        <div className="font-semibold text-slate-800">{acc.bank_name}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{acc.account_no}</div>
                        <div className="text-xs text-slate-500">{acc.account_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PromptPay / QR */}
            {paymentMethod === "promptpay" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
                  <QrCode className="h-10 w-10 text-violet-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">QR Code แสดงบนจอลูกค้าแล้ว</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-violet-700">{formatCurrency(settlementTotal)}</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-sm text-amber-800">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>ตรวจสอบยอดเงินที่แอปธนาคาร<br />แล้วกด <strong>ตกลง</strong> เพื่อยืนยัน</span>
                </div>
              </div>
            )}

            {/* Card (combined / credit / debit) */}
            {(paymentMethod === "card" || paymentMethod === "credit_card" || paymentMethod === "debit_card") && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                  <CreditCard className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">บัตรเครดิต / เดบิต</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-violet-700">{formatCurrency(settlementTotal)}</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm text-slate-700">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>รูดหรือแตะบัตรที่เครื่อง EDC<br />รอการอนุมัติจากธนาคาร แล้วกด <strong>ตกลง</strong></span>
                </div>
              </div>
            )}

            {/* Other e-wallet (TrueMoney / ShopeePay / etc.) */}
            {paymentMethod !== "cash" && paymentMethod !== "bank_transfer" && paymentMethod !== "promptpay" && paymentMethod !== "card" && paymentMethod !== "credit_card" && paymentMethod !== "debit_card" && (
              <div className="flex flex-1 items-center justify-center px-8 text-center">
                <p className="text-sm text-slate-400">ดำเนินการชำระเงิน แล้วกด <strong>ตกลง</strong> เพื่อยืนยัน</p>
              </div>
            )}
          </>
        )}

        {/* Invoice / Quotation: info + spacer */}
        {!isCashNow && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            {quotationMode ? (
              <FileText className="h-12 w-12 text-violet-300" />
            ) : (
              <Banknote className="h-12 w-12 text-violet-300" />
            )}
            <p className="text-sm font-medium text-slate-500">
              {quotationMode ? dictionary.saleModeQuotationDescription : dictionary.saleModeInvoiceDescription}
            </p>
          </div>
        )}

        {/* Sticky confirm button */}
        <div className="border-t border-slate-200 bg-white px-8 py-5">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartLength === 0 || isPending || isCreatingQuotation}
            onClick={() => { if (quotationMode) onCreateQuotation(); else onSubmit(); }}
          >
            {(isPending || isCreatingQuotation) && <Loader2 className="h-4 w-4 animate-spin" />}
            {quotationMode ? dictionary.createQuotationButton : dictionary.confirmPaymentButton}
          </button>
        </div>
      </div>
    </div>
  );
}
