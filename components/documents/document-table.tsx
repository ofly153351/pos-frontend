"use client";

import { Copy, Loader2, MoreVertical, Package, Printer, Send, Trash2, X } from "lucide-react";
import type { DocumentListItem, DocumentStatus } from "@/types/document";
import { DocumentTypeBadge } from "./document-type-badge";
import { DocumentStatusBadge, PaymentStatusBadge } from "./document-status-badge";

type Dict = {
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
  print: string;
  moreOptions: string;
  send: string;
  selectedCount: string;
  changeStatus: string;
  delete: string;
  cancelSelection: string;
  loading: string;
  noDocuments: string;
  noDocumentsHint: string;
  noResults: string;
  statusDraft: string;
  statusPending: string;
  statusOverdue: string;
  statusCompleted: string;
  statusCancelled: string;
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  createDocument: string;
};

type Props = {
  dict: Dict;
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  selectedDocId: string | null;
  selectedIds: Set<string>;
  onSelectDoc: (id: string) => void;
  onToggleId: (id: string) => void;
  onToggleAll: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onBulkDelete: () => void;
  onBulkStatus: (status: DocumentStatus) => void;
  onClearSelection: () => void;
  onCreateDocument: () => void;
  isBulkPending?: boolean;
};

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short" }).format(new Date(s));
}

const STATUS_OPTIONS: DocumentStatus[] = ["DRAFT", "PENDING", "OVERDUE", "COMPLETED", "CANCELLED"];

export function DocumentTable({
  dict: d, documents, total, page, limit, isLoading,
  selectedDocId, selectedIds,
  onSelectDoc, onToggleId, onToggleAll,
  onPageChange, onLimitChange,
  onBulkDelete, onBulkStatus, onClearSelection, onCreateDocument,
  isBulkPending,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allChecked = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));
  const someChecked = documents.some((d) => selectedIds.has(d.id));

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const statusLabel: Record<DocumentStatus, string> = {
    DRAFT: d.statusDraft, PENDING: d.statusPending, OVERDUE: d.statusOverdue,
    COMPLETED: d.statusCompleted, CANCELLED: d.statusCancelled,
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-violet-50 px-6 py-2.5">
          <span className="text-sm font-medium text-violet-700">
            {d.selectedCount.replace("{n}", String(selectedIds.size))}
          </span>
          <div className="ml-2 flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 transition-colors hover:bg-violet-50"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              {d.print}
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 transition-colors hover:bg-violet-50"
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              {d.send}
            </button>
            <select
              className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 outline-none focus:border-violet-400"
              defaultValue=""
              onChange={(e) => { if (e.target.value) onBulkStatus(e.target.value as DocumentStatus); e.target.value = ""; }}
            >
              <option value="">{d.changeStatus}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusLabel[s]}</option>
              ))}
            </select>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              disabled={isBulkPending}
              onClick={onBulkDelete}
              type="button"
            >
              {isBulkPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {d.delete}
            </button>
          </div>
          <button
            className="ml-auto flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-violet-600"
            onClick={onClearSelection}
            type="button"
          >
            {d.cancelSelection}
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            <span className="ml-2 text-sm text-slate-400">{d.loading}</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
              <Package className="h-8 w-8 text-violet-400" />
            </div>
            <p className="font-semibold text-slate-600">{d.noDocuments}</p>
            <p className="text-sm text-slate-400">{d.noDocumentsHint}</p>
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
                    onChange={onToggleAll}
                    className="h-4 w-4 rounded border-violet-300 accent-violet-600"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colDocumentNo}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colType}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colCustomer}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colDate}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colDueDate}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colAmount}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colStatus}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colPaymentStatus}</th>
                <th className="w-28 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`cursor-default border-b border-violet-50 transition-colors
                    ${selectedDocId === doc.id ? "bg-violet-50" : "hover:bg-slate-50/70"}
                    ${doc.status === "OVERDUE" ? "bg-red-50/20" : ""}
                    ${doc.status === "CANCELLED" ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleId(doc.id)}
                      className="h-4 w-4 rounded border-violet-300 accent-violet-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-violet-700">{doc.document_no}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DocumentTypeBadge type={doc.type} dict={d} />
                  </td>
                  <td className="max-w-[180px] px-4 py-3">
                    <span className="truncate text-slate-700">{doc.customer_name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(doc.document_date)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {doc.due_date ? fmtDate(doc.due_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono text-sm font-medium tabular-nums ${doc.total_amount < 0 ? "text-red-600" : "text-slate-800"}`}>
                      {doc.total_amount < 0
                        ? `-${fmt(Math.abs(doc.total_amount))}`
                        : fmt(doc.total_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge status={doc.status} dict={d} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={doc.payment_status} dict={d} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <button title={d.copy} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600" type="button">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button title={d.print} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600" type="button">
                        <Printer className="h-4 w-4" />
                      </button>
                      <button title={d.moreOptions} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600" type="button">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && documents.length > 0 && (
        <div className="flex shrink-0 items-center justify-between border-t border-violet-100 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">
            {d.showing} {from}–{to} {d.of} {total} {d.records}
          </span>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-violet-400"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n} {d.perPage}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 disabled:opacity-40 hover:bg-violet-50"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                type="button"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      p === page
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                    onClick={() => onPageChange(p)}
                    type="button"
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-700 disabled:opacity-40 hover:bg-violet-50"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
