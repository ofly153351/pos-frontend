"use client";

import { ArrowRight, FileBadge, FileDigit, FileMinus, FileQuestion, FileText, Receipt, Truck } from "lucide-react";
import type { DocumentType, RelatedDocument } from "@/types/document";

type TypeLabels = {
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
};

type Props = {
  items: RelatedDocument[];
  currentId: string;
  label: string;
  typeLabels: TypeLabels;
  onSelect?: (id: string) => void;
};

const TYPE_ICON: Record<DocumentType, typeof FileText> = {
  INVOICE: FileText,
  RECEIPT: Receipt,
  TAX_INVOICE: FileBadge,
  QUOTATION: FileQuestion,
  BILL: FileDigit,
  CREDIT_NOTE: FileMinus,
  DELIVERY_ORDER: Truck,
};

// Horizontal lineage strip for a document family (Quotation → Invoice → DO → Tax
// Invoice …). Hidden for standalone documents (a single-item family). The current
// document is highlighted; the rest navigate when clicked.
export function DocumentTimeline({ items, currentId, label, typeLabels, onSelect }: Props) {
  if (items.length < 2) return null;

  const labelOf: Record<DocumentType, string> = {
    INVOICE: typeLabels.typeInvoice,
    RECEIPT: typeLabels.typeReceipt,
    TAX_INVOICE: typeLabels.typeTaxInvoice,
    QUOTATION: typeLabels.typeQuotation,
    BILL: typeLabels.typeBill,
    CREDIT_NOTE: typeLabels.typeCreditNote,
    DELIVERY_ORDER: typeLabels.typeDeliveryOrder ?? "ใบส่งของ",
  };

  return (
    <div className="shrink-0 border-b border-violet-100 bg-violet-50/40 px-4 py-2.5">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {items.map((doc, i) => {
          const Icon = TYPE_ICON[doc.type] ?? FileText;
          const active = doc.id === currentId;
          const cancelled = doc.status === "CANCELLED";
          return (
            <div key={doc.id} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />}
              <button
                type="button"
                onClick={() => { if (!active) onSelect?.(doc.id); }}
                disabled={active}
                title={doc.document_no_full || doc.document_no}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:bg-violet-50"
                } ${cancelled ? "opacity-50 line-through" : ""}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{labelOf[doc.type]}</span>
                <span className="nums opacity-70">{doc.document_no}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
