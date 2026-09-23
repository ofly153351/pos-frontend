"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Ban, Check, ChevronDown, FileText, Loader2, Mail, MoreHorizontal, Printer, Share2, Truck, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelDocument, completeDeliveryOrder, convertDocument, convertQuotation, convertToDeliveryOrder, convertToTaxInvoice, payInvoice, updateDocumentPaymentStatus, getDocumentPrintHtml, getRelatedDocuments, getDocuments } from "@/services/documents";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { copyChoicesFor } from "@/lib/document-copies";
import type { DocumentType } from "@/types/document";

import { DocumentTimeline } from "./document-timeline";
import type { DocumentPreviewPanelDict } from "./types";
import type { DocumentPreviewPanelProps } from "./types";






// A4 types open as a full drawer; all others use the inline panel card.
const A4_TYPES: DocumentType[] = ["INVOICE", "TAX_INVOICE", "BILL", "QUOTATION", "CREDIT_NOTE", "DELIVERY_ORDER", "RECEIPT"];

function isA4(type?: DocumentType) {
  return type ? A4_TYPES.includes(type) : true; // default to drawer if unknown
}

export function DocumentPreviewPanel({ documentId, documentNo, documentType, customerId, paymentStatus, documentStatus, dict, onClose, onNavigate }: DocumentPreviewPanelProps) {
  const [, startOpenTransition] = useTransition();
  const [isConverting, startConvertTransition] = useTransition();
  const [isPaying, startPayTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [receiptTemplateModalOpen, setReceiptTemplateModalOpen] = useState(false);
  const [receiptTemplateChoice, setReceiptTemplateChoice] = useState<1 | 2 | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [deliveryDateModal, setDeliveryDateModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [poRefNo, setPoRefNo] = useState("");
  const poRefNoInputRef = useRef("");

  const isPaid = paymentStatus === "PAID";
  const isCancelled = documentStatus === "CANCELLED";
  const drawer = isA4(documentType);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const qc = useQueryClient();

  // Copy selection — Original / Customer Copy / Company Copy / All copies.
  // -1 = whole set (default). Threaded into preview, print, and PDF so all three agree.
  const [copyIdx, setCopyIdx] = useState(-1);
  const [receiptTemplate, setReceiptTemplate] = useState<1 | 2>(1);
  const [selectedBillingDocumentIds, setSelectedBillingDocumentIds] = useState<string[]>([]);
  const [billingSearch, setBillingSearch] = useState("");
  const [billingComboOpen, setBillingComboOpen] = useState(false);
  const billingComboRef = useRef<HTMLDivElement>(null);
  const copyChoices = copyChoicesFor(documentType);

  const { data: billingDocuments = [] } = useQuery({
    queryKey: ["receipt-billing-documents", customerId],
    queryFn: async () => (await getDocuments({ type: "BILL", customer_id: customerId, limit: 500 })).items,
    enabled: !!customerId && (documentType === "BILL" || documentType === "DELIVERY_ORDER"),
  });

  const availableBillingDocuments = billingDocuments.filter(
    (bill) => bill.status !== "CANCELLED" && bill.payment_status === "UNPAID",
  );
  const filteredBillingDocuments = availableBillingDocuments.filter((bill) => {
    const query = billingSearch.trim().toLowerCase();
    if (!query) return true;
    return (bill.document_no_full || bill.document_no).toLowerCase().includes(query);
  });

  const { data: html, isLoading } = useQuery({
    queryKey: ["document-print", documentId, copyIdx, receiptTemplate],
    queryFn: () => getDocumentPrintHtml(documentId, copyIdx, receiptTemplate),
    enabled: !!documentId,
    staleTime: 30_000,
  });

  // Lineage for the timeline strip (Quotation → Invoice → DO → Tax Invoice …).
  const { data: related = [] } = useQuery({
    queryKey: ["document-related", documentId],
    queryFn: () => getRelatedDocuments(documentId),
    enabled: !!documentId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!billingComboOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (billingComboRef.current && !billingComboRef.current.contains(event.target as Node)) {
        setBillingComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [billingComboOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawer) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawer, onClose]);

  function handleConvert() {
    startConvertTransition(async () => {
      try {
        await convertQuotation(documentId);
        toast.success("แปลงเป็นใบแจ้งหนี้สำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถแปลงเอกสารได้");
      }
    });
  }

  function handlePayInvoice() {
    startPayTransition(async () => {
      try {
        await payInvoice(documentId);
        toast.success("ชำระแล้ว — สร้างใบกำกับภาษีสำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถดำเนินการได้");
      }
    });
  }

  function handleConvertToTax() {
    setCreateMenuOpen(false);
    startConvertTransition(async () => {
      try {
        await convertToTaxInvoice(documentId);
        toast.success("สร้างใบกำกับภาษีสำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถแปลงเอกสารได้");
      }
    });
  }

  function handleConvertToReceipt() {
    setCreateMenuOpen(false);
    setReceiptTemplateChoice(null);
    setBillingSearch("");
    setBillingComboOpen(false);
    setReceiptTemplateModalOpen(true);
  }

  function createReceipt(template: 1 | 2) {
    setReceiptTemplate(template);
    setReceiptTemplateModalOpen(false);
    const sourceDocumentIds = selectedBillingDocumentIds.length > 0
      ? selectedBillingDocumentIds
      : documentType === "BILL"
        ? [documentId]
        : undefined;
    startConvertTransition(async () => {
      try {
        const receipt = await convertDocument(documentId, "RECEIPT", template, sourceDocumentIds);
        toast.success("สร้างใบเสร็จรับเงิน A4 สำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        if (onNavigate) onNavigate(receipt.id);
        else onClose();
      } catch {
        toast.error("ไม่สามารถสร้างใบเสร็จรับเงินได้");
      }
    });
  }

  function handleConvertToDO() {
    setCreateMenuOpen(false);
    setDeliveryDate("");
    setPoRefNo("");
    poRefNoInputRef.current = "";
    setDeliveryDateModal(true);
  }

  function confirmConvertToDO() {
    setDeliveryDateModal(false);
    startConvertTransition(async () => {
      try {
        const poReference = poRefNoInputRef.current.trim();
        await convertToDeliveryOrder(documentId, deliveryDate || undefined, poReference || undefined);
        toast.success("สร้างใบส่งของสำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถสร้างใบส่งของได้");
      }
    });
  }

  function handlePayDO() {
    startPayTransition(async () => {
      try {
        await updateDocumentPaymentStatus(documentId, "PAID");
        toast.success("ชำระเงินใบส่งของแล้ว");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถดำเนินการได้");
      }
    });
  }

  function handleCompleteDelivery() {
    startConvertTransition(async () => {
      try {
        await completeDeliveryOrder(documentId);
        toast.success(dict.deliveryCompleteSuccess);
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error(dict.deliveryCompleteError);
      }
    });
  }

  function handleCancel() {
    setConfirmCancel(true);
  }

  function runCancel() {
    startCancelTransition(async () => {
      try {
        await cancelDocument(documentId);
        toast.success(dict.cancelSuccess);
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error(dict.cancelError);
      } finally {
        setConfirmCancel(false);
      }
    });
  }

  function handlePrint(template = receiptTemplate) {
    startOpenTransition(async () => {
      const freshHtml = await getDocumentPrintHtml(documentId, copyIdx, template);
      const blob = new Blob([freshHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
      document.body.appendChild(frame);
      frame.src = blobUrl;
      frame.onload = () => {
        frame.contentWindow?.print();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); }, 2000);
      };
    });
  }

  const iframeBody = (
    <div className="relative flex-1 overflow-hidden bg-white">
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          {dict.loading}
        </div>
      ) : html ? (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="document preview"
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          ไม่สามารถโหลดเอกสารได้
        </div>
      )}
    </div>
  );


  // ── Drawer mode (A4 documents) ──────────────────────────────────────────────
  if (drawer) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[50] bg-black/20 smooth-fade"
          onClick={onClose}
        />
        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 z-[51] flex w-[820px] max-w-[92vw] flex-col bg-white shadow-2xl slide-in-right">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">{dict.previewTitle}</span>
              {documentNo && (
                <span className="nums text-xs font-semibold text-slate-500 whitespace-nowrap">{documentNo}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {documentType === "QUOTATION" && (
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={handleConvert}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  แปลงเป็นใบแจ้งหนี้
                </button>
              )}
              {documentType === "INVOICE" && !isPaid && !isCancelled && (
                <>
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handlePayInvoice}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                  >
                    {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    ชำระแล้ว
                  </button>
                  {/* Create document dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isConverting}
                      onClick={() => setCreateMenuOpen((o) => !o)}
                      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40"
                    >
                      {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      สร้างเอกสาร
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {createMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setCreateMenuOpen(false)} />
                        <div className="absolute right-0 top-full z-[61] mt-1 w-44 overflow-hidden rounded-lg border border-violet-100 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={handleConvertToTax}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                          >
                            <FileText className="h-3.5 w-3.5 text-violet-500" />
                            ใบกำกับภาษี
                          </button>
                          <button
                            type="button"
                            onClick={handleConvertToDO}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                          >
                            <Truck className="h-3.5 w-3.5 text-violet-500" />
                            ใบส่งของ
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
              {(documentType === "DELIVERY_ORDER" || documentType === "BILL") && !isCancelled && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={() => setCreateMenuOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40"
                  >
                    {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    สร้างเอกสาร
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {createMenuOpen && (
                    <div className="absolute right-0 top-full z-[61] mt-1 w-44 overflow-hidden rounded-lg border border-violet-100 bg-white shadow-lg">
                      <button type="button" onClick={handleConvertToReceipt} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50">
                        <FileText className="h-3.5 w-3.5 text-violet-500" />
                        {dict.typeReceipt}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {documentType === "DELIVERY_ORDER" && !isPaid && !isCancelled && (
                <button
                  type="button"
                  disabled={isPaying}
                  onClick={handlePayDO}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  ชำระแล้ว
                </button>
              )}
              {documentType === "DELIVERY_ORDER" && documentStatus !== "COMPLETED" && !isCancelled && (
                <button type="button" disabled={isConverting} onClick={handleCompleteDelivery} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40">
                  {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                  {dict.completeDelivery}
                </button>
              )}
              {!isCancelled && documentStatus !== "COMPLETED" && (
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40"
                >
                  {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  ยกเลิก
                </button>
              )}
              {receiptTemplateModalOpen && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
                  <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-1 text-lg font-bold text-slate-800">{dict.receiptTemplateTitle}</div>
                    <p className="mb-5 text-sm text-slate-500">{dict.receiptTemplateDescription}</p>
                    {receiptTemplateChoice === 2 && (
                      <div className="mb-5 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                        <div className="text-sm font-semibold text-slate-800">{dict.receiptSettlementTitle}</div>
                        <p className="mt-1 text-xs text-slate-500">{dict.receiptSettlementHint}</p>
                        <div ref={billingComboRef} className="relative mt-3">
                          <button
                            type="button"
                            role="combobox"
                            aria-expanded={billingComboOpen}
                            aria-controls="receipt-billing-combobox-options"
                            onClick={() => setBillingComboOpen((open) => !open)}
                            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-violet-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {selectedBillingDocumentIds.length > 0 ? (
                                selectedBillingDocumentIds.slice(0, 2).map((id) => {
                                  const bill = availableBillingDocuments.find((item) => item.id === id);
                                  return bill ? (
                                    <span key={id} className="inline-flex max-w-[10rem] items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                                      <span className="truncate">{bill.document_no_full || bill.document_no}</span>
                                      <X aria-hidden="true" className="h-3 w-3" />
                                    </span>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-sm text-slate-400">{dict.receiptSettlementSearchPlaceholder}</span>
                              )}
                              {selectedBillingDocumentIds.length > 2 && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                  +{selectedBillingDocumentIds.length - 2}
                                </span>
                              )}
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${billingComboOpen ? "rotate-180" : ""}`} />
                          </button>
                          {billingComboOpen && (
                            <div id="receipt-billing-combobox-options" className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-xl">
                              <div className="border-b border-slate-100 p-2">
                                <input
                                  type="search"
                                  autoFocus
                                  value={billingSearch}
                                  onChange={(event) => setBillingSearch(event.target.value)}
                                  placeholder={dict.receiptSettlementSearchPlaceholder}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white"
                                />
                              </div>
                              <div className="max-h-52 overflow-y-auto p-1">
                                {filteredBillingDocuments.length > 0 ? filteredBillingDocuments.map((bill) => {
                                  const checked = selectedBillingDocumentIds.includes(bill.id);
                                  return (
                                    <button
                                      key={bill.id}
                                      type="button"
                                      onClick={() => setSelectedBillingDocumentIds((current) => checked ? current.filter((id) => id !== bill.id) : [...current, bill.id])}
                                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-violet-50"
                                    >
                                      <span className="flex min-w-0 items-center gap-3">
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"}`}>
                                          {checked && <Check className="h-3.5 w-3.5" />}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="nums block truncate text-sm font-semibold text-slate-700">{bill.document_no_full || bill.document_no}</span>
                                          <span className="block text-[11px] text-slate-400">{dict.receiptSettlementSelected}</span>
                                        </span>
                                      </span>
                                      <span className="nums shrink-0 text-xs font-semibold text-slate-500">{Number(bill.total_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                                    </button>
                                  );
                                }) : (
                                  <div className="px-3 py-4 text-center text-xs text-slate-400">{dict.receiptSettlementNoMatch}</div>
                                )}
                              </div>
                              {selectedBillingDocumentIds.length > 0 && (
                                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs">
                                  <span className="font-semibold text-violet-700">{selectedBillingDocumentIds.length} {dict.receiptSettlementSelected}</span>
                                  <button type="button" onClick={() => setSelectedBillingDocumentIds([])} className="font-semibold text-slate-400 hover:text-slate-700">{dict.clearSelection}</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedBillingDocumentIds.length > 0 && (
                          <div className="mt-2 text-xs font-semibold text-violet-700">
                            {selectedBillingDocumentIds.length} {dict.receiptSettlementSelected}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => createReceipt(1)} disabled={isConverting} className={`rounded-xl border p-4 text-left transition hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 ${receiptTemplateChoice === 1 ? "border-violet-500 bg-violet-50" : "border-slate-200"}`}>
                        <div className="font-semibold text-slate-800">{dict.receiptTemplate1}</div>
                        <div className="mt-1 text-xs text-slate-500">{dict.receiptTemplate1Description}</div>
                      </button>
                      <button type="button" onClick={() => setReceiptTemplateChoice(2)} disabled={isConverting} className={`rounded-xl border p-4 text-left transition hover:border-violet-500 hover:bg-violet-50 disabled:opacity-50 ${receiptTemplateChoice === 2 ? "border-2 border-violet-300 bg-violet-50" : "border-slate-200"}`}>
                        <div className="font-semibold text-violet-800">{dict.receiptTemplate2}</div>
                        <div className="mt-1 text-xs text-slate-600">{dict.receiptTemplate2Description}</div>
                      </button>
                    </div>
                    {receiptTemplateChoice === 2 && (
                      <button type="button" onClick={() => createReceipt(2)} disabled={isConverting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
                        {isConverting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {dict.receiptTemplate2}
                      </button>
                    )}
                    <button type="button" onClick={() => setReceiptTemplateModalOpen(false)} className="mt-5 w-full rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">{dict.cancel}</button>
                  </div>
                </div>,
                document.body,
              )}
              {confirmCancel && (
                <ConfirmModal
                  open
                  tone="danger"
                  title={dict.cancelDocument}
                  message={dict.confirmCancelDoc}
                  confirmLabel={dict.confirm}
                  cancelLabel={dict.cancel}
                  loading={isCancelling}
                  onConfirm={runCancel}
                  onClose={() => setConfirmCancel(false)}
                />
              )}
              <button
                type="button"
                aria-label={dict.print}
                title={dict.print}
                disabled={!html}
                onClick={() => handlePrint()}
                className="rounded-lg border border-violet-200 bg-white p-1.5 text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
              </button>
              {documentType === "RECEIPT" && (
                <div className="flex items-center rounded-lg border border-violet-200 bg-violet-50 p-0.5" role="group" aria-label={dict.receiptTemplateLabel}>
                  {([1, 2] as const).map((template) => {
                    const selected = receiptTemplate === template;
                    const label = template === 1 ? dict.receiptTemplate1 : dict.receiptTemplate2;
                    return (
                      <button
                        key={template}
                        type="button"
                        aria-pressed={selected}
                        disabled={!html}
                        onClick={() => setReceiptTemplate(template)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                          selected ? "bg-violet-600 text-white shadow-sm" : "text-violet-700 hover:bg-violet-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  aria-label={dict.moreOptions}
                  title={dict.moreOptions}
                  onClick={() => setMoreMenuOpen((open) => !open)}
                  className="rounded-lg border border-violet-200 bg-white p-1.5 text-violet-700 transition-colors hover:bg-violet-50"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setMoreMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-[61] mt-1 w-52 overflow-hidden rounded-lg border border-violet-100 bg-white p-1 shadow-lg">
                      <select
                        value={copyIdx}
                        onChange={(e) => setCopyIdx(Number(e.target.value))}
                        title="เลือกชุดสำเนาที่จะพิมพ์"
                        className="mb-1 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-xs font-semibold text-violet-700"
                      >
                        {copyChoices.map((c) => (
                          <option key={c.idx} value={c.idx}>{c.th}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => toast.info(dict.comingSoon)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50">
                        <Mail className="h-3.5 w-3.5 text-violet-600" />{dict.email}
                      </button>
                      <button type="button" onClick={() => toast.info(dict.comingSoon)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50">
                        <Share2 className="h-3.5 w-3.5 text-violet-600" />{dict.share}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lineage timeline */}
          <DocumentTimeline
            items={related}
            currentId={documentId}
            label={dict.relatedDocs}
            typeLabels={dict}
            onSelect={onNavigate}
          />

          {/* Document iframe */}
          {iframeBody}

          {deliveryDateModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                <h3 className="text-base font-bold text-slate-800">{dict.typeDeliveryOrder}</h3>
                <p className="mt-1 text-sm text-slate-500">{dict.deliveryDate}</p>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="delivery-order-po-ref">
                  {dict.poReference}
                </label>
                <input
                  id="delivery-order-po-ref"
                  type="text"
                  value={poRefNo}
                  onChange={(e) => {
                    const value = e.target.value;
                    poRefNoInputRef.current = value;
                    setPoRefNo(value);
                  }}
                  placeholder={dict.poReferencePlaceholder}
                  className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {dict.invoiceReference}: {documentNo || documentId}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setDeliveryDateModal(false)} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">{dict.cancel}</button>
                  <button type="button" onClick={confirmConvertToDO} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">{dict.confirm}</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </>
    );
  }

  // ── Panel mode (A5 / RECEIPT — inline card) ─────────────────────────────────
  return (
    <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
        <span className="text-sm font-bold text-slate-800">{dict.previewTitle}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          ดึงจาก API
        </span>
      </div>

      {/* Document iframe */}
      {iframeBody}

      {/* Footer */}
    </div>
  );
}
