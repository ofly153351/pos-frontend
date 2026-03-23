"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { SalesDictionary } from "@/components/sales/types";
import { downloadInvoicePdf, getInvoiceById, listInvoices } from "@/services/invoices";
import { getSaleById, listSales } from "@/services/sales";
import type { Invoice } from "@/types/invoice";
import type { Sale } from "@/types/sale";

type DocumentsManagerProps = {
  dictionary: SalesDictionary;
  mode?: "all" | "pending";
};

function getCustomerTypeLabel(sale: Sale, dictionary: SalesDictionary) {
  return sale.customer_id ? dictionary.customerTypeNetwork : dictionary.customerTypeGeneral;
}

function getCustomerDisplayName(sale: Sale, dictionary: SalesDictionary) {
  if (!sale.customer_id) {
    return dictionary.customerTypeGeneral;
  }

  return sale.customer_name?.trim() || dictionary.customerTypeNetwork;
}

function getInvoiceCustomerDisplayName(invoice: Invoice, dictionary: SalesDictionary) {
  return invoice.customer_name?.trim() || dictionary.customerTypeNetwork;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function DocumentsManager({ dictionary, mode = "all" }: DocumentsManagerProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isReceiptPending, startReceiptTransition] = useTransition();
  const pdfFrameRef = useRef<HTMLIFrameElement | null>(null);
  const openDrawerTimerRef = useRef<number | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setError("");

    startTransition(async () => {
      try {
        if (mode === "pending") {
          const response = await listInvoices();
          setInvoices(response.data ?? []);
          return;
        }

        const response = await listSales();
        setSales(response.data ?? []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }, [mode]);

  useEffect(() => {
    pdfUrlRef.current = pdfPreviewUrl;
  }, [pdfPreviewUrl]);

  useEffect(() => {
    return () => {
      if (openDrawerTimerRef.current) {
        window.clearTimeout(openDrawerTimerRef.current);
      }

      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const sourceRecords = mode === "pending" ? invoices : sales;
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return sourceRecords;
    }

    return sourceRecords.filter((record) => {
      if (mode === "pending") {
        const invoice = record as Invoice;
        const customerName = getInvoiceCustomerDisplayName(invoice, dictionary).toLowerCase();

        return (
          customerName.includes(keyword) ||
          String(invoice.status ?? "").toLowerCase().includes(keyword) ||
          String(invoice.created_at ?? "").toLowerCase().includes(keyword) ||
          String(invoice.due_at ?? "").toLowerCase().includes(keyword)
        );
      }

      const sale = record as Sale;
      const customerName = getCustomerDisplayName(sale, dictionary).toLowerCase();

      return (
        customerName.includes(keyword) ||
        String(sale.payment_method ?? "").toLowerCase().includes(keyword) ||
        String(sale.created_at ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [dictionary, mode, invoices, sales, search]);

  async function openReceipt(id: string) {
    setReceiptError("");
    setSelectedSale(null);
    setSelectedInvoice(null);
    setIsReceiptOpen(true);

    startReceiptTransition(async () => {
      try {
        if (mode === "pending") {
          const response = await getInvoiceById(id);
          setSelectedInvoice(response.data);
          return;
        }

        const response = await getSaleById(id);
        setSelectedSale(response.data);
      } catch (nextError) {
        setReceiptError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function openInvoicePdf(invoiceId: string) {
    setPdfLoadingId(invoiceId);
    setIsPdfDrawerOpen(false);

    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const pdfUrl = URL.createObjectURL(blob);

      setPdfPreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        return pdfUrl;
      });

      if (openDrawerTimerRef.current) {
        window.clearTimeout(openDrawerTimerRef.current);
      }

      openDrawerTimerRef.current = window.setTimeout(() => {
        setIsPdfDrawerOpen(true);
      }, 10);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Request failed");
    } finally {
      setPdfLoadingId(null);
    }
  }

  function closePdfDrawer() {
    setIsPdfDrawerOpen(false);
  }

  function printPdfPreview() {
    const frameWindow = pdfFrameRef.current?.contentWindow;

    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
      return;
    }

    if (pdfPreviewUrl) {
      window.open(pdfPreviewUrl, "_blank", "noopener,noreferrer");
    }
  }

  useEffect(() => {
    if (!isPdfDrawerOpen && pdfPreviewUrl) {
      const timer = window.setTimeout(() => {
        setPdfPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }

          return null;
        });
      }, 300);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [isPdfDrawerOpen, pdfPreviewUrl]);

  return (
    <>
      <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.historyTitle}</h2>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
            {dictionary.itemCountLabel} {filteredRecords.length}
          </span>
        </div>

        <div className="mt-4">
          <input
            className="w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dictionary.documentSearchPlaceholder}
            value={search}
          />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{dictionary.paymentMethodLabel}</th>
                <th className="px-4 py-3">{dictionary.customerColumnLabel}</th>
                <th className="px-4 py-3">{dictionary.saleAtLabel}</th>
                <th className="px-4 py-3">{dictionary.summary.totalLabel}</th>
                <th className="px-4 py-3">{dictionary.viewReceiptButton}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {!isPending && filteredRecords.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    {dictionary.emptyHistory}
                  </td>
                </tr>
              ) : null}

              {filteredRecords.map((record) => {
                if (mode === "pending") {
                  const invoice = record as Invoice;

                  return (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-slate-700">{invoice.status ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {getInvoiceCustomerDisplayName(invoice, dictionary)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(invoice.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(invoice.total_amount ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => openReceipt(invoice.id)}
                            type="button"
                          >
                            {dictionary.viewReceiptButton}
                          </button>
                          <button
                            className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={pdfLoadingId === invoice.id}
                            onClick={() => openInvoicePdf(invoice.id)}
                            type="button"
                          >
                            {dictionary.pdfButton}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const sale = record as Sale;

                return (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 text-slate-700">{sale.payment_method}</td>
                    <td className="px-4 py-3 text-slate-700">{getCustomerDisplayName(sale, dictionary)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(sale.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(sale.total_amount ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => openReceipt(sale.id)}
                        type="button"
                      >
                        {dictionary.viewReceiptButton}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isReceiptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">{dictionary.receiptTitle}</h3>
                {selectedSale ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {dictionary.saleAtLabel} {formatDateTime(selectedSale.created_at)}
                  </p>
                ) : null}
                {selectedSale ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {dictionary.customerTypeLabel} {getCustomerTypeLabel(selectedSale, dictionary)}
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  setIsReceiptOpen(false);
                  setSelectedSale(null);
                  setSelectedInvoice(null);
                  setReceiptError("");
                }}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            {receiptError ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {receiptError}
              </div>
            ) : null}

            {isReceiptPending && !selectedSale && !selectedInvoice ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.viewReceiptButton}
              </div>
            ) : null}

            {selectedSale ? (
              <>
                <div className="mt-6 space-y-3">
                  {(selectedSale.items ?? []).map((item) => (
                    <div
                      key={`${item.product_id}-${item.id ?? item.product_name ?? "item"}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.product_name ?? dictionary.unavailableProduct}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.quantityLabel} {item.quantity}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.unitPriceLabel} {formatCurrency(item.unit_price ?? 0)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.line_total ?? item.total_amount ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {selectedInvoice ? (
              <>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>
                    {dictionary.customerTypeLabel} {dictionary.customerTypeNetwork}
                  </p>
                {selectedInvoice.status ? (
                  <p className="mt-1">
                    {dictionary.paymentMethodLabel} {selectedInvoice.status}
                    </p>
                  ) : null}
                  {selectedInvoice.due_at ? (
                    <p className="mt-1">
                      {dictionary.saleAtLabel} {formatDateTime(selectedInvoice.due_at)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <button
                    className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pdfLoadingId === selectedInvoice.id}
                    onClick={() => openInvoicePdf(selectedInvoice.id)}
                    type="button"
                  >
                    {dictionary.pdfButton}
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {(selectedInvoice.items ?? []).map((item) => (
                    <div
                      key={`${item.product_id}-${item.id ?? item.product_name ?? "item"}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.product_name ?? dictionary.unavailableProduct}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.quantityLabel} {item.quantity}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dictionary.unitPriceLabel} {formatCurrency(item.unit_price ?? 0)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.line_total ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {pdfPreviewUrl ? (
        <div
          className={`fixed inset-0 z-[60] flex justify-end bg-slate-950/40 transition-opacity duration-300 ${
            isPdfDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={closePdfDrawer}
        >
          <div
            className={`h-full w-[45vw] min-w-[320px] max-w-[760px] bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isPdfDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{dictionary.pdfPreviewTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={printPdfPreview}
                  type="button"
                >
                  {dictionary.printButton || dictionary.viewReceiptButton}
                </button>
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={closePdfDrawer}
                  type="button"
                >
                  {dictionary.closeReceiptButton}
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-65px)] bg-slate-100 p-3">
              <iframe
                className="h-full w-full rounded-xl border border-slate-200 bg-white"
                ref={pdfFrameRef}
                src={pdfPreviewUrl}
                title={dictionary.pdfPreviewTitle}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
