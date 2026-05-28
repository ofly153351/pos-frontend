"use client";

import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, FileStack, Plus, Printer } from "lucide-react";
import type { DocumentStats, DocumentType } from "@/types/document";

type Dict = {
  statsTotal: string;
  statsPending: string;
  statsOverdue: string;
  statsPaid: string;
  exportExcel: string;
  printReport: string;
  createDocument: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
};

type Props = {
  dict: Dict;
  stats: DocumentStats;
  defaultCreateType?: DocumentType;
  onExport: () => void;
  onPrint: () => void;
  onCreateDocument: (type: DocumentType) => void;
};

export function DocumentStatsCards({ dict, stats, defaultCreateType = "INVOICE", onExport, onPrint, onCreateDocument }: Props) {
  const docTypes: { type: DocumentType; label: string }[] = [
    { type: "INVOICE",     label: dict.typeInvoice },
    { type: "RECEIPT",     label: dict.typeReceipt },
    { type: "TAX_INVOICE", label: dict.typeTaxInvoice },
    { type: "QUOTATION",   label: dict.typeQuotation },
    { type: "BILL",        label: dict.typeBill },
    { type: "CREDIT_NOTE", label: dict.typeCreditNote },
  ];

  return (
    <div className="border-b border-violet-100 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* KPI cards */}
        <div className="flex flex-wrap gap-3">
          {/* Total */}
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-600 px-4 py-3 shadow-md shadow-violet-200/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <FileStack className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-violet-100">{dict.statsTotal}</p>
              <p className="tabular-nums text-xl font-bold text-white">{stats.total}</p>
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{dict.statsPending}</p>
              <p className="tabular-nums text-xl font-bold text-amber-600">{stats.pending_payment}</p>
            </div>
          </div>

          {/* Overdue */}
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{dict.statsOverdue}</p>
              <p className="tabular-nums text-xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>

          {/* Paid */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{dict.statsPaid}</p>
              <p className="tabular-nums text-xl font-bold text-emerald-600">{stats.paid}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-700 transition-colors hover:bg-violet-50"
            onClick={onExport}
            type="button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {dict.exportExcel}
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-700 transition-colors hover:bg-violet-50"
            onClick={onPrint}
            type="button"
          >
            <Printer className="h-4 w-4" />
            {dict.printReport}
          </button>

          {/* Split button */}
          <div className="flex">
            <button
              className="flex items-center gap-2 rounded-l-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              onClick={() => onCreateDocument(defaultCreateType)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {dict.createDocument}
            </button>
            <div className="group relative">
              <button
                className="rounded-r-lg border-l border-violet-500 bg-violet-600 px-2 py-3 text-white transition-colors hover:bg-violet-700"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 top-full z-20 hidden min-w-[160px] rounded-xl border border-violet-100 bg-white py-1 shadow-lg group-focus-within:block group-hover:block">
                {docTypes.map(({ type, label }) => (
                  <button
                    key={type}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-violet-50"
                    onClick={() => onCreateDocument(type)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
