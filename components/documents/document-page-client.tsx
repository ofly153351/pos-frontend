"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileBadge, FileDigit, FileMinus, FileQuestion, FileText, LayoutGrid, Receipt, Truck } from "lucide-react";

import { getCurrentStoreId } from "@/lib/store-storage";
import {
  bulkDocumentAction,
  getDocuments,
} from "@/services/documents";
import { type DateFilterValue, resolveDateQuery } from "@/components/shared/date-range-filter";
import { toast } from "@/components/ui/toast";
import type { DocumentListQuery, DocumentStatus, DocumentType } from "@/types/document";

import { DocumentFilterBar } from "./document-filter-bar";
import { DocumentStatsCards } from "./document-stats-cards";
import { DocumentTable } from "./document-table";
import { DocumentPreviewPanel } from "./document-preview-panel";
import { CreateDocumentModal } from "./create-document-modal";
import { SalesHistoryManager } from "@/components/sales/sales-history-manager";
import type { SalesHistoryDict } from "@/components/sales/sales-history-dict";

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
  typeDeliveryOrder?: string;
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
  scanWithCamera: string;
  productNotFound: string;
  // Row actions + bulk (Phase 1)
  duplicate: string;
  duplicateSuccess: string;
  duplicateError: string;
  printPreview: string;
  convertTo: string;
  recordPayment: string;
  paySuccess: string;
  payError: string;
  cancelDocument: string;
  cancelSuccess: string;
  cancelError: string;
  confirmCancelDoc: string;
  confirmDeleteDoc: string;
  convertSuccess: string;
  convertError: string;
  pdfError: string;
  comingSoon: string;
  email: string;
  share: string;
};

type Props = { dictionary: DocumentDict; salesDict: SalesHistoryDict };

const EMPTY_STATS = { total: 0, pending_payment: 0, overdue: 0, paid: 0 };
const DEFAULT_QUERY: DocumentListQuery = { page: 1, limit: 20 };

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(n);
}
function fmtDateShort(s: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(s));
}

