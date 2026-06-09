"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CreditCard,
  FileText,
  HandCoins,
  Plus,
  Receipt,
  TrendingUp,
  X,
} from "lucide-react";

import { listCustomers } from "@/services/customers";
import type { Customer } from "@/types/customer";
import type {
  CreditSale,
  CreditSaleItem,
  CreditSalePayment,
  CreditSaleStatus,
  CreditSaleType,
} from "@/types/credit-sale";

// ─── Dictionary type ───────────────────────────────────────────────────────
type CreditSalesDictionary = {
  title: string;
  subtitle: string;
  newBtn: string;
  kpiTotalPending: string;
  kpiOverdue: string;
  kpiLoanItems: string;
  kpiThisMonth: string;
  filterAll: string;
  filterCredit: string;
  filterLoan: string;
  filterStatusAll: string;
  tableDocNo: string;
  tableCustomer: string;
  tableType: string;
  tableAmountQty: string;
  tablePaidProgress: string;
  tableRemaining: string;
  tableDueDate: string;
  tableStatus: string;
  tableActions: string;
  viewBtn: string;
  statusPending: string;
  statusPartial: string;
  statusCompleted: string;
  statusOverdue: string;
  statusCancelled: string;
  typeCredit: string;
  typeLoan: string;
  createTitle: string;
  tabCredit: string;
  tabLoan: string;
  customerLabel: string;
  customerRequired: string;
  customerPlaceholder: string;
  dueDateLabel: string;
  dueDateRequired: string;
  productsLabel: string;
  addProductBtn: string;
  productNamePlaceholder: string;
  pricePlaceholder: string;
  qtyPlaceholder: string;
  colName: string;
  colPrice: string;
  colQty: string;
  colTotal: string;
  noteLabel: string;
  notePlaceholder: string;
  summaryQtyLabel: string;
  summaryAmountLabel: string;
  pieces: string;
  cancelBtn: string;
  saveBtn: string;
  saving: string;
  noItemsError: string;
  noCustomerError: string;
  detailCustomerLabel: string;
  detailCreatedByLabel: string;
  detailCreatedAtLabel: string;
  detailDueDateLabel: string;
  detailTotalLabel: string;
  detailPaidLabel: string;
  detailRemainingLabel: string;
  detailItemsTitle: string;
  detailPayHistoryTitle: string;
  detailNoPayments: string;
  closeBtn: string;
  printBillBtn: string;
  cancelSaleBtn: string;
  receivePaymentBtn: string;
  cancelConfirm: string;
  paymentTitle: string;
  paymentOutstandingLabel: string;
  paymentAmountLabel: string;
  paymentMethodLabel: string;
  paymentMethodCash: string;
  paymentMethodTransfer: string;
  paymentNoteLabel: string;
  paymentNotePlaceholder: string;
  paymentConfirmBtn: string;
  paymentAmountError: string;
  empty: string;
  emptyHint: string;
  loading: string;
  createdSuccess: string;
  paymentSuccess: string;
  cancelSuccess: string;
};

type CreditSalesManagerProps = {
  dictionary: CreditSalesDictionary;
  locale: string;
  prefilledCustomerId?: string;
  prefilledCustomerName?: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "pos-credit-sales";

const STATUS_CLASSES: Record<CreditSaleStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const TYPE_CLASSES: Record<CreditSaleType, string> = {
  credit: "bg-violet-100 text-violet-700",
  loan: "bg-teal-100 text-teal-700",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function loadSales(): CreditSale[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as CreditSale[]) : [];
  } catch {
    return [];
  }
}

