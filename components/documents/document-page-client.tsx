"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Download, FileBadge, FileDigit, FileMinus, FileQuestion, FileStack, FileText, LayoutGrid, Loader2, Package, Printer, Receipt, Search, X } from "lucide-react";

import { getCurrentStoreId } from "@/lib/store-storage";
import {
  bulkDocumentAction,
  getDocuments,
  updateDocumentStatus,
} from "@/services/documents";
import { listSales, getSaleReceiptHtml } from "@/services/sales";
import { toast } from "@/components/ui/toast";
import type { DocumentListQuery, DocumentStatus, DocumentType } from "@/types/document";
import type { Sale } from "@/types/sale";

import { DocumentFilterBar } from "./document-filter-bar";
import { DocumentStatsCards } from "./document-stats-cards";
import { DocumentTable } from "./document-table";
import { DocumentPreviewPanel } from "./document-preview-panel";
import { CreateDocumentModal } from "./create-document-modal";

type DocumentDict = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  filter: string;
  resetFilter: string;
  allTypes: string;
  allStatuses: string;
  allCustomers: string;
  allStaff: string;
  allPayments: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  statusDraft: string;
  statusPending: string;
  statusOverdue: string;
  statusCompleted: string;
  statusCancelled: string;
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
  statsTotal: string;
  statsPending: string;
  statsOverdue: string;
  statsPaid: string;
  exportExcel: string;
  printReport: string;
  createDocument: string;
  selectedCount: string;
  print: string;
  send: string;
  changeStatus: string;
  delete: string;
  cancelSelection: string;
  colDocumentNo: string;
  colType: string;
  colCustomer: string;
  colDate: string;
  colDueDate: string;
  colAmount: string;
  colStatus: string;
  colPaymentStatus: string;
  colActions: string;
  showing: string;
  of: string;
  records: string;
  perPage: string;
  copy: string;
  moreOptions: string;
  previewTitle: string;
  documentNo: string;
  date: string;
  dueDate: string;
  customer: string;
  items: string;
  subtotal: string;
  vat: string;
  total: string;
  relatedDocs: string;
  viewFull: string;
  downloadPDF: string;
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  documentDate: string;
  optionalDueDate: string;
  addItem: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  enableVat: string;
  notes: string;
  cancel: string;
  create: string;
  createSuccess: string;
  createError: string;
  deleteSuccess: string;
  deleteError: string;
  statusUpdateSuccess: string;
  statusUpdateError: string;
  noDocuments: string;
  noDocumentsHint: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  confirm: string;
  units: string;
  phone: string;
  sellerTaxId: string;
  loading: string;
  requestFailed: string;
  noResults: string;
  tabDocuments: string;
  tabReceipts: string;
  receiptPaymentMethod: string;
  receiptViewBtn: string;
  receiptInvoiceBtn: string;
  receiptEmpty: string;
  receiptLoadError: string;
  receiptStatsTotal: string;
  receiptStatsPaid: string;
  receiptStatsAmount: string;
  receiptModeName: string;
  printAll: string;
  printError: string;
  productSearch: string;
  productNotFound: string;
};

type Props = { dictionary: DocumentDict };

