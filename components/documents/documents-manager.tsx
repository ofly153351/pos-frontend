"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { SalesDictionary } from "@/components/sales/types";
import {
  createInvoicePayment,
  downloadInvoicePdf,
  getInvoicePaymentProofPath,
  getInvoiceById,
  listInvoices,
  unpayInvoice,
} from "@/services/invoices";
import { getSaleById, getSaleReceiptHtml, listSales } from "@/services/sales";
import type { Invoice } from "@/types/invoice";
import type { Sale } from "@/types/sale";

type DocumentsManagerProps = {
  dictionary: SalesDictionary;
  mode?: "all" | "pending";
};

type DocumentLineItem = {
  id?: string;
  line_total?: number | null;
  product_id?: string | null;
  product_name?: string | null;
  quantity: number;
  total_amount?: number | null;
  unit_price?: number | null;
};

type InvoiceStatus = "unpaid" | "partially_paid" | "paid";

const DEFAULT_PAYMENT_METHOD = "cash";
const DRAWER_OPEN_DELAY_MS = 10;
const DRAWER_CLOSE_CLEANUP_DELAY_MS = 300;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TABLE_COLUMN_COUNT = 6;

const invoiceStatusClassName: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partially_paid: "bg-amber-100 text-amber-700",
  unpaid: "bg-rose-100 text-rose-700",
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

function getErrorMessage(nextError: unknown, dictionary: SalesDictionary) {
  return nextError instanceof Error ? nextError.message : dictionary.requestFailedLabel;
}

function normalizeInvoiceStatus(status?: string): InvoiceStatus {
  if (status === "paid" || status === "partially_paid" || status === "unpaid") {
    return status;
  }

  return "unpaid";
}

function getInvoiceStatusLabel(status: InvoiceStatus, dictionary: SalesDictionary) {
  if (status === "paid") {
    return dictionary.statusPaidLabel;
  }

  if (status === "partially_paid") {
    return dictionary.statusPartiallyPaidLabel;
  }

  return dictionary.statusUnpaidLabel;
}

function findLatestProofPaymentId(invoice: Invoice) {
  const payments = invoice.payments ?? [];

  for (let index = payments.length - 1; index >= 0; index -= 1) {
    const payment = payments[index];
    if (payment?.id && !payment.is_voided && payment.proof_url) {
      return payment.id;
    }
  }

  for (let index = payments.length - 1; index >= 0; index -= 1) {
    const payment = payments[index];
    if (payment?.id && !payment.is_voided) {
      return payment.id;
    }
  }

  return undefined;
}

