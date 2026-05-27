"use client";

import { ExternalLink, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getDocument } from "@/services/documents";
import { DocumentTypeBadge } from "./document-type-badge";

type Dict = {
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
  loading: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
};

type Props = { documentId: string; dict: Dict; onClose: () => void };

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(s));
}

export function DocumentPreviewPanel({ documentId, dict, onClose }: Props) {
  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  });

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-violet-100 bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-violet-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{dict.previewTitle}</h3>
        <button
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      {isLoading || !doc ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          {dict.loading}
        </div>
      ) : (
        <div key={doc.id} className="smooth-fade-up flex-1 overflow-y-auto p-4">
          {/* Header card */}
          <div className="mb-4 rounded-xl bg-violet-600 p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-violet-200">{dict.documentNo}</p>
                <p className="font-mono text-base font-bold">{doc.document_no}</p>
                <p className="mt-0.5 text-xs text-violet-300">{doc.document_no_full}</p>
              </div>
              <DocumentTypeBadge type={doc.type} dict={dict} onDark />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-violet-100">
              <span>{dict.date}: {fmtDate(doc.document_date)}</span>
              {doc.due_date && <span>{dict.dueDate}: {fmtDate(doc.due_date)}</span>}
            </div>
          </div>

          {/* Customer */}
          <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            <p className="mb-1 text-xs font-medium text-slate-500">{dict.customer}</p>
            <p className="font-medium text-slate-800">{doc.customer_name}</p>
            {doc.customer_tax_id && (
              <p className="font-mono text-xs text-slate-500">{doc.customer_tax_id}</p>
            )}
          </div>

          {/* Items */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-slate-500">{dict.items}</p>
            <div className="divide-y divide-violet-50 rounded-xl border border-violet-100">
              {doc.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × {fmt(item.unit_price)}
                    </p>
                  </div>
                  <p className="ml-3 shrink-0 font-mono text-sm font-medium tabular-nums text-slate-800">
                    {fmt(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mb-4 space-y-1.5 rounded-xl border border-violet-100 bg-white p-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>{dict.subtotal}</span>
              <span className="font-mono tabular-nums">{fmt(doc.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>{dict.vat} {doc.vat_rate}%</span>
              <span className="font-mono tabular-nums">{fmt(doc.vat_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-violet-100 pt-1.5 font-semibold text-slate-800">
              <span>{dict.total}</span>
              <span className="font-mono tabular-nums text-violet-700">{fmt(doc.total_amount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-violet-100 p-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          {dict.viewFull}
        </button>
      </div>
    </div>
  );
}
