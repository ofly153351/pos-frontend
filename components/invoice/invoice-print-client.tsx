"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Printer, X } from "lucide-react";

import { getSaleById } from "@/services/sales";
import type { Sale } from "@/types/sale";
import { InvoiceA4 } from "./invoice-a4";
import { InvoiceShort } from "./invoice-short";

type InvoiceDict = {
  title: string;
  shortTitle: string;
  taxInvoiceTitle: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  seller: string;
  sellerTaxId: string;
  buyerTaxId: string;
  notConfigured: string;
  combinedTitle: string;
  no: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotal: string;
  itemDiscount: string;
  billDiscount: string;
  beforeVat: string;
  vat: string;
  total: string;
  note: string;
  authorizedSignature: string;
  customerSignature: string;
  originalCopy: string;
  signatureLine: string;
  formatFull: string;
  formatShort: string;
  print: string;
  close: string;
  loading: string;
  notFound: string;
  generalCustomer: string;
  cash: string;
  transfer: string;
  card: string;
  promptpay: string;
  vatIncluded: string;
  vatExcluded: string;
  page: string;
  of: string;
};

type Props = {
  saleId: string;
  dict: InvoiceDict;
};

type Format = "full" | "short";

function makeInvoiceNo(sale: Sale): string {
  const saleNo = sale.sale_number ?? "";
  const suffix = saleNo.replace(/^SALE-/, "").slice(0, 15);
  return `INV-${suffix}`;
}

export function InvoicePrintClient({ saleId, dict }: Props) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<Format>("full");

  useEffect(() => {
    getSaleById(saleId)
      .then((res) => setSale(res.data ?? null))
      .catch(() => setSale(null))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <span className="ml-3 text-slate-500">{dict.loading}</span>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-500">{dict.notFound}</p>
        </div>
      </div>
    );
  }

  const invoiceNo = makeInvoiceNo(sale);

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex items-center gap-3 border-b border-violet-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <FileText className="h-4 w-4 text-violet-600" />
        </div>
        <span className="font-semibold text-slate-700">{dict.title}</span>
        <span className="nums text-sm text-slate-400">{invoiceNo}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Format toggle */}
          <div className="flex overflow-hidden rounded-lg border border-violet-200">
            <button
              type="button"
              onClick={() => setFormat("full")}
              className={`px-4 py-1.5 text-sm transition-colors ${
                format === "full"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-violet-700 hover:bg-violet-50"
              }`}
            >
              {dict.formatFull}
            </button>
            <button
              type="button"
              onClick={() => setFormat("short")}
              className={`border-l border-violet-200 px-4 py-1.5 text-sm transition-colors ${
                format === "short"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-violet-700 hover:bg-violet-50"
              }`}
            >
              {dict.formatShort}
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-700"
          >
            <Printer className="h-4 w-4" />
            {dict.print}
          </button>

          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            {dict.close}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="no-print flex min-h-[calc(100vh-57px)] flex-col items-center bg-slate-100 py-8">
        <div className="shadow-xl">
          {format === "full" ? (
            <InvoiceA4 sale={sale} dict={dict} invoiceNo={invoiceNo} />
          ) : (
            <InvoiceShort sale={sale} dict={dict} invoiceNo={invoiceNo} />
          )}
        </div>
      </div>

      {/* Print-only area */}
      <div className="print-only">
        {format === "full" ? (
          <InvoiceA4 sale={sale} dict={dict} invoiceNo={invoiceNo} />
        ) : (
          <InvoiceShort sale={sale} dict={dict} invoiceNo={invoiceNo} />
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { margin: 0; padding: 0; background: white; }
          @page {
            size: ${format === "full" ? "A4" : "A5"} portrait;
            margin: 0;
          }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
    </>
  );
}