export function DocumentsManager({ dictionary, mode = "all" }: DocumentsManagerProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [unpayError, setUnpayError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [unpayReason, setUnpayReason] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUnpayModalOpen, setIsUnpayModalOpen] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [saleReceiptLoadingId, setSaleReceiptLoadingId] = useState<string | null>(null);
  const [saleReceiptHtml, setSaleReceiptHtml] = useState<string | null>(null);
  const [isSaleReceiptDrawerOpen, setIsSaleReceiptDrawerOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isReceiptPending, startReceiptTransition] = useTransition();
  const [isPaymentPending, startPaymentTransition] = useTransition();
  const [isUnpayPending, startUnpayTransition] = useTransition();
  const pdfFrameRef = useRef<HTMLIFrameElement | null>(null);
  const saleReceiptFrameRef = useRef<HTMLIFrameElement | null>(null);
  const paymentProofInputRef = useRef<HTMLInputElement | null>(null);
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
        setError(getErrorMessage(nextError, dictionary));
      }
    });
  }, [dictionary, mode]);

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

  const totalPages = Math.max(Math.ceil(filteredRecords.length / pageSize), 1);
  const startPage = Math.max(currentPage - 2, 1);
  const endPage = Math.min(startPage + 4, totalPages);
  const pageNumbers = Array.from(
    { length: Math.max(endPage - startPage + 1, 0) },
    (_, index) => startPage + index,
  );
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRecords, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mode, pageSize, search]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedInvoice) {
      setPaymentAmount("");
      setPaymentMethod(DEFAULT_PAYMENT_METHOD);
      setPaymentNote("");
      setPaymentProof(null);
      setPaymentError("");
      return;
    }

    const suggestedAmount = Math.max(Number(selectedInvoice.balance_amount ?? 0), 0);
    setPaymentAmount(suggestedAmount > 0 ? String(suggestedAmount) : "");
    setPaymentMethod(DEFAULT_PAYMENT_METHOD);
    setPaymentNote("");
    setPaymentProof(null);
    setPaymentError("");
  }, [selectedInvoice]);

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
        setReceiptError(getErrorMessage(nextError, dictionary));
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
      }, DRAWER_OPEN_DELAY_MS);
    } catch (nextError) {
      setError(getErrorMessage(nextError, dictionary));
    } finally {
      setPdfLoadingId(null);
    }
  }

  function submitInvoicePayment() {
    if (!selectedInvoice) {
      return;
    }

    const nextPaidAmount = Number(paymentAmount || 0);
    if (!Number.isFinite(nextPaidAmount) || nextPaidAmount <= 0) {
      setPaymentError(dictionary.insufficientPayment);
      return;
    }

    setPaymentError("");

    startPaymentTransition(async () => {
      try {
        const response = await createInvoicePayment(selectedInvoice.id, {
          note: paymentNote.trim() || undefined,
          paid_amount: nextPaidAmount,
          payment_method: paymentMethod,
          proof: paymentProof,
        });

        setSelectedInvoice(response.data);
        if (paymentProofInputRef.current) {
          paymentProofInputRef.current.value = "";
        }
        setPaymentProof(null);
        setIsPaymentModalOpen(false);

        const invoiceListResponse = await listInvoices();
        setInvoices(invoiceListResponse.data ?? []);
      } catch (nextError) {
        setPaymentError(getErrorMessage(nextError, dictionary));
      }
    });
  }

  function openPaymentModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setIsUnpayModalOpen(false);
    setPaymentError("");
    setIsPaymentModalOpen(true);
  }

  function closePaymentModal() {
    setIsPaymentModalOpen(false);
    setPaymentError("");
    setPaymentProof(null);
    if (paymentProofInputRef.current) {
      paymentProofInputRef.current.value = "";
    }
  }

  function openUnpayModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(false);
    setUnpayReason("");
    setUnpayError("");
    setIsUnpayModalOpen(true);
  }

  function closeUnpayModal() {
    setIsUnpayModalOpen(false);
    setUnpayReason("");
    setUnpayError("");
  }

  function closeReceiptModal() {
    setIsReceiptOpen(false);
    setSelectedSale(null);
    setSelectedInvoice(null);
    setReceiptError("");
    setPaymentError("");
    setUnpayError("");
  }

  function submitInvoiceUnpay() {
    if (!selectedInvoice) {
      return;
    }

    const reason = unpayReason.trim();
    if (!reason) {
      setUnpayError(dictionary.unpayReasonLabel);
      return;
    }

    setUnpayError("");

    startUnpayTransition(async () => {
      try {
        const response = await unpayInvoice(selectedInvoice.id, reason);
        setSelectedInvoice(response.data);
        setIsUnpayModalOpen(false);

        const invoiceListResponse = await listInvoices();
        setInvoices(invoiceListResponse.data ?? []);
      } catch (nextError) {
        setUnpayError(getErrorMessage(nextError, dictionary));
      }
    });
  }

  function openPaymentProof(invoiceId: string, paymentId?: string) {
    if (!paymentId) {
      return;
    }

    const proofPath = getInvoicePaymentProofPath(invoiceId, paymentId);
    window.open(proofPath, "_blank", "noopener,noreferrer");
  }

  function openLatestPaymentProof(invoiceId: string) {
    setError("");

    startTransition(async () => {
      try {
        const response = await getInvoiceById(invoiceId);
        const paymentId = findLatestProofPaymentId(response.data);

        if (!paymentId) {
          setError(dictionary.noProofLabel);
          return;
        }

        openPaymentProof(invoiceId, paymentId);
      } catch (nextError) {
        setError(getErrorMessage(nextError, dictionary));
      }
    });
  }

  async function openSaleReceiptPreview(saleId: string) {
    setSaleReceiptLoadingId(saleId);
    setIsSaleReceiptDrawerOpen(false);
    setSaleReceiptHtml(null);

    try {
      const html = await getSaleReceiptHtml(saleId);
      setSaleReceiptHtml(html);

      if (openDrawerTimerRef.current) {
        window.clearTimeout(openDrawerTimerRef.current);
      }

      openDrawerTimerRef.current = window.setTimeout(() => {
        setIsSaleReceiptDrawerOpen(true);
      }, DRAWER_OPEN_DELAY_MS);
    } catch (nextError) {
      setError(getErrorMessage(nextError, dictionary));
    } finally {
      setSaleReceiptLoadingId(null);
    }
  }

  function closePdfDrawer() {
    setIsPdfDrawerOpen(false);
  }

  function closeSaleReceiptDrawer() {
    setIsSaleReceiptDrawerOpen(false);
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

  function printSaleReceiptPreview() {
    const frameWindow = saleReceiptFrameRef.current?.contentWindow;

    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
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
      }, DRAWER_CLOSE_CLEANUP_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [isPdfDrawerOpen, pdfPreviewUrl]);

  useEffect(() => {
    if (!isSaleReceiptDrawerOpen && saleReceiptHtml) {
      const timer = window.setTimeout(() => {
        setSaleReceiptHtml(null);
      }, DRAWER_CLOSE_CLEANUP_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [isSaleReceiptDrawerOpen, saleReceiptHtml]);

  function renderLineItems(items: DocumentLineItem[]) {
    return (
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={`${item.product_id}-${item.id ?? item.product_name ?? "item"}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div>
              <p className="font-semibold text-slate-900">{item.product_name ?? dictionary.unavailableProduct}</p>
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
    );
  }

  return (
    <>
      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.historyTitle}</h2>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
            {dictionary.itemCountLabel} {filteredRecords.length}
          </span>
        </div>

        <div className="mt-4">
          <input
            className="w-full rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dictionary.documentSearchPlaceholder}
            value={search}
          />
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{dictionary.paymentMethodLabel}</th>
                <th className="px-4 py-3">{dictionary.customerColumnLabel}</th>
                <th className="px-4 py-3">{dictionary.saleAtLabel}</th>
                <th className="px-4 py-3">{dictionary.summary.totalLabel}</th>
                <th className="px-4 py-3">{dictionary.actionsLabel}</th>
                <th className="px-4 py-3">{dictionary.statusLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {!isPending && filteredRecords.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={TABLE_COLUMN_COUNT}>
                    {dictionary.emptyHistory}
                  </td>
                </tr>
              ) : null}

              {paginatedRecords.map((record) => {
                if (mode === "pending") {
                  const invoice = record as Invoice;
                  const normalizedStatus = normalizeInvoiceStatus(invoice.status);

                  return (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-slate-700">{dictionary.customerSettlementInvoice}</td>
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
                            className="rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={pdfLoadingId === invoice.id}
                            onClick={() => openInvoicePdf(invoice.id)}
                            type="button"
                          >
                            {dictionary.invoiceButton}
                          </button>
                          {invoice.status !== "paid" ? (
                            <button
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              onClick={() => openPaymentModal(invoice)}
                              type="button"
                            >
                              {dictionary.markPaidButton}
                            </button>
                          ) : null}
                          {invoice.status && invoice.status !== "unpaid" ? (
                            <button
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                              onClick={() => openUnpayModal(invoice)}
                              type="button"
                            >
                              {dictionary.markUnpaidButton}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {normalizedStatus === "paid" || normalizedStatus === "partially_paid" ? (
                          <button
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition hover:brightness-95 ${invoiceStatusClassName[normalizedStatus]}`}
                            onClick={() => openLatestPaymentProof(invoice.id)}
                            type="button"
                          >
                            {getInvoiceStatusLabel(normalizedStatus, dictionary)}
                          </button>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusClassName[normalizedStatus]}`}>
                            {getInvoiceStatusLabel(normalizedStatus, dictionary)}
                          </span>
                        )}
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
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saleReceiptLoadingId === sale.id}
                        onClick={() => openSaleReceiptPreview(sale.id)}
                        type="button"
                      >
                        {saleReceiptLoadingId === sale.id
                          ? dictionary.receiptPreviewLoading
                          : dictionary.viewReceiptButton}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {dictionary.statusPaidLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label
                className="text-xs font-semibold text-slate-500"
                htmlFor="documents-page-size"
              >
                {dictionary.pagination.perPage}
              </label>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                id="documents-page-size"
                onChange={(event) => setPageSize(Number(event.target.value))}
                value={pageSize}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  type="button"
                >
                  {dictionary.pagination.previous}
                </button>

                {pageNumbers.map((page) => (
                  <button
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      page === currentPage
                        ? "bg-violet-600 text-white"
                        : "border border-slate-200 text-violet-700 hover:bg-violet-50"
                    }`}
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}

                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  type="button"
                >
                  {dictionary.pagination.next}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closeReceiptModal}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            {receiptError ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {receiptError}
              </div>
            ) : null}

            {isReceiptPending && !selectedSale && !selectedInvoice ? (
              <div className="mt-6 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.viewReceiptButton}
              </div>
            ) : null}

            {selectedSale ? (
              renderLineItems(selectedSale.items ?? [])
            ) : null}

            {selectedInvoice ? (
              <>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
                    className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pdfLoadingId === selectedInvoice.id}
                    onClick={() => openInvoicePdf(selectedInvoice.id)}
                    type="button"
                  >
                    {dictionary.pdfButton}
                  </button>
                </div>

                {(selectedInvoice.payments ?? []).length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">{dictionary.pendingPaymentSectionTitle}</p>
                    <div className="mt-3 space-y-2">
                      {(selectedInvoice.payments ?? []).map((payment) => (
                        <div
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                          key={payment.id ?? `${payment.created_at}-${payment.paid_amount}`}
                        >
                          <div className="text-sm text-slate-700">
                            <p className="font-medium">
                              {formatCurrency(payment.paid_amount)} · {payment.payment_method}
                            </p>
                            {payment.created_at ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDateTime(payment.created_at)}
                              </p>
                            ) : null}
                          </div>
                          {payment.proof_url || payment.id ? (
                            <button
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              onClick={() => openPaymentProof(selectedInvoice.id, payment.id)}
                              type="button"
                            >
                              {dictionary.viewProofButton}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">{dictionary.noProofLabel}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {renderLineItems(selectedInvoice.items ?? [])}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isPaymentModalOpen && selectedInvoice ? (
        <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">{dictionary.pendingPaymentSectionTitle}</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closePaymentModal}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            {paymentError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {paymentError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {dictionary.customerPaymentLabel}
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder={dictionary.amountPlaceholder}
                  value={paymentAmount}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {dictionary.paymentMethodLabel}
                </span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  value={paymentMethod}
                >
                  <option value="cash">{dictionary.paymentMethodCashLabel}</option>
                  <option value="bank_transfer">{dictionary.paymentMethodTransfer}</option>
                  <option value="card">{dictionary.paymentMethodCard}</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {dictionary.noteLabel}
              </span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setPaymentNote(event.target.value)}
                value={paymentNote}
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {dictionary.paymentProofLabel}
              </span>
              <input
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)}
                ref={paymentProofInputRef}
                type="file"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closePaymentModal}
                type="button"
              >
                {dictionary.printReceiptSkipButton}
              </button>
              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={isPaymentPending}
                onClick={submitInvoicePayment}
                type="button"
              >
                {isPaymentPending ? dictionary.pendingPaymentLoading : dictionary.pendingPaymentButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isUnpayModalOpen && selectedInvoice ? (
        <div className="fixed inset-0 z-[59] flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">{dictionary.markUnpaidButton}</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closeUnpayModal}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>

            {unpayError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {unpayError}
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {dictionary.unpayReasonLabel}
              </span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setUnpayReason(event.target.value)}
                value={unpayReason}
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={closeUnpayModal}
                type="button"
              >
                {dictionary.printReceiptSkipButton}
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                disabled={isUnpayPending}
                onClick={submitInvoiceUnpay}
                type="button"
              >
                {isUnpayPending ? dictionary.unpayLoading : dictionary.unpayConfirmButton}
              </button>
            </div>
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={printPdfPreview}
                  type="button"
                >
                  {dictionary.printButton || dictionary.viewReceiptButton}
                </button>
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
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

      {saleReceiptHtml ? (
        <div
          className={`fixed inset-0 z-[60] flex justify-end bg-slate-950/40 transition-opacity duration-300 ${
            isSaleReceiptDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={closeSaleReceiptDrawer}
        >
          <div
            className={`h-full w-[45vw] min-w-[320px] max-w-[760px] bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSaleReceiptDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{dictionary.receiptPreviewTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={printSaleReceiptPreview}
                  type="button"
                >
                  {dictionary.printButton || dictionary.viewReceiptButton}
                </button>
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={closeSaleReceiptDrawer}
                  type="button"
                >
                  {dictionary.closeReceiptButton}
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-65px)] bg-slate-100 p-3">
              <iframe
                className="h-full w-full rounded-xl border border-slate-200 bg-white"
                ref={saleReceiptFrameRef}
                srcDoc={saleReceiptHtml}
                title={dictionary.receiptPreviewTitle}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