// Localised label maps for the document type / status / payment enums — shared by
// the CSV export and the printable report so both speak the user's language.
function buildDocLabelMaps(d: DocumentDict) {
  const typeLabel: Record<string, string> = {
    INVOICE: d.typeInvoice,
    RECEIPT: d.typeReceipt,
    TAX_INVOICE: d.typeTaxInvoice,
    QUOTATION: d.typeQuotation,
    BILL: d.typeBill,
    CREDIT_NOTE: d.typeCreditNote,
    DELIVERY_ORDER: d.typeDeliveryOrder ?? "ใบส่งของ",
  };
  const statusLabel: Record<string, string> = {
    DRAFT: d.statusDraft,
    PENDING: d.statusPending,
    OVERDUE: d.statusOverdue,
    COMPLETED: d.statusCompleted,
    CANCELLED: d.statusCancelled,
  };
  const payLabel: Record<string, string> = {
    UNPAID: d.paymentUnpaid,
    PARTIAL: d.paymentPartial,
    PAID: d.paymentPaid,
  };
  return { typeLabel, statusLabel, payLabel };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function DocumentPageClient({ dictionary: d, salesDict }: Props) {
  const queryClient = useQueryClient();
  const params = useParams();
  const locale = (params?.locale as string) ?? "th";
  const [storeId, setStoreId] = useState<string | null>(null);

  // Read the active store id from client storage once on mount (client-only API).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setStoreId(getCurrentStoreId()); }, []);

  const [query, setQuery] = useState<DocumentListQuery>(DEFAULT_QUERY);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: "all" });

  // The "ใบเสร็จร้านค้า" tab reuses <SalesHistoryManager> (see render below), so the
  // page no longer hand-rolls a sales list / receipt preview / tax-invoice creation.
  const isReceiptMode = query.type === "RECEIPT";

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalType, setCreateModalType] = useState<DocumentType | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  const dateRange = resolveDateQuery(dateFilter);
  const fetchQuery = { ...query, ...dateRange };

  const { data, isLoading } = useQuery({
    queryKey: ["documents", storeId, fetchQuery],
    queryFn: () => getDocuments(fetchQuery),
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
    setDateFilter({ preset: "all" });
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

  // Pull every document matching the CURRENT filter across all pages. The list
  // endpoint caps page size at 200, so walk pages until we have them all.
  async function fetchAllDocuments() {
    const PAGE = 200;
    const first = await getDocuments({ ...query, page: 1, limit: PAGE });
    const all = [...first.items];
    const grandTotal = first.total ?? all.length;
    let page = 2;
    while (all.length < grandTotal) {
      const next = await getDocuments({ ...query, page, limit: PAGE });
      if (!next.items.length) break;
      all.push(...next.items);
      page += 1;
    }
    return all;
  }

  // Export every document matching the CURRENT filter (not just the visible page)
  // to a UTF-8 CSV that Excel opens cleanly.
  async function exportDocumentsCSV() {
    try {
      const allItems = await fetchAllDocuments();
      const { typeLabel, statusLabel, payLabel } = buildDocLabelMaps(d);
      const rows = [
        [d.colDocumentNo, d.colType, d.colCustomer, d.colDate, d.colDueDate, d.colAmount, d.colStatus, d.colPaymentStatus],
        ...allItems.map((doc) => [
          doc.document_no_full || doc.document_no,
          typeLabel[doc.type] ?? doc.type,
          doc.customer_name || d.allCustomers,
          fmtDateShort(doc.document_date),
          doc.due_date ? fmtDateShort(doc.due_date) : "-",
          String(doc.total_amount ?? 0),
          statusLabel[doc.status] ?? doc.status,
          payLabel[doc.payment_status] ?? doc.payment_status,
        ]),
      ];
      const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `documents-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(d.requestFailed);
    }
  }

  // Build a clean A4 report of the filtered documents and print it.
  // Open the popup window synchronously (inside the user-gesture handler) so
  // Chrome doesn't block it as a popup, then populate it after the async fetch.
  async function printDocumentsReport() {
    const win = window.open("about:blank", "_blank");
    if (!win) {
      toast.error(d.printError);
      return;
    }
    try {
      const allItems = await fetchAllDocuments();
      const { typeLabel, statusLabel, payLabel } = buildDocLabelMaps(d);
      const totalSum = allItems.reduce((s, doc) => s + (doc.total_amount ?? 0), 0);
      const body = allItems
        .map(
          (doc, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(doc.document_no_full || doc.document_no)}</td>
            <td>${escapeHtml(typeLabel[doc.type] ?? doc.type)}</td>
            <td>${escapeHtml(doc.customer_name || d.allCustomers)}</td>
            <td>${escapeHtml(fmtDateShort(doc.document_date))}</td>
            <td class="r">${escapeHtml(fmtCurrency(doc.total_amount ?? 0))}</td>
            <td>${escapeHtml(statusLabel[doc.status] ?? doc.status)}</td>
            <td>${escapeHtml(payLabel[doc.payment_status] ?? doc.payment_status)}</td>
          </tr>`,
        )
        .join("");
      const html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(d.title)}</title>
        <style>
          *{font-family:'Sarabun','Noto Sans Thai',sans-serif;box-sizing:border-box}
          body{margin:24px;color:#1e293b}
          h1{font-size:18px;margin:0 0 2px}
          .meta{font-size:12px;color:#64748b;margin-bottom:16px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
          th{background:#f5f3ff;color:#6d28d9;font-weight:600}
          td.r,th.r{text-align:right}
          tfoot td{font-weight:bold;background:#faf5ff}
          @media print{body{margin:0}}
        </style></head>
        <body>
          <h1>${escapeHtml(d.title)}</h1>
          <div class="meta">${escapeHtml(d.showing)} ${allItems.length} ${escapeHtml(d.records)} · ${escapeHtml(new Date().toLocaleString("th-TH"))}</div>
          <table>
            <thead><tr>
              <th>#</th><th>${escapeHtml(d.colDocumentNo)}</th><th>${escapeHtml(d.colType)}</th><th>${escapeHtml(d.colCustomer)}</th>
              <th>${escapeHtml(d.colDate)}</th><th class="r">${escapeHtml(d.colAmount)}</th><th>${escapeHtml(d.colStatus)}</th><th>${escapeHtml(d.colPaymentStatus)}</th>
            </tr></thead>
            <tbody>${body}</tbody>
            <tfoot><tr><td colspan="5" class="r">${escapeHtml(d.total)}</td><td class="r">${escapeHtml(fmtCurrency(totalSum))}</td><td colspan="2"></td></tr></tfoot>
          </table>
        </body></html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    } catch {
      win.close();
      toast.error(d.printError);
    }
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

        {!isReceiptMode && (
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
                  { type: "CREDIT_NOTE",   label: d.typeCreditNote,     Icon: FileMinus    },
                  { type: "DELIVERY_ORDER",label: d.typeDeliveryOrder ?? "ใบส่งของ", Icon: Truck },
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
            <DocumentFilterBar
              dict={d}
              salesDict={salesDict}
              query={query}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              onChange={updateQuery}
              onReset={resetFilters}
              locale={locale}
            />
            <DocumentStatsCards
              dict={d}
              stats={stats}
              defaultCreateType={(query.type as DocumentType) || "INVOICE"}
              onExport={exportDocumentsCSV}
              onPrint={printDocumentsReport}
              onCreateDocument={(type) => setCreateModalType(type)}
            />
          </>
        )}

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
              paymentStatus={documents.find((doc) => doc.id === selectedDocId)?.payment_status}
              documentStatus={documents.find((doc) => doc.id === selectedDocId)?.status}
              sourceDocumentId={documents.find((doc) => doc.id === selectedDocId)?.source_document_id}
              dict={d}
              onClose={() => setSelectedDocId(null)}
              onNavigate={(id) => setSelectedDocId(id)}
            />
          )}
        </div>}

        {/* Receipts (POS sales history) — full Sales History experience embedded:
            filters, KPIs, status badges, Thai payment labels, and the rich detail
            modal (print / tax invoice / void / return). */}
        {isReceiptMode && (
          <div className="min-h-0 flex-1 overflow-auto">
            <SalesHistoryManager dict={salesDict} embedded />
          </div>
        )}
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
