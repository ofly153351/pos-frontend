"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Check,
  CreditCard,
  FilePlus2,
  FileText,
  HandCoins,
  Minus,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Undo2,
  Wallet,
  X,
} from "lucide-react";

import { listCustomers, listCustomerLevelDiscounts } from "@/services/customers";
import { listProducts } from "@/services/products";
import {
  addCreditPayment,
  cancelCreditSale,
  createCreditSale,
  listCreditSales,
  returnCreditGoods,
} from "@/services/credit-sales";
import { ApiError } from "@/services/api";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type {
  CreditSale,
  CreditSaleItem,
  CreditSaleStatus,
  CreditSaleType,
} from "@/types/credit-sale";
import { CustomerCombobox } from "@/components/credit-sales/customer-combobox";
import { ProductCombobox, type ProductPick } from "@/components/credit-sales/product-combobox";
import { CreditStatementModal } from "@/components/credit-sales/credit-statement-modal";

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
  searchPlaceholder: string;
  scanWithCamera: string;
  skuLabel: string;
  stockLabel: string;
  priceLabel: string;
  unitLabel: string;
  noProductsFound: string;
  createSubtitle: string;
  creditDesc: string;
  loanDesc: string;
  dueDateOptional: string;
  noItemsYet: string;
  noItemsHint: string;
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
  returnGoodsBtn: string;
  returnTitle: string;
  returnSubtitle: string;
  returnColReturnable: string;
  returnColReturnQty: string;
  returnSubmitBtn: string;
  returnSaving: string;
  returnSuccess: string;
  returnNothingError: string;
  paymentMethodReturn: string;
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
  paymentExactBtn: string;
  paymentAmountError: string;
  empty: string;
  emptyHint: string;
  loading: string;
  createdSuccess: string;
  paymentSuccess: string;
  cancelSuccess: string;
  cancelFailed: string;
  noCustomersFound: string;
  stockExceeded: string;
  summaryItemsLabel: string;
  itemsUnit: string;
  colRemove: string;
  errInsufficientStock: string;
  errProductInactive: string;
  errInvalidItem: string;
  errProductNotFound: string;
  errOverpayment: string;
  errSaveFailed: string;
  errDiscountCap: string;
  colDiscount: string;
  discountUnitAmount: string;
  discountUnitPercent: string;
  billDiscountLabel: string;
  billDiscountPlaceholder: string;
  vatSectionTitle: string;
  vatToggleLabel: string;
  vatRateLabel: string;
  vatIncludedLabel: string;
  vatExclusiveLabel: string;
  sumSubtotal: string;
  sumLineDiscount: string;
  sumLevelDiscount: string;
  sumBillDiscount: string;
  sumAfterDiscount: string;
  sumVat: string;
  sumGrandTotal: string;
  listSearchPlaceholder: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterClear: string;
  rowCancelTitle: string;
  dashTitle: string;
  dashTotalValue: string;
  dashCollected: string;
  dashCollectionRate: string;
  dashThisMonthValue: string;
};

// Subset of the `creditStatement` i18n section consumed by the bill preview modal.
type BillModalDictionary = {
  title: string;
  print: string;
  close: string;
  loading: string;
  notFound: string;
};

