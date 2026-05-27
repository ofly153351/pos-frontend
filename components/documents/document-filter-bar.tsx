"use client";

import { Filter, RotateCcw, Search, X } from "lucide-react";
import type { DocumentListQuery, DocumentStatus, DocumentType, PaymentStatus } from "@/types/document";

type Dict = {
  searchPlaceholder: string;
  filter: string;
  resetFilter: string;
  allTypes: string;
  allStatuses: string;
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
};

type Props = {
  dict: Dict;
  query: DocumentListQuery;
  onChange: (q: Partial<DocumentListQuery>) => void;
  onReset: () => void;
};

export function DocumentFilterBar({ dict, query, onChange, onReset }: Props) {
  const activeCount = [query.type, query.status, query.payment_status].filter(Boolean).length;

  return (
    <div className="border-b border-violet-100 bg-white/60 px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-violet-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder={dict.searchPlaceholder}
            value={query.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          />
          {query.search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => onChange({ search: "", page: 1 })}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter icon */}
        <div className="relative flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          {dict.filter}
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">
              {activeCount}
            </span>
          )}
        </div>

        {/* Type */}
        <select
          className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          value={query.type ?? ""}
          onChange={(e) => onChange({ type: e.target.value as DocumentType | "", page: 1 })}
        >
          <option value="">{dict.allTypes}</option>
          <option value="INVOICE">{dict.typeInvoice}</option>
          <option value="RECEIPT">{dict.typeReceipt}</option>
          <option value="TAX_INVOICE">{dict.typeTaxInvoice}</option>
          <option value="QUOTATION">{dict.typeQuotation}</option>
          <option value="BILL">{dict.typeBill}</option>
          <option value="CREDIT_NOTE">{dict.typeCreditNote}</option>
        </select>

        {/* Status */}
        <select
          className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          value={query.status ?? ""}
          onChange={(e) => onChange({ status: e.target.value as DocumentStatus | "", page: 1 })}
        >
          <option value="">{dict.allStatuses}</option>
          <option value="DRAFT">{dict.statusDraft}</option>
          <option value="PENDING">{dict.statusPending}</option>
          <option value="OVERDUE">{dict.statusOverdue}</option>
          <option value="COMPLETED">{dict.statusCompleted}</option>
          <option value="CANCELLED">{dict.statusCancelled}</option>
        </select>

        {/* Payment status */}
        <select
          className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          value={query.payment_status ?? ""}
          onChange={(e) => onChange({ payment_status: e.target.value as PaymentStatus | "", page: 1 })}
        >
          <option value="">{dict.allPayments}</option>
          <option value="UNPAID">{dict.paymentUnpaid}</option>
          <option value="PARTIAL">{dict.paymentPartial}</option>
          <option value="PAID">{dict.paymentPaid}</option>
        </select>

        {/* Reset */}
        {activeCount > 0 && (
          <button
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600"
            onClick={onReset}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {dict.resetFilter}
          </button>
        )}
      </div>
    </div>
  );
}