function saveSales(sales: CreditSale[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

function generateDocNo(sales: CreditSale[]): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `CR${y}${m}${d}`;
  const todaySales = sales.filter((s) => s.document_number.startsWith(prefix));
  const seq = String(todaySales.length + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

function computeStatus(sale: CreditSale): CreditSaleStatus {
  if (sale.status === "cancelled") return "cancelled";
  if (sale.paid_amount >= sale.total_amount && sale.total_amount > 0) return "completed";
  const isOverdue = sale.due_date && new Date(sale.due_date) < new Date();
  if (sale.paid_amount > 0) return isOverdue ? "overdue" : "partial";
  return isOverdue ? "overdue" : "pending";
}

function fmtBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────
export function CreditSalesManager({
  dictionary,
  prefilledCustomerId,
}: CreditSalesManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [success, setSuccess] = useState("");

  // ── Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "loan">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CreditSaleType>("credit");
  const [createCustomerId, setCreateCustomerId] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createItems, setCreateItems] = useState<CreditSaleItem[]>([]);
  const [createNote, setCreateNote] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Detail modal
  const [viewSale, setViewSale] = useState<CreditSale | null>(null);

  // ── Payment modal
  const [payingSale, setPayingSale] = useState<CreditSale | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [isPaySaving, setIsPaySaving] = useState(false);

  // ─── Load data
  useEffect(() => {
    async function load() {
      try {
        const [loadedSales, customersResponse] = await Promise.all([
          Promise.resolve(loadSales()),
          listCustomers(),
        ]);
        setSales(loadedSales);
        setCustomers(customersResponse.data ?? []);
      } catch {
        setSales(loadSales());
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  // ─── Pre-fill customer from URL params
  useEffect(() => {
    if (prefilledCustomerId && !isLoading) {
      setCreateCustomerId(prefilledCustomerId);
      setIsCreateOpen(true);
    }
  }, [prefilledCustomerId, isLoading]);

  // ─── KPI
  const kpi = useMemo(() => {
    const active = sales.filter((s) => computeStatus(s) !== "cancelled" && computeStatus(s) !== "completed");
    const totalPending = active.reduce((sum, s) => sum + Math.max(0, s.total_amount - s.paid_amount), 0);
    const overdue = sales.filter((s) => computeStatus(s) === "overdue").length;
    const loanItems = sales
      .filter((s) => s.type === "loan" && computeStatus(s) !== "cancelled" && computeStatus(s) !== "completed")
      .reduce((sum, s) => sum + s.items.reduce((n, item) => n + item.quantity, 0), 0);
    const now = new Date();
    const thisMonth = sales.filter((s) => {
      const d = new Date(s.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { totalPending, overdue, loanItems, thisMonth };
  }, [sales]);

  // ─── Filtered list
  const filtered = useMemo(() => {
    return sales
      .map((s) => ({ ...s, _status: computeStatus(s) }))
      .filter((s) => {
        if (typeFilter !== "all" && s.type !== typeFilter) return false;
        if (statusFilter !== "all" && s._status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sales, typeFilter, statusFilter]);

  // ─── Status label helper
  function statusLabel(status: CreditSaleStatus) {
    const map: Record<CreditSaleStatus, string> = {
      pending: dictionary.statusPending,
      partial: dictionary.statusPartial,
      completed: dictionary.statusCompleted,
      overdue: dictionary.statusOverdue,
      cancelled: dictionary.statusCancelled,
    };
    return map[status];
  }

  function typeLabel(type: CreditSaleType) {
    return type === "credit" ? dictionary.typeCredit : dictionary.typeLoan;
  }

  // ─── Open create modal (fresh)
  function openCreate() {
    setCreateType("credit");
    setCreateCustomerId(prefilledCustomerId ?? "");
    setCreateDueDate("");
    setCreateItems([]);
    setCreateNote("");
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
    setCreateError("");
    setIsCreateOpen(true);
  }

  // ─── Add item to create form
  function addItem() {
    const name = newItemName.trim();
    const price = Number(newItemPrice);
    const qty = Number(newItemQty);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 1) return;
    const item: CreditSaleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product_name: name,
      price,
      quantity: qty,
      total: price * qty,
    };
    setCreateItems((prev) => [...prev, item]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
  }

  // ─── Save create
  function handleCreate() {
    setCreateError("");
    if (!createCustomerId) { setCreateError(dictionary.noCustomerError); return; }
    if (createItems.length === 0) { setCreateError(dictionary.noItemsError); return; }
    if (!createDueDate) { setCreateError(dictionary.dueDateRequired); return; }

    const customer = customers.find((c) => c.id === createCustomerId);
    if (!customer) { setCreateError(dictionary.noCustomerError); return; }

    setIsSaving(true);
    const current = loadSales();
    const totalAmount = createItems.reduce((sum, i) => sum + i.total, 0);
    const newSale: CreditSale = {
      id: `cs-${Date.now()}`,
      document_number: generateDocNo(current),
      type: createType,
      customer_id: createCustomerId,
      customer_name: customer.full_name,
      customer_phone: customer.phone ?? undefined,
      customer_member_code: customer.member_code ?? undefined,
      items: createItems,
      total_amount: totalAmount,
      paid_amount: 0,
      note: createNote.trim() || undefined,
      due_date: createDueDate,
      created_at: new Date().toISOString(),
      created_by: "ผู้ใช้งาน",
      status: "pending",
      payments: [],
    };
    const updated = [newSale, ...current];
    saveSales(updated);
    setSales(updated);
    setIsCreateOpen(false);
    setSuccess(dictionary.createdSuccess);
    setIsSaving(false);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ─── Save payment
  function handlePayment() {
    if (!payingSale) return;
    setPayError("");
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError(dictionary.paymentAmountError);
      return;
    }
    setIsPaySaving(true);
    const payment: CreditSalePayment = {
      id: `pay-${Date.now()}`,
      amount,
      method: payMethod,
      note: payNote.trim() || undefined,
      paid_at: new Date().toISOString(),
    };
    const current = loadSales();
    const updated = current.map((s) => {
      if (s.id !== payingSale.id) return s;
      const newPaid = s.paid_amount + amount;
      const newStatus = computeStatus({ ...s, paid_amount: newPaid });
      return { ...s, paid_amount: newPaid, status: newStatus, payments: [...s.payments, payment] };
    });
    saveSales(updated);
    setSales(updated);
    setPayingSale(null);
    setPayAmount("");
    setPayNote("");
    // Update viewSale if open
    const updatedSale = updated.find((s) => s.id === payingSale.id);
    if (viewSale && updatedSale) setViewSale(updatedSale);
    setSuccess(dictionary.paymentSuccess);
    setIsPaySaving(false);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ─── Cancel sale
  function handleCancelSale(saleId: string) {
    if (!window.confirm(dictionary.cancelConfirm)) return;
    const current = loadSales();
    const updated = current.map((s) => (s.id === saleId ? { ...s, status: "cancelled" as CreditSaleStatus } : s));
    saveSales(updated);
    setSales(updated);
    if (viewSale?.id === saleId) setViewSale(null);
    setSuccess(dictionary.cancelSuccess);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ─── Open payment modal
  function openPayment(sale: CreditSale) {
    const remaining = Math.max(0, sale.total_amount - sale.paid_amount);
    setPayAmount(remaining > 0 ? String(remaining) : "");
    setPayMethod("cash");
    setPayNote("");
    setPayError("");
    setPayingSale(sale);
  }

  // ─── Loading
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{dictionary.loading}</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dictionary.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{dictionary.subtitle}</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
          onClick={openCreate}
          type="button"
        >
          <Plus className="h-4 w-4" />
          {dictionary.newBtn}
        </button>
      </div>

      {/* Success banner */}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <HandCoins className="h-5 w-5 text-rose-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900">{fmtBaht(kpi.totalPending)}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiTotalPending}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.overdue}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiOverdue}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100">
            <BookOpen className="h-5 w-5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.loanItems}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiLoanItems}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.thisMonth}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl bg-white shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="flex rounded-xl border border-slate-200 p-1 gap-1">
            {(["all", "credit", "loan"] as const).map((t) => {
              const labels = { all: dictionary.filterAll, credit: dictionary.filterCredit, loan: dictionary.filterLoan };
              return (
                <button
                  key={t}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    typeFilter === t
                      ? "bg-violet-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setTypeFilter(t)}
                  type="button"
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">{dictionary.filterStatusAll}</option>
            <option value="pending">{dictionary.statusPending}</option>
            <option value="partial">{dictionary.statusPartial}</option>
            <option value="overdue">{dictionary.statusOverdue}</option>
            <option value="completed">{dictionary.statusCompleted}</option>
            <option value="cancelled">{dictionary.statusCancelled}</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <CreditCard className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{dictionary.empty}</p>
            <p className="text-xs text-slate-400">{dictionary.emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{dictionary.tableDocNo}</th>
                  <th className="px-4 py-3">{dictionary.tableCustomer}</th>
                  <th className="px-4 py-3">{dictionary.tableType}</th>
                  <th className="px-4 py-3 text-right">{dictionary.tableAmountQty}</th>
                  <th className="px-4 py-3">{dictionary.tablePaidProgress}</th>
                  <th className="px-4 py-3 text-right">{dictionary.tableRemaining}</th>
                  <th className="px-4 py-3">{dictionary.tableDueDate}</th>
                  <th className="px-4 py-3">{dictionary.tableStatus}</th>
                  <th className="px-4 py-3">{dictionary.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {filtered.map((sale) => {
                  const liveStatus = sale._status;
                  const remaining = Math.max(0, sale.total_amount - sale.paid_amount);
                  const pct = sale.total_amount > 0 ? Math.min(100, (sale.paid_amount / sale.total_amount) * 100) : 0;
                  const totalQty = sale.items.reduce((n, i) => n + i.quantity, 0);
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                        {sale.document_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{sale.customer_name}</p>
                        {sale.customer_phone ? (
                          <p className="text-xs text-slate-400">{sale.customer_phone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_CLASSES[sale.type]}`}>
                          {typeLabel(sale.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sale.type === "credit" ? (
                          <p className="font-semibold text-slate-800">{fmtBaht(sale.total_amount)}</p>
                        ) : (
                          <p className="font-semibold text-slate-800">{totalQty} {dictionary.pieces}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="space-y-1">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">{Math.round(pct)}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">
                        {remaining > 0 ? fmtBaht(remaining) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p className={new Date(sale.due_date) < new Date() && liveStatus !== "completed" && liveStatus !== "cancelled" ? "font-medium text-rose-600" : ""}>
                          {fmtDate(sale.due_date)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[liveStatus]}`}>
                          {statusLabel(liveStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => setViewSale(sale)}
                          type="button"
                        >
                          {dictionary.viewBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-violet-700 px-6 py-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-200" />
                <h3 className="text-lg font-bold text-white">{dictionary.createTitle}</h3>
              </div>
              <button
                className="rounded-lg p-1 text-violet-200 transition hover:bg-violet-600"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-4">
              {/* Type tabs */}
              <div className="flex rounded-xl border border-slate-200 p-1 gap-1">
                {(["credit", "loan"] as const).map((t) => (
                  <button
                    key={t}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                      createType === t ? "bg-violet-700 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setCreateType(t)}
                    type="button"
                  >
                    {t === "credit" ? dictionary.tabCredit : dictionary.tabLoan}
                  </button>
                ))}
              </div>

              {createError ? (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{createError}</div>
              ) : null}

              {/* Customer + Due date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {dictionary.customerLabel} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                    onChange={(e) => setCreateCustomerId(e.target.value)}
                    value={createCustomerId}
                  >
                    <option value="">{dictionary.customerPlaceholder}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}{c.phone ? ` · ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {dictionary.dueDateLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    type="date"
                    value={createDueDate}
                  />
                </div>
              </div>

              {/* Items section */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">{dictionary.productsLabel}</p>
                {/* Add item row */}
                <div className="flex gap-2 mb-3">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    placeholder={dictionary.productNamePlaceholder}
                    value={newItemName}
                  />
                  <input
                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    min="0"
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder={dictionary.pricePlaceholder}
                    step="0.01"
                    type="number"
                    value={newItemPrice}
                  />
                  <input
                    className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
                    min="1"
                    onChange={(e) => setNewItemQty(e.target.value)}
                    placeholder={dictionary.qtyPlaceholder}
                    step="1"
                    type="number"
                    value={newItemQty}
                  />
                  <button
                    className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                    onClick={addItem}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Items list */}
                {createItems.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">{dictionary.colName}</th>
                          <th className="px-3 py-2 text-right">{dictionary.colPrice}</th>
                          <th className="px-3 py-2 text-right">{dictionary.colQty}</th>
                          <th className="px-3 py-2 text-right">{dictionary.colTotal}</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {createItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-slate-900">{item.product_name}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{fmtBaht(item.price)}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-800">{fmtBaht(item.total)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => setCreateItems((prev) => prev.filter((i) => i.id !== item.id))}
                                type="button"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>

              {/* Note */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.noteLabel}</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder={dictionary.notePlaceholder}
                  rows={2}
                  value={createNote}
                />
              </div>

              {/* Summary */}
              {createItems.length > 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                  <span className="text-sm text-slate-600">
                    {dictionary.summaryQtyLabel}:{" "}
                    <strong>{createItems.reduce((n, i) => n + i.quantity, 0)}</strong> {dictionary.pieces}
                  </span>
                  <span className="text-sm font-bold text-violet-800">
                    {dictionary.summaryAmountLabel}: {fmtBaht(createItems.reduce((n, i) => n + i.total, 0))}
                  </span>
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                >
                  {dictionary.cancelBtn}
                </button>
                <button
                  className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleCreate}
                  type="button"
                >
                  {isSaving ? dictionary.saving : dictionary.saveBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Detail modal ─────────────────────────────────────────────────────── */}
      {viewSale ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setViewSale(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between bg-emerald-700 px-6 py-4">
              <div>
                <p className="font-mono text-lg font-bold text-white">{viewSale.document_number}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_CLASSES[viewSale.type]} bg-white/20 text-white`}>
                    {typeLabel(viewSale.type)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[computeStatus(viewSale)]} bg-white/20 text-white`}>
                    {statusLabel(computeStatus(viewSale))}
                  </span>
                </div>
              </div>
              <button
                className="rounded-lg p-1 text-white/70 transition hover:bg-white/10"
                onClick={() => setViewSale(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: dictionary.detailCustomerLabel, value: viewSale.customer_name },
                  { label: dictionary.detailCreatedByLabel, value: viewSale.created_by },
                  { label: dictionary.detailCreatedAtLabel, value: fmtDate(viewSale.created_at) },
                  { label: dictionary.detailDueDateLabel, value: fmtDate(viewSale.due_date) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* 3 summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xs text-slate-500">{dictionary.detailTotalLabel}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{fmtBaht(viewSale.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-600">{dictionary.detailPaidLabel}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">{fmtBaht(viewSale.paid_amount)}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
                  <p className="text-xs text-rose-600">{dictionary.detailRemainingLabel}</p>
                  <p className="mt-1 text-lg font-bold text-rose-700">{fmtBaht(Math.max(0, viewSale.total_amount - viewSale.paid_amount))}</p>
                </div>
              </div>

              {/* Items table */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">{dictionary.detailItemsTitle}</p>
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">{dictionary.colName}</th>
                        <th className="px-3 py-2 text-right">{dictionary.colPrice}</th>
                        <th className="px-3 py-2 text-right">{dictionary.colQty}</th>
                        <th className="px-3 py-2 text-right">{dictionary.colTotal}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {viewSale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-slate-900">{item.product_name}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{fmtBaht(item.price)}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmtBaht(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment history */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">{dictionary.detailPayHistoryTitle}</p>
                {viewSale.payments.length === 0 ? (
                  <p className="text-sm text-slate-400">{dictionary.detailNoPayments}</p>
                ) : (
                  <div className="space-y-2">
                    {viewSale.payments.map((pay) => (
                      <div key={pay.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{fmtBaht(pay.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {pay.method === "cash" ? dictionary.paymentMethodCash : dictionary.paymentMethodTransfer}
                            {pay.note ? ` · ${pay.note}` : ""}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">{fmtDate(pay.paid_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setViewSale(null)}
                  type="button"
                >
                  {dictionary.closeBtn}
                </button>
                {computeStatus(viewSale) !== "cancelled" && computeStatus(viewSale) !== "completed" ? (
                  <button
                    className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    onClick={() => handleCancelSale(viewSale.id)}
                    type="button"
                  >
                    {dictionary.cancelSaleBtn}
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {dictionary.printBillBtn}
                  </span>
                </button>
                {computeStatus(viewSale) !== "cancelled" && computeStatus(viewSale) !== "completed" ? (
                  <button
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    onClick={() => {
                      openPayment(viewSale);
                    }}
                    type="button"
                  >
                    {dictionary.receivePaymentBtn}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Payment modal ─────────────────────────────────────────────────────── */}
      {payingSale ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setPayingSale(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-emerald-600 px-6 py-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-white" />
                <h3 className="text-lg font-bold text-white">{dictionary.paymentTitle}</h3>
              </div>
              <button
                className="rounded-lg p-1 text-white/70 transition hover:bg-white/10"
                onClick={() => setPayingSale(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Outstanding */}
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">{dictionary.paymentOutstandingLabel}</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  {fmtBaht(Math.max(0, payingSale.total_amount - payingSale.paid_amount))}
                </p>
              </div>

              {payError ? (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{payError}</div>
              ) : null}

              {/* Amount */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.paymentAmountLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
                  min="0"
                  onChange={(e) => setPayAmount(e.target.value)}
                  step="0.01"
                  type="number"
                  value={payAmount}
                />
              </div>

              {/* Method */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.paymentMethodLabel}
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
                  onChange={(e) => setPayMethod(e.target.value as "cash" | "transfer")}
                  value={payMethod}
                >
                  <option value="cash">{dictionary.paymentMethodCash}</option>
                  <option value="transfer">{dictionary.paymentMethodTransfer}</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.paymentNoteLabel}
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={dictionary.paymentNotePlaceholder}
                  value={payNote}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setPayingSale(null)}
                  type="button"
                >
                  {dictionary.cancelBtn}
                </button>
                <button
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isPaySaving}
                  onClick={handlePayment}
                  type="button"
                >
                  {dictionary.paymentConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