type CreditSalesManagerProps = {
  dictionary: CreditSalesDictionary;
  billDictionary: BillModalDictionary;
  locale: string;
  prefilledCustomerId?: string;
  prefilledCustomerName?: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<CreditSaleStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const TYPE_CLASSES: Record<CreditSaleType, string> = {
  credit: "bg-violet-100 text-violet-700",
  loan: "bg-indigo-100 text-indigo-700",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

// Translate a create/payment API error into a readable, localized message. A
// backend 422 carries the specific reason in err.fields[].message; the generic
// top-level "validation failed" is never surfaced to the user.
function mapCreditError(err: unknown, d: CreditSalesDictionary): string {
  let raw = "";
  if (err instanceof ApiError) {
    raw = (err.fields?.[0]?.message || err.message || "").toLowerCase();
  } else if (err instanceof Error) {
    raw = err.message.toLowerCase();
  }
  if (raw.includes("insufficient")) return d.errInsufficientStock;
  if (raw.includes("inactive")) return d.errProductInactive;
  if (raw.includes("customer")) return d.noCustomerError;
  if (raw.includes("positive quantity") || raw.includes("product_id")) return d.errInvalidItem;
  if (raw.includes("not found")) return d.errProductNotFound;
  // Role-based bill-discount cap (e.g. cashier > 20% of subtotal). Must precede the
  // generic "exceeds" check below, whose text also contains "exceeds".
  if (raw.includes("allowed cap") || raw.includes("manual discount")) return d.errDiscountCap;
  if (raw.includes("exceeds") || raw.includes("overpay")) return d.errOverpayment;
  if (raw.includes("amount must") || raw.includes("greater than zero")) return d.paymentAmountError;
  return d.errSaveFailed;
}

function computeStatus(sale: CreditSale): CreditSaleStatus {
  if (sale.status === "cancelled") return "cancelled";
  if (sale.paid_amount >= sale.total_amount && sale.total_amount > 0) return "completed";
  const isOverdue = sale.due_date && new Date(sale.due_date) < new Date();
  if (sale.paid_amount > 0) return isOverdue ? "overdue" : "partial";
  return isOverdue ? "overdue" : "pending";
}

function fmtBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

// Money with 2 decimals — used for VAT/breakdown lines where rounding matters.
function fmtBaht2(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Draft line item (create form) ────────────────────────────────────────
// Carries an optional per-line discount. Mirrors the backend sale contract:
//   percent → discount_value is a % (≤100) applied per unit
//   amount  → user enters baht-off-the-whole-line; we convert to a per-unit amount
//             (capped at the unit price) on submit, exactly as POS does.
type DraftItem = {
  id: string;
  product_id: string;
  product_name: string;
  unit?: string;
  price: number;
  quantity: number;
  discountType: "amount" | "percent";
  discountValue: number;
};

function perUnitDiscount(it: DraftItem): number {
  if (!it.discountValue || it.discountValue <= 0 || it.quantity <= 0) return 0;
  if (it.discountType === "percent") {
    return (it.price * Math.min(100, it.discountValue)) / 100;
  }
  // amount = baht off the whole line → per-unit, never more than the unit price
  return Math.min(it.price, it.discountValue / it.quantity);
}

function lineDiscountAmount(it: DraftItem): number {
  return perUnitDiscount(it) * it.quantity;
}

function lineNet(it: DraftItem): number {
  return Math.max(0, it.price * it.quantity - lineDiscountAmount(it));
}

// Translate a draft line into the API item shape (discount sent only when > 0).
function toApiItem(it: DraftItem): {
  product_id: string;
  quantity: number;
  discount_type?: "amount" | "percent";
  discount_value?: number;
} {
  const base = { product_id: it.product_id, quantity: it.quantity };
  // Send the type/value pair together-or-not-at-all. A resolved per-unit of 0 (e.g. a
  // ฿0-priced line, or a percent on a ฿0 price) must NOT serialize with a value but no
  // type — the backend rejects that with ErrInvalidDiscountType.
  if (!it.discountValue || it.discountValue <= 0 || perUnitDiscount(it) <= 0) return base;
  if (it.discountType === "percent") {
    return { ...base, discount_type: "percent", discount_value: Math.min(100, it.discountValue) };
  }
  return { ...base, discount_type: "amount", discount_value: perUnitDiscount(it) };
}

// ─── Component ────────────────────────────────────────────────────────────
export function CreditSalesManager({
  dictionary,
  billDictionary,
  locale,
  prefilledCustomerId,
}: CreditSalesManagerProps) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Server is the source of truth — every terminal sees the same receivables.
  const salesQuery = useQuery({ queryKey: ["credit-sales"], queryFn: async () => (await listCreditSales()).data });
  const customersQuery = useQuery({ queryKey: ["credit", "customers"], queryFn: async () => (await listCustomers()).data });
  const productsQuery = useQuery({ queryKey: ["credit", "products"], queryFn: async () => (await listProducts({ limit: 9999, page: 1 })).data });
  // Customer level (network) discounts — the backend applies these automatically on every
  // credit sale (customer_id is required), so the form preview must mirror them too.
  const levelDiscountsQuery = useQuery({ queryKey: ["credit", "level-discounts"], queryFn: async () => (await listCustomerLevelDiscounts()).data });
  const sales = useMemo<CreditSale[]>(() => salesQuery.data ?? [], [salesQuery.data]);
  const customers = useMemo<Customer[]>(() => customersQuery.data ?? [], [customersQuery.data]);
  const products = useMemo<Product[]>(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const levelDiscounts = useMemo(() => levelDiscountsQuery.data ?? [], [levelDiscountsQuery.data]);
  const isLoading =
    salesQuery.isPending || customersQuery.isPending || productsQuery.isPending;
  const hasLoadError =
    salesQuery.isError || customersQuery.isError || productsQuery.isError;
  function retryLoad() {
    void salesQuery.refetch();
    void customersQuery.refetch();
    void productsQuery.refetch();
  }

  // ── Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "loan">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CreditSaleType>("credit");
  const [createCustomerId, setCreateCustomerId] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createItems, setCreateItems] = useState<DraftItem[]>([]);
  const [createNote, setCreateNote] = useState("");
  // Bill-level discount + VAT (default: VAT 7% exclusive — preserves prior behaviour
  // where credit sales silently inherited the store's 7% rate, now editable).
  const [createBillDiscount, setCreateBillDiscount] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState("7");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Idempotency: a retried/double-submit of the same draft reuses this key so the backend
  // returns the original receivable instead of minting a second real sale + AR. Reset on
  // confirmed success (and on opening a fresh form).
  const createIdemKeyRef = useRef("");

  // ── Detail modal
  const [viewSale, setViewSale] = useState<CreditSale | null>(null);

  // ── Bill preview modal (ใบวางบิล rendered by the shared document template)
  const [billSaleId, setBillSaleId] = useState<string | null>(null);

  // ── Payment modal
  const [payingSale, setPayingSale] = useState<CreditSale | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [isPaySaving, setIsPaySaving] = useState(false);

  // ── Return-goods modal (loan only)
  const [returningSale, setReturningSale] = useState<CreditSale | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnError, setReturnError] = useState("");
  const [isReturnSaving, setIsReturnSaving] = useState(false);

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

  // ─── Sales-value dashboard (distinct from the operational KPIs above): how much
  // has been sold on credit, how much collected, and the collection rate.
  const dash = useMemo(() => {
    // Credit sales only — loans are tracked by piece count (kpiLoanItems), not as
    // monetary receivables, so folding their value in would distort the collection rate.
    const active = sales.filter((s) => s.type === "credit" && computeStatus(s) !== "cancelled");
    const totalValue = active.reduce((sum, s) => sum + s.total_amount, 0);
    const collected = active.reduce((sum, s) => sum + s.paid_amount, 0);
    const now = new Date();
    const thisMonthValue = active
      .filter((s) => {
        const d = new Date(s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, s) => sum + s.total_amount, 0);
    const rate = totalValue > 0 ? Math.round((collected / totalValue) * 100) : 0;
    return { totalValue, collected, thisMonthValue, rate };
  }, [sales]);

  // ─── Create-form running totals (subtotal → discounts → VAT → grand total).
  // Mirrors the backend money math so the previewed grand total matches the
  // receivable the server will record.
  const createTotals = useMemo(() => {
    const subtotal = createItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const lineDiscount = createItems.reduce((s, it) => s + lineDiscountAmount(it), 0);
    const afterLine = Math.max(0, subtotal - lineDiscount);
    // Customer level (network) discount — backend applies it per-unit on the
    // after-line-discount base, so afterLine × pct/100 mirrors it.
    const cust = customers.find((c) => c.id === createCustomerId);
    const levelPct = cust
      ? Number(levelDiscounts.find((r) => r.level === Number(cust.level ?? 1))?.discount_percent ?? 0)
      : 0;
    const networkDiscount = Math.max(0, afterLine * Math.min(100, Math.max(0, levelPct)) / 100);
    const afterNetwork = Math.max(0, afterLine - networkDiscount);
    const billDiscount = Math.min(afterNetwork, Math.max(0, Number(createBillDiscount) || 0));
    const afterDiscount = Math.max(0, afterNetwork - billDiscount);
    const rate = vatEnabled ? Math.max(0, Number(vatRate) || 0) : 0;
    let vat = 0;
    let grandTotal = afterDiscount;
    if (rate > 0) {
      if (vatIncluded) {
        vat = afterDiscount - afterDiscount / (1 + rate / 100);
      } else {
        vat = afterDiscount * (rate / 100);
        grandTotal = afterDiscount + vat;
      }
    }
    // Backend stores the receivable total rounded to whole baht (math.Round) — mirror
    // that so the previewed grand total equals the saved receivable.
    grandTotal = Math.round(grandTotal);
    return { subtotal, lineDiscount, networkDiscount, levelPct, afterLine, billDiscount, afterDiscount, rate, vat, grandTotal };
  }, [createItems, createBillDiscount, vatEnabled, vatRate, vatIncluded, createCustomerId, customers, levelDiscounts]);

  // ─── Filtered list
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return sales
      .map((s) => ({ ...s, _status: computeStatus(s) }))
      .filter((s) => {
        if (typeFilter !== "all" && s.type !== typeFilter) return false;
        if (statusFilter !== "all" && s._status !== statusFilter) return false;
        if (q) {
          const hay = `${s.document_number} ${s.customer_name} ${s.customer_phone ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (from || to) {
          const created = new Date(s.created_at);
          if (from && created < from) return false;
          if (to && created > to) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sales, typeFilter, statusFilter, searchText, dateFrom, dateTo]);

  const filtersActive =
    typeFilter !== "all" || statusFilter !== "all" || Boolean(searchText.trim()) || Boolean(dateFrom) || Boolean(dateTo);
  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
  }

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
    createIdemKeyRef.current = "";
    setCreateType("credit");
    setCreateCustomerId(prefilledCustomerId ?? "");
    setCreateDueDate("");
    setCreateItems([]);
    setCreateNote("");
    setCreateBillDiscount("");
    setVatEnabled(true);
    setVatRate("7");
    setVatIncluded(false);
    setCreateError("");
    setIsCreateOpen(true);
  }


  // ─── Save create (POST → real stock-deducting sale + receivable, server-side)
  async function handleCreate() {
    setCreateError("");
    if (!createCustomerId) { setCreateError(dictionary.noCustomerError); return; }
    if (createItems.length === 0) { setCreateError(dictionary.noItemsError); return; }

    setIsSaving(true);
    try {
      if (!createIdemKeyRef.current) {
        createIdemKeyRef.current =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `credit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      await createCreditSale(
        {
          type: createType,
          customer_id: createCustomerId,
          due_date: createDueDate,
          note: createNote.trim() || undefined,
          down_payment: 0,
          items: createItems.map(toApiItem),
          bill_discount: createTotals.billDiscount > 0 ? createTotals.billDiscount : undefined,
          vat_percent: vatEnabled ? createTotals.rate : 0,
          vat_included: vatIncluded,
        },
        createIdemKeyRef.current,
      );
      createIdemKeyRef.current = ""; // confirmed success → next create gets a fresh key
      await queryClient.invalidateQueries({ queryKey: ["credit-sales"] });
      setIsCreateOpen(false);
      setSuccess(dictionary.createdSuccess);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setCreateError(mapCreditError(err, dictionary));
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Update a pending item's quantity (capped at available stock)
  function updateCreateItemQty(id: string, nextQty: number) {
    setCreateItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const stock =
          products.find((p) => p.id === it.product_id)?.total_stock ?? Number.MAX_SAFE_INTEGER;
        const q = Math.min(Math.max(1, Math.floor(nextQty) || 1), Math.max(1, stock));
        // A whole-line "amount" discount is entered against the line subtotal at the time
        // it was set; re-clamp it to the new subtotal so lowering qty can't silently turn
        // it into a 100%-off (zero) line.
        let discountValue = it.discountValue;
        if (it.discountType === "amount" && discountValue > q * it.price) {
          discountValue = q * it.price;
        }
        return { ...it, quantity: q, discountValue };
      }),
    );
  }

  function updateCreateItemDiscount(id: string, type: "amount" | "percent", value: number) {
    setCreateItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, discountType: type, discountValue: Math.max(0, value) } : it,
      ),
    );
  }

  function removeCreateItem(id: string) {
    setCreateItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ─── Save payment (POST → updates the receivable + payment-history timeline)
  async function handlePayment() {
    if (!payingSale) return;
    setPayError("");
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError(dictionary.paymentAmountError);
      return;
    }
    setIsPaySaving(true);
    try {
      const res = await addCreditPayment(payingSale.id, {
        amount,
        method: payMethod,
        note: payNote.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["credit-sales"] });
      if (viewSale && viewSale.id === payingSale.id) setViewSale(res.data);
      setPayingSale(null);
      setPayAmount("");
      setPayNote("");
      setSuccess(dictionary.paymentSuccess);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setPayError(mapCreditError(err, dictionary));
    } finally {
      setIsPaySaving(false);
    }
  }

  // ─── Cancel sale (POST → restock + bad-debt expense, server-side)
  async function handleCancelSale(saleId: string) {
    if (!window.confirm(dictionary.cancelConfirm)) return;
    setActionError("");
    try {
      await cancelCreditSale(saleId);
      await queryClient.invalidateQueries({ queryKey: ["credit-sales"] });
      if (viewSale?.id === saleId) setViewSale(null);
      setSuccess(dictionary.cancelSuccess);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : dictionary.cancelFailed);
      setTimeout(() => setActionError(""), 6000);
    }
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

  // ─── Payment amount numpad (touch-friendly) ──────────────────────────────
  // Money entered as up-to-2-decimal digits; Number() on submit does the real
  // parsing/validation. Mirrors the POS checkout numpad input contract.
  function payAmountPattern(value: string): boolean {
    return /^\d*\.?\d{0,2}$/.test(value);
  }
  function onPayAmountInput(value: string) {
    if (payAmountPattern(value)) setPayAmount(value.slice(0, 10));
  }
  function payNumpadDigit(d: string) {
    setPayAmount((prev) => {
      const next = prev + d;
      if (!payAmountPattern(next) || next.length > 10) return prev;
      return next;
    });
  }
  function payNumpadClear() {
    setPayAmount("");
  }
  function payNumpadBackspace() {
    setPayAmount((prev) => prev.slice(0, -1));
  }
  function payNumpadExact() {
    if (!payingSale) return;
    setPayAmount(String(Math.max(0, payingSale.total_amount - payingSale.paid_amount)));
  }

  // ─── Return goods (loan): prefill each line's full returnable quantity
  function returnableOf(item: CreditSaleItem): number {
    return Math.max(0, item.quantity - (item.returned_qty ?? 0));
  }
  function openReturn(sale: CreditSale) {
    const prefill: Record<string, number> = {};
    sale.items.forEach((it) => {
      const key = it.product_id ?? it.id;
      prefill[key] = returnableOf(it);
    });
    setReturnQtys(prefill);
    setReturnError("");
    setReturningSale(sale);
  }
  async function handleReturn() {
    if (!returningSale) return;
    setReturnError("");
    const items = returningSale.items
      .map((it) => ({ product_id: it.product_id ?? "", quantity: returnQtys[it.product_id ?? it.id] ?? 0 }))
      .filter((x) => x.product_id && x.quantity > 0);
    if (items.length === 0) {
      setReturnError(dictionary.returnNothingError);
      return;
    }
    setIsReturnSaving(true);
    try {
      const res = await returnCreditGoods(returningSale.id, { items });
      await queryClient.invalidateQueries({ queryKey: ["credit-sales"] });
      if (viewSale && viewSale.id === returningSale.id) setViewSale(res.data);
      setReturningSale(null);
      setSuccess(dictionary.returnSuccess);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setReturnError(mapCreditError(err, dictionary));
    } finally {
      setIsReturnSaving(false);
    }
  }

  // ─── Loading
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{dictionary.loading}</p>
      </div>
    );
  }

  // ─── Error
  if (hasLoadError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <QueryErrorState locale={locale} onRetry={retryLoad} className="max-w-md" />
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ReportKpiCard
          label={dictionary.kpiTotalPending}
          value={fmtBaht(kpi.totalPending)}
          icon={<HandCoins className="h-5 w-5" />}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
        />
        <ReportKpiCard
          label={dictionary.kpiOverdue}
          value={String(kpi.overdue)}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <ReportKpiCard
          label={dictionary.kpiLoanItems}
          value={String(kpi.loanItems)}
          icon={<BookOpen className="h-5 w-5" />}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <ReportKpiCard
          label={dictionary.kpiThisMonth}
          value={String(kpi.thisMonth)}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
        />
      </div>

      {/* Sales-value dashboard */}
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Wallet className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800">{dictionary.dashTitle}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">{dictionary.dashTotalValue}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{fmtBaht(dash.totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{dictionary.dashCollected}</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{fmtBaht(dash.collected)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{dictionary.dashThisMonthValue}</p>
            <p className="mt-1 text-xl font-bold text-violet-700">{fmtBaht(dash.thisMonthValue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{dictionary.dashCollectionRate}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{dash.rate}%</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${dash.rate}%` }} />
            </div>
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
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={dictionary.listSearchPlaceholder}
              value={searchText}
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              aria-label={dictionary.filterDateFrom}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-violet-500"
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              value={dateFrom}
            />
            <span className="text-slate-400">–</span>
            <input
              aria-label={dictionary.filterDateTo}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-violet-500"
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              value={dateTo}
            />
          </div>
          {filtersActive ? (
            <button
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              onClick={clearFilters}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
              {dictionary.filterClear}
            </button>
          ) : null}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <CreditCard className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{dictionary.empty}</p>
            <p className="text-xs text-slate-400">{dictionary.emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pretty-scroll">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">{dictionary.tableDocNo}</th>
                  <th className="px-3 py-2.5">{dictionary.tableCustomer}</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">{dictionary.tableType}</th>
                  <th className="px-3 py-2.5 text-right">{dictionary.tableAmountQty}</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">{dictionary.tablePaidProgress}</th>
                  <th className="px-3 py-2.5 text-right">{dictionary.tableRemaining}</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">{dictionary.tableDueDate}</th>
                  <th className="px-3 py-2.5">{dictionary.tableStatus}</th>
                  <th className="px-3 py-2.5 text-right">{dictionary.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {filtered.map((sale) => {
                  const liveStatus = sale._status;
                  const remaining = Math.max(0, sale.total_amount - sale.paid_amount);
                  const pct = sale.total_amount > 0 ? Math.min(100, (sale.paid_amount / sale.total_amount) * 100) : 0;
                  const totalQty = sale.items.reduce((n, i) => n + i.quantity, 0);
                  return (
                    <tr
                      key={sale.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => {
                        setActionError("");
                        setViewSale(sale);
                      }}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 nums text-xs font-medium text-slate-700">
                        {sale.document_number}
                      </td>
                      <td className="max-w-[160px] px-3 py-2.5">
                        <p className="truncate font-medium text-slate-900">{sale.customer_name}</p>
                        {sale.customer_phone ? (
                          <p className="truncate text-xs text-slate-400">{sale.customer_phone}</p>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_CLASSES[sale.type]}`}>
                          {typeLabel(sale.type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {sale.type === "credit" ? (
                          <p className="font-semibold text-slate-800">{fmtBaht(sale.total_amount)}</p>
                        ) : (
                          <p className="font-semibold text-slate-800">{totalQty} {dictionary.pieces}</p>
                        )}
                      </td>
                      <td className="hidden px-3 py-2.5 lg:table-cell">
                        <div className="w-[100px] space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">{Math.round(pct)}%</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-rose-600">
                        {remaining > 0 ? fmtBaht(remaining) : "—"}
                      </td>
                      <td className="hidden px-3 py-2.5 xl:table-cell text-slate-600">
                        <p className={`whitespace-nowrap ${new Date(sale.due_date) < new Date() && liveStatus !== "completed" && liveStatus !== "cancelled" ? "font-medium text-rose-600" : ""}`}>
                          {fmtDate(sale.due_date)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[liveStatus]}`}>
                          {statusLabel(liveStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {liveStatus !== "cancelled" && liveStatus !== "completed" ? (
                            <button
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSale(sale.id);
                              }}
                              title={dictionary.rowCancelTitle}
                              type="button"
                              aria-label={dictionary.rowCancelTitle}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
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
            <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                  <FilePlus2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">{dictionary.createTitle}</h3>
                  <p className="mt-0.5 text-xs text-violet-100">{dictionary.createSubtitle}</p>
                </div>
              </div>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-4">
              {/* Type cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "credit" as const, Icon: Pencil, title: dictionary.tabCredit, desc: dictionary.creditDesc },
                  { key: "loan" as const, Icon: ArrowLeftRight, title: dictionary.tabLoan, desc: dictionary.loanDesc },
                ].map((opt) => {
                  const selected = createType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCreateType(opt.key)}
                      className={`relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                        selected
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <opt.Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{opt.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
                      </div>
                      {selected ? (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
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
                  <CustomerCombobox
                    customers={customers}
                    value={createCustomerId}
                    onChange={setCreateCustomerId}
                    labels={{
                      placeholder: dictionary.customerPlaceholder,
                      noResults: dictionary.noCustomersFound,
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {dictionary.dueDateLabel}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    type="date"
                    value={createDueDate}
                  />
                  <p className="mt-1 text-xs text-slate-400">{dictionary.dueDateOptional}</p>
                </div>
              </div>

              {/* Items section */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">{dictionary.productsLabel}</p>
                {/* Add item row */}
                <div className="mb-3">
                  <ProductCombobox
                    products={products}
                    cartQtyOf={(id) =>
                      createItems.find((i) => i.product_id === id)?.quantity ?? 0
                    }
                    labels={{
                      searchPlaceholder: dictionary.searchPlaceholder,
                      scanWithCamera: dictionary.scanWithCamera,
                      skuLabel: dictionary.skuLabel,
                      stockLabel: dictionary.stockLabel,
                      noProductsFound: dictionary.noProductsFound,
                      stockExceeded: dictionary.stockExceeded,
                    }}
                    onAdd={(pick: ProductPick) =>
                      setCreateItems((prev) => {
                        const stock =
                          products.find((p) => p.id === pick.product_id)?.total_stock ??
                          Number.MAX_SAFE_INTEGER;
                        const existing = prev.find((it) => it.product_id === pick.product_id);
                        // Re-selecting the same product bumps its quantity (capped at
                        // available stock) instead of creating a duplicate row.
                        if (existing) {
                          const nextQty = Math.min(
                            existing.quantity + pick.quantity,
                            Math.max(1, stock),
                          );
                          return prev.map((it) =>
                            it.product_id === pick.product_id
                              ? { ...it, quantity: nextQty }
                              : it,
                          );
                        }
                        const qty = Math.min(pick.quantity, Math.max(1, stock));
                        return [
                          ...prev,
                          {
                            id: pick.product_id,
                            product_id: pick.product_id,
                            product_name: pick.product_name,
                            unit: pick.unit,
                            price: pick.price,
                            quantity: qty,
                            discountType: "amount" as const,
                            discountValue: 0,
                          },
                        ];
                      })
                    }
                  />
                </div>

                {/* Items list — always shown, with an empty state */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2.5">{dictionary.colName}</th>
                        <th className="px-3 py-2.5 text-right">{dictionary.colPrice}</th>
                        <th className="px-3 py-2.5 text-right">{dictionary.colQty}</th>
                        <th className="px-3 py-2.5 text-right">{dictionary.colDiscount}</th>
                        <th className="px-3 py-2.5 text-right">{dictionary.colTotal}</th>
                        <th className="px-3 py-2.5 text-center">{dictionary.colRemove}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {createItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-10 text-center">
                            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                              <ShoppingCart className="h-6 w-6" />
                            </span>
                            <p className="text-sm font-semibold text-slate-600">{dictionary.noItemsYet}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{dictionary.noItemsHint}</p>
                          </td>
                        </tr>
                      ) : (
                        createItems.map((item) => {
                          const stock =
                            products.find((p) => p.id === item.product_id)?.total_stock ??
                            Number.MAX_SAFE_INTEGER;
                          const discAmt = lineDiscountAmount(item);
                          return (
                            <tr key={item.id}>
                              <td className="px-3 py-2 text-slate-900">
                                <span className="block max-w-[160px] truncate" title={item.product_name}>{item.product_name}</span>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600">{fmtBaht(item.price)}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                    disabled={item.quantity <= 1}
                                    onClick={() => updateCreateItemQty(item.id, item.quantity - 1)}
                                    type="button"
                                    aria-label="decrease"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <input
                                    className="h-7 w-12 rounded-md border border-slate-200 text-center text-sm outline-none focus:border-violet-500"
                                    inputMode="numeric"
                                    onChange={(e) => updateCreateItemQty(item.id, Number(e.target.value))}
                                    value={item.quantity}
                                  />
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                    disabled={item.quantity >= stock}
                                    onClick={() => updateCreateItemQty(item.id, item.quantity + 1)}
                                    type="button"
                                    aria-label="increase"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                              {/* Per-line discount: value + amount/percent toggle */}
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    className="h-7 w-16 rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-violet-500"
                                    inputMode="decimal"
                                    min="0"
                                    onChange={(e) =>
                                      updateCreateItemDiscount(item.id, item.discountType, Number(e.target.value) || 0)
                                    }
                                    value={item.discountValue || ""}
                                    placeholder="0"
                                  />
                                  <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs">
                                    {(["amount", "percent"] as const).map((dt) => (
                                      <button
                                        key={dt}
                                        type="button"
                                        className={`px-1.5 py-1 font-semibold transition ${
                                          item.discountType === dt
                                            ? "bg-violet-600 text-white"
                                            : "bg-white text-slate-500 hover:bg-slate-50"
                                        }`}
                                        onClick={() => updateCreateItemDiscount(item.id, dt, item.discountValue)}
                                      >
                                        {dt === "amount" ? dictionary.discountUnitAmount : dictionary.discountUnitPercent}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {discAmt > 0 ? (
                                  <span className="block text-[11px] text-slate-400 line-through">{fmtBaht(item.price * item.quantity)}</span>
                                ) : null}
                                <span className="font-medium text-slate-800">{fmtBaht(lineNet(item))}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => removeCreateItem(item.id)}
                                  type="button"
                                  aria-label="remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.noteLabel}</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder={dictionary.notePlaceholder}
                  value={createNote}
                />
              </div>

              {/* Bill discount + VAT controls */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.billDiscountLabel}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">฿</span>
                    <input
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-violet-500"
                      inputMode="decimal"
                      min="0"
                      onChange={(e) => setCreateBillDiscount(e.target.value)}
                      placeholder={dictionary.billDiscountPlaceholder}
                      value={createBillDiscount}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      checked={vatEnabled}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      onChange={(e) => setVatEnabled(e.target.checked)}
                      type="checkbox"
                    />
                    {dictionary.vatSectionTitle}
                  </label>
                  {vatEnabled ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="relative">
                        <input
                          className="h-9 w-20 rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-violet-500"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          onChange={(e) => setVatRate(e.target.value)}
                          value={vatRate}
                          aria-label={dictionary.vatRateLabel}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                      </div>
                      <select
                        className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-violet-500"
                        onChange={(e) => setVatIncluded(e.target.value === "included")}
                        value={vatIncluded ? "included" : "exclusive"}
                      >
                        <option value="exclusive">{dictionary.vatExclusiveLabel}</option>
                        <option value="included">{dictionary.vatIncludedLabel}</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Totals breakdown */}
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm">
                <div className="flex items-center justify-between py-0.5 text-slate-600">
                  <span>{dictionary.sumSubtotal}</span>
                  <span className="nums">{fmtBaht2(createTotals.subtotal)}</span>
                </div>
                {createTotals.lineDiscount > 0 ? (
                  <div className="flex items-center justify-between py-0.5 text-rose-600">
                    <span>{dictionary.sumLineDiscount}</span>
                    <span className="nums">−{fmtBaht2(createTotals.lineDiscount)}</span>
                  </div>
                ) : null}
                {createTotals.networkDiscount > 0 ? (
                  <div className="flex items-center justify-between py-0.5 text-rose-600">
                    <span>{dictionary.sumLevelDiscount} ({createTotals.levelPct}%)</span>
                    <span className="nums">−{fmtBaht2(createTotals.networkDiscount)}</span>
                  </div>
                ) : null}
                {createTotals.billDiscount > 0 ? (
                  <div className="flex items-center justify-between py-0.5 text-rose-600">
                    <span>{dictionary.sumBillDiscount}</span>
                    <span className="nums">−{fmtBaht2(createTotals.billDiscount)}</span>
                  </div>
                ) : null}
                {createTotals.rate > 0 ? (
                  <div className="flex items-center justify-between py-0.5 text-slate-600">
                    <span>
                      {dictionary.sumVat} ({createTotals.rate}% · {vatIncluded ? dictionary.vatIncludedLabel : dictionary.vatExclusiveLabel})
                    </span>
                    <span className="nums">{fmtBaht2(createTotals.vat)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-violet-200 pt-2.5">
                  <span className="font-semibold text-slate-700">{dictionary.sumGrandTotal}</span>
                  <span className="nums text-lg font-bold text-violet-800">{fmtBaht(createTotals.grandTotal)}</span>
                </div>
              </div>

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
                  className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleCreate}
                  type="button"
                >
                  <Check className="h-4 w-4" /> {isSaving ? dictionary.saving : dictionary.saveBtn}
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
            <div className="flex items-start justify-between bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-4">
              <div>
                <p className="nums text-lg font-bold text-white">{viewSale.document_number}</p>
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
                      {viewSale.items.map((item, index) => (
                        <tr key={`${item.id ?? item.product_id ?? item.product_name}-${index}`}>
                          <td className="px-3 py-2 text-slate-900">
                            <span className="block max-w-[180px] truncate" title={item.product_name}>{item.product_name}</span>
                          </td>
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
                    {viewSale.payments.map((pay, index) => (
                      <div key={`${pay.id ?? "pay"}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{fmtBaht(pay.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {pay.method === "cash"
                              ? dictionary.paymentMethodCash
                              : pay.method === "return"
                                ? dictionary.paymentMethodReturn
                                : dictionary.paymentMethodTransfer}
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

            {actionError ? (
              <div className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
                {actionError}
              </div>
            ) : null}

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
                  onClick={() => setBillSaleId(viewSale.id)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {dictionary.printBillBtn}
                  </span>
                </button>
                {viewSale.type === "loan" &&
                computeStatus(viewSale) !== "cancelled" &&
                computeStatus(viewSale) !== "completed" &&
                viewSale.items.some((it) => returnableOf(it) > 0) ? (
                  <button
                    className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                    onClick={() => openReturn(viewSale)}
                    type="button"
                  >
                    <span className="flex items-center gap-1.5">
                      <Undo2 className="h-4 w-4" />
                      {dictionary.returnGoodsBtn}
                    </span>
                  </button>
                ) : null}
                {computeStatus(viewSale) !== "cancelled" && computeStatus(viewSale) !== "completed" ? (
                  <button
                    className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
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

      {/* ── Bill preview modal (ใบวางบิล) ───────────────────────────────────────── */}
      {billSaleId ? (
        <CreditStatementModal
          creditSaleId={billSaleId}
          open={billSaleId !== null}
          onClose={() => setBillSaleId(null)}
          dict={billDictionary}
        />
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
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-4">
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

            <div className="max-h-[90vh] space-y-4 overflow-y-auto p-6">
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
                  className="w-full rounded-xl border-2 border-violet-400 bg-violet-50 px-4 py-3 text-center text-2xl font-bold tabular-nums text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  inputMode="decimal"
                  onChange={(e) => onPayAmountInput(e.target.value)}
                  placeholder="0"
                  type="text"
                  value={payAmount}
                />

                {/* Quick full-balance + touch numpad */}
                <button
                  className="mt-2 w-full rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.99]"
                  onClick={payNumpadExact}
                  type="button"
                >
                  {dictionary.paymentExactBtn}
                </button>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      className="flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                      onClick={() => payNumpadDigit(d)}
                      type="button"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    className="flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 active:scale-95"
                    onClick={payNumpadClear}
                    type="button"
                  >
                    C
                  </button>
                  <button
                    className="flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                    onClick={() => payNumpadDigit("0")}
                    type="button"
                  >
                    0
                  </button>
                  <button
                    className="flex min-h-[3rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                    onClick={payNumpadBackspace}
                    type="button"
                  >
                    ⌫
                  </button>
                </div>
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
                  className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
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

      {/* ── Return-goods modal (loan only) ─────────────────────────────────────── */}
      {returningSale ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setReturningSale(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-4">
              <div className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-white" />
                <div>
                  <h3 className="text-lg font-bold text-white">{dictionary.returnTitle}</h3>
                  <p className="text-xs text-violet-100">{dictionary.returnSubtitle}</p>
                </div>
              </div>
              <button
                className="rounded-lg p-1 text-white/70 transition hover:bg-white/10"
                onClick={() => setReturningSale(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              {returnError ? (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{returnError}</div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">{dictionary.colName}</th>
                      <th className="px-3 py-2 text-right">{dictionary.returnColReturnable}</th>
                      <th className="px-3 py-2 text-right">{dictionary.returnColReturnQty}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {returningSale.items.map((it) => {
                      const key = it.product_id ?? it.id;
                      const returnable = returnableOf(it);
                      return (
                        <tr key={key}>
                          <td className="px-3 py-2 text-slate-900">
                            <span className="block max-w-[220px] truncate" title={it.product_name}>{it.product_name}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {returnable} / {it.quantity}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              className="h-8 w-16 rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-violet-500 disabled:bg-slate-50"
                              disabled={returnable <= 0}
                              inputMode="numeric"
                              max={returnable}
                              min={0}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(returnable, Math.floor(Number(e.target.value) || 0)));
                                setReturnQtys((prev) => ({ ...prev, [key]: v }));
                              }}
                              value={returnQtys[key] ?? 0}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setReturningSale(null)}
                  type="button"
                >
                  {dictionary.cancelBtn}
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                  disabled={isReturnSaving}
                  onClick={handleReturn}
                  type="button"
                >
                  <Undo2 className="h-4 w-4" /> {isReturnSaving ? dictionary.returnSaving : dictionary.returnSubmitBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