const EMPTY_STATS = { total: 0, pending_payment: 0, overdue: 0, paid: 0 };
const DEFAULT_QUERY: DocumentListQuery = { page: 1, limit: 20 };

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(n);
}
function fmtDateTime(s: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

export function DocumentPageClient({ dictionary: d }: Props) {
  const queryClient = useQueryClient();
  const params = useParams();
  const locale = (params?.locale as string) ?? "th";
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => { setStoreId(getCurrentStoreId()); }, []);

  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const receiptIframeRef = useRef<HTMLIFrameElement>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const [query, setQuery] = useState<DocumentListQuery>(DEFAULT_QUERY);

  const isReceiptMode = query.type === "RECEIPT";

  useEffect(() => {
    if (!isReceiptMode || !storeId) return;
    setSalesLoading(true);
    setSalesError("");
    listSales()
      .then((r) => setSales(r.data ?? []))
      .catch(() => setSalesError(d.receiptLoadError))
      .finally(() => setSalesLoading(false));
  }, [isReceiptMode, storeId, d.receiptLoadError]);

  function openReceipt(saleId: string) {
    setReceiptLoadingId(saleId);
    getSaleReceiptHtml(saleId)
      .then((html) => {
        const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=700");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      })
      .catch(() => toast.error(d.receiptLoadError))
      .finally(() => setReceiptLoadingId(null));
  }

  // Receipt slide panel — fetch HTML for selected sale
  const { data: receiptHtml, isLoading: receiptHtmlLoading } = useQuery({
    queryKey: ["sale-receipt-html", selectedReceiptId],
    queryFn: () => getSaleReceiptHtml(selectedReceiptId!),
    enabled: !!selectedReceiptId,
    staleTime: 60_000,
  });

  // Print from the panel's already-rendered iframe — smooth, no hidden iframe creation
  function printReceipt() {
    const fw = receiptIframeRef.current?.contentWindow;
    if (!fw) return;
    fw.focus();
    fw.print();
  }

  const [multiPrinting, setMultiPrinting] = useState(false);

  async function multiPrint() {
    if (multiPrinting) return;
    setMultiPrinting(true);
    const ids = Array.from(selectedSaleIds);
    for (const id of ids) {
      try {
        const html = await getSaleReceiptHtml(id);
        await new Promise<void>((resolve) => {
          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          const frame = document.createElement("iframe");
          frame.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
          document.body.appendChild(frame);
          frame.src = blobUrl;
          frame.onload = () => {
            // Small delay so content paints before dialog opens
            setTimeout(() => {
              frame.contentWindow?.focus();
              frame.contentWindow?.print();
              setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); resolve(); }, 1500);
            }, 150);
          };
        });
        // Gap between each print dialog so browser doesn't stack them
        await new Promise((r) => setTimeout(r, 800));
      } catch { /* skip failed */ }
    }
    setMultiPrinting(false);
    toast.success(`พิมพ์ ${ids.length} ใบเสร็จเรียบร้อย`);
  }

  function exportCSV() {
    const ids = selectedSaleIds.size > 0 ? selectedSaleIds : new Set(sales.map((s) => s.id));
    const rows = [
      ["วันที่", "ลูกค้า", "วิธีชำระเงิน", "ยอดรวม (฿)"],
      ...sales
        .filter((s) => ids.has(s.id))
        .map((s) => [
          fmtDateTime(s.created_at),
          s.customer_name?.trim() || "ลูกค้าทั่วไป",
          s.payment_method ?? "",
          String(s.total_amount ?? 0),
        ]),
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSaleId(id: string) {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalType, setCreateModalType] = useState<DocumentType | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  const { data, isLoading } = useQuery({
    queryKey: ["documents", storeId, query],
    queryFn: () => getDocuments(query),
    enabled: !!storeId,
    placeholderData: (prev) => prev,
  });

  const documents = data?.items ?? [];
  const stats = data?.stats ?? EMPTY_STATS;
  const total = data?.total ?? 0;

  const updateQuery = useCallback((patch: Partial<DocumentListQuery>) => {
    setQuery((q) => ({ ...q, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setQuery(DEFAULT_QUERY);
    setSelectedIds(new Set());
  }, []);

  function handleSelectDoc(id: string) {
    setSelectedDocId((prev) => (prev === id ? null : id));
  }

  function handleToggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (documents.every((d) => selectedIds.has(d.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  function handleBulkDelete() {
    if (!window.confirm(d.confirmDeleteMessage.replace("{n}", String(selectedIds.size)))) return;
    startBulkTransition(async () => {
      try {
        await bulkDocumentAction({ ids: Array.from(selectedIds), action: "DELETE" });
        toast.success(d.deleteSuccess);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        toast.error(d.deleteError);
      }
    });
  }

  function handleBulkStatus(status: DocumentStatus) {
    startBulkTransition(async () => {
      try {
        await bulkDocumentAction({ ids: Array.from(selectedIds), action: "SET_STATUS", status });
        toast.success(d.statusUpdateSuccess);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        toast.error(d.statusUpdateError);
      }
    });
  }

  function handleModalSuccess() {
    setCreateModalType(null);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm">
        {/* Page header */}
        <div className="shrink-0 border-b border-violet-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{d.title}</h1>
              <p className="text-xs text-slate-500">{d.subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-xl border border-violet-100 bg-violet-50 p-1">
              <button
                type="button"
                onClick={() => updateQuery({ type: "" as DocumentType | "", page: 1 })}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  !isReceiptMode
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-violet-600"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                เอกสาร
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ type: "RECEIPT" as DocumentType, page: 1 })}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  isReceiptMode
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-violet-600"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                {d.receiptModeName}
              </button>
            </div>
          </div>
        </div>

        <>
            {/* Type quick-filter — icon buttons, centered, with tooltip */}
            <div className="shrink-0 border-b border-violet-50 px-6 py-2.5">
              <div className="flex items-center justify-center gap-1">
                {([
                  { type: "",           label: d.allTypes,      Icon: LayoutGrid   },
                  { type: "INVOICE",    label: d.typeInvoice,   Icon: FileText     },
                  { type: "BILL",       label: d.typeBill,      Icon: FileDigit    },
                  { type: "TAX_INVOICE",label: d.typeTaxInvoice,Icon: FileBadge    },
                  { type: "QUOTATION",  label: d.typeQuotation, Icon: FileQuestion },
                  { type: "CREDIT_NOTE",label: d.typeCreditNote,Icon: FileMinus    },
                ] as { type: string; label: string; Icon: React.ComponentType<{ className?: string }> }[]).map(({ type, label, Icon }) => {
                  const active = (query.type ?? "") === type;
                  return (
                    <div key={type || "all"} className="group relative">
                      <button
                        type="button"
                        onClick={() => updateQuery({ type: type as DocumentType | "", page: 1 })}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                          active
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {label}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter bar */}
            {!isReceiptMode && (
              <>
                <DocumentFilterBar
                  dict={d}
                  query={query}
                  onChange={updateQuery}
                  onReset={resetFilters}
                />
                <DocumentStatsCards
                  dict={d}
                  stats={stats}
                  defaultCreateType={(query.type as DocumentType) || "INVOICE"}
                  onExport={() => toast.info(d.exportExcel)}
                  onPrint={() => window.print()}
                  onCreateDocument={(type) => setCreateModalType(type)}
                />
              </>
            )}
          </>

        {/* Body: documents table + preview panel */}
        {!isReceiptMode && <div className="flex min-h-0 flex-1">
          <DocumentTable
            dict={d}
            documents={documents}
            total={total}
            page={query.page ?? 1}
            limit={query.limit ?? 20}
            isLoading={isLoading}
            selectedDocId={selectedDocId}
            selectedIds={selectedIds}
            onSelectDoc={handleSelectDoc}
            onToggleId={handleToggleId}
            onToggleAll={handleToggleAll}
            onPageChange={(page) => updateQuery({ page })}
            onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
            onBulkDelete={handleBulkDelete}
            onBulkStatus={handleBulkStatus}
            onClearSelection={() => setSelectedIds(new Set())}
            onCreateDocument={() => setCreateModalType("INVOICE")}
            isBulkPending={isBulkPending}
          />

          {/* Preview panel — drawer for A4, inline card for smaller types */}
          {selectedDocId && (
            <DocumentPreviewPanel
              documentId={selectedDocId}
              documentNo={documents.find((doc) => doc.id === selectedDocId)?.document_no}
              documentType={documents.find((doc) => doc.id === selectedDocId)?.type}
              dict={d}
              onClose={() => setSelectedDocId(null)}
            />
          )}
        </div>}

        {/* Receipts (POS sales history) — shown when RECEIPT type selected */}
        {isReceiptMode && (() => {
          const kw = salesSearch.trim().toLowerCase();
          const filtered = sales.filter((s) => {
            const matchKw = !kw || (s.customer_name ?? "").toLowerCase().includes(kw) || (s.payment_method ?? "").toLowerCase().includes(kw);
            const d = new Date(s.created_at);
            const matchFrom = !salesDateFrom || d >= new Date(salesDateFrom);
            const matchTo = !salesDateTo || d <= new Date(salesDateTo + "T23:59:59");
            return matchKw && matchFrom && matchTo;
          });
          const allChecked = filtered.length > 0 && filtered.every((s) => selectedSaleIds.has(s.id));
          const someChecked = filtered.some((s) => selectedSaleIds.has(s.id));
          const totalFiltered = filtered.reduce((s, r) => s + (r.total_amount ?? 0), 0);

          return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

              {/* Bulk action bar */}
              {selectedSaleIds.size > 0 && (
                <div className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-violet-50 px-6 py-2.5">
                  <span className="text-sm font-medium text-violet-700">เลือก {selectedSaleIds.size} รายการ</span>
                  <div className="ml-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={multiPrint}
                      disabled={multiPrinting}
                      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50"
                    >
                      {multiPrinting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Printer className="h-3.5 w-3.5" />}
                      {multiPrinting ? `${d.loading}` : d.printAll}
                    </button>
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 transition-colors hover:bg-violet-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSaleIds(new Set())}
                    className="ml-auto flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"
                  >
                    {d.cancelSelection} <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Filter bar */}
              <div className="shrink-0 border-b border-violet-100 px-6 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-52 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full rounded-lg border border-violet-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="ค้นหาลูกค้า, วิธีชำระเงิน..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                    />
                    {salesSearch && (
                      <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSalesSearch("")} type="button">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input type="date" value={salesDateFrom} onChange={(e) => setSalesDateFrom(e.target.value)}
                      className="text-sm text-slate-700 outline-none" />
                    <span className="text-slate-400">—</span>
                    <input type="date" value={salesDateTo} onChange={(e) => setSalesDateTo(e.target.value)}
                      className="text-sm text-slate-700 outline-none" />
                    {(salesDateFrom || salesDateTo) && (
                      <button onClick={() => { setSalesDateFrom(""); setSalesDateTo(""); }} type="button" className="text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-700 transition-colors hover:bg-violet-50"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Stats bar */}
              <div className="shrink-0 border-b border-violet-100 px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-600 px-4 py-3 shadow-md shadow-violet-200/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                      <Receipt className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-violet-100">{d.receiptStatsTotal}</p>
                      <p className="tabular-nums text-xl font-bold text-white">{filtered.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{d.receiptStatsPaid}</p>
                      <p className="tabular-nums text-xl font-bold text-emerald-600">{filtered.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                      <FileStack className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{d.receiptStatsAmount}</p>
                      <p className="tabular-nums text-xl font-bold text-violet-700">{fmtCurrency(totalFiltered)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table + A5 receipt slide panel */}
              <div className="flex min-h-0 flex-1">
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 overflow-auto">
                    {salesLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">{d.loading}</div>
                    ) : salesError ? (
                      <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{salesError}</div>
                    ) : filtered.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                          <Package className="h-8 w-8 text-violet-400" />
                        </div>
                        <p className="font-semibold text-slate-600">{d.receiptEmpty}</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-violet-100 bg-violet-50/80 backdrop-blur-sm">
                          <tr>
                            <th className="w-10 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                onChange={() => {
                                  if (allChecked) setSelectedSaleIds(new Set());
                                  else setSelectedSaleIds(new Set(filtered.map((s) => s.id)));
                                }}
                                className="h-4 w-4 rounded border-violet-300 accent-violet-600"
                              />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.receiptPaymentMethod}</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.customer}</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.date}</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{d.total}</th>
                            <th className="w-14 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50">
                          {filtered.map((sale) => (
                            <tr
                              key={sale.id}
                              onClick={() => setSelectedReceiptId((prev) => prev === sale.id ? null : sale.id)}
                              className={`cursor-default border-b border-violet-50 transition-colors ${selectedReceiptId === sale.id ? "bg-violet-50" : "hover:bg-slate-50/70"}`}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedSaleIds.has(sale.id)}
                                  onChange={() => toggleSaleId(sale.id)}
                                  className="h-4 w-4 rounded border-violet-300 accent-violet-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-600">{sale.payment_method}</td>
                              <td className="px-4 py-3 text-slate-700">{sale.customer_name?.trim() || "ลูกค้าทั่วไป"}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(sale.created_at)}</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-medium tabular-nums text-slate-800">
                                {fmtCurrency(sale.total_amount ?? 0)}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  title="พิมพ์ใบเสร็จ"
                                  onClick={() => {
                                    getSaleReceiptHtml(sale.id).then((html) => {
                                      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                                      const blobUrl = URL.createObjectURL(blob);
                                      const frame = document.createElement("iframe");
                                      frame.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
                                      document.body.appendChild(frame);
                                      frame.src = blobUrl;
                                      frame.onload = () => {
                                        frame.contentWindow?.focus();
                                        frame.contentWindow?.print();
                                        setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); }, 2000);
                                      };
                                    }).catch(() => toast.error(d.printError));
                                  }}
                                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* A5 receipt slide panel */}
                {selectedReceiptId && (
                  <div className="flex w-[360px] shrink-0 flex-col border-l border-violet-100 bg-white">
                    {/* Panel header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
                      <span className="text-sm font-bold text-slate-800">{d.receiptViewBtn}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!receiptHtml}
                          onClick={printReceipt}
                          className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          พิมพ์
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptId(null)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Panel body */}
                    <div className="relative flex-1 overflow-hidden bg-slate-50">
                      {receiptHtmlLoading ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                        </div>
                      ) : receiptHtml ? (
                        <iframe
                          ref={receiptIframeRef}
                          srcDoc={receiptHtml}
                          title="receipt preview"
                          className="h-full w-full border-0"
                          sandbox="allow-same-origin allow-scripts"
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Create modal */}
      {createModalType && (
        <CreateDocumentModal
          dict={d}
          initialType={createModalType}
          onClose={() => setCreateModalType(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
