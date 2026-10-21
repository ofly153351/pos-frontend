"use client";

import { useEffect, useRef, useState, useTransition, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Ban, Check, ChevronDown, Copy, FileBadge, FileDown, FileMinus, FileSearch, FileText, Loader2, Mail, MoreHorizontal, Pencil, Printer, Receipt, Share2, Truck, Wallet, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/services/api";
import { cancelDocument, completeDeliveryOrder, convertDocument, convertQuotation, convertToDeliveryOrder, convertToTaxInvoice, createDocument, getDocument, getDocumentPdfBlob, payInvoice, updateDocumentPaymentStatus, getDocumentPrintHtml, getRelatedDocuments, getDocuments, getDocumentRevisions, restoreDocumentRevision } from "@/services/documents";
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

function stripScriptsFromPreviewPage(page: string) {
  // Paged.js has already finished in the worker iframe. The extracted page is
  // display-only, so scripts must not be copied into the sandboxed child iframe.
  return page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function buildPreviewPageDocument(styles: string, page: string) {
  return `<!doctype html><html><head><meta charset="utf-8">${styles}<style>
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0;width:794px;height:1123px;overflow:auto;background:#e2e8f0;scrollbar-width:none;-ms-overflow-style:none}
    html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
    .pagedjs_page,.pagedjs_sheet,.pagedjs_pagebox{width:794px!important;height:1123px!important;min-height:1123px!important;margin:0!important}
    .pagedjs_margin,.pagedjs_bleed,.pagedjs_marks{display:none!important}
    .pagedjs_page{background:#fff;box-shadow:none!important;position:relative;overflow:visible}
    .pagedjs_bleed-top{background:#e2e8f0;border-top:2px dashed #94a3b8}
  </style></head><body>${page}</body></html>`;
}

export function DocumentPreviewPanel({ documentId, documentNo, documentType, customerId, paymentStatus, documentStatus, dict, onClose, onEdit, onNavigate }: DocumentPreviewPanelProps) {
  const [, startOpenTransition] = useTransition();
  const [isConverting, startConvertTransition] = useTransition();
  const [isPaying, startPayTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [receiptTemplateModalOpen, setReceiptTemplateModalOpen] = useState(false);
  const [receiptTemplateChoice, setReceiptTemplateChoice] = useState<1 | 2 | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false);
  const [deliveryDateModal, setDeliveryDateModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [poRefNo, setPoRefNo] = useState("");
  const poRefNoInputRef = useRef("");

  const isPaid = paymentStatus === "PAID";
  const isCancelled = documentStatus === "CANCELLED";
  const drawer = isA4(documentType);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [previewStyles, setPreviewStyles] = useState("");
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
    queryFn: async () => (await getDocuments({ type: "BILL", customer_id: customerId, limit: 500 })).items ?? [],
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

  useEffect(() => {
    setPreviewPages([]);
    setPreviewStyles("");
  }, [html, drawer]);

  // Lineage for the timeline strip (Quotation → Invoice → DO → Tax Invoice …).
  const { data: related = [] } = useQuery({
    queryKey: ["document-related", documentId],
    queryFn: () => getRelatedDocuments(documentId),
    enabled: !!documentId,
    staleTime: 30_000,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ["document-revisions", documentId],
    queryFn: () => getDocumentRevisions(documentId),
    enabled: !!documentId && revisionHistoryOpen,
    staleTime: 5_000,
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

  function notifyConversionFailure(error: unknown, fallback: string) {
    if (error instanceof ApiError && error.status === 409) {
      toast.warning(dict.alreadyConverted);
      return;
    }
    toast.error(fallback);
  }

  function handleConvert() {
    startConvertTransition(async () => {
      try {
        await convertQuotation(documentId);
        toast.success("แปลงเป็นใบแจ้งหนี้สำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch (error) {
        notifyConversionFailure(error, "ไม่สามารถแปลงเอกสารได้");
      }
    });
  }

  function handlePayInvoice() {
    startPayTransition(async () => {
      try {
        await payInvoice(documentId);
        toast.success(dict.payRelatedSuccess);
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
      } catch (error) {
        notifyConversionFailure(error, "ไม่สามารถแปลงเอกสารได้");
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

  function handleOpenOrCreateReceipt() {
    const existingReceipt = related.find(
      (item) => item.id !== documentId && item.type === "RECEIPT",
    );
    if (existingReceipt && onNavigate) {
      setManageMenuOpen(false);
      onNavigate(existingReceipt.id);
      return;
    }
    handleConvertToReceipt();
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
        setManageMenuOpen(false);
        if (onNavigate) onNavigate(receipt.id);
        else onClose();
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          toast.warning(dict.receiptAlreadyCreated);
          return;
        }
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
      } catch (error) {
        notifyConversionFailure(error, "ไม่สามารถสร้างใบส่งของได้");
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

  function handleRestoreRevision(revisionNo: number) {
    startConvertTransition(async () => {
      try {
        await restoreDocumentRevision(documentId, revisionNo);
        toast.success(dict.revisionRestored);
        qc.invalidateQueries({ queryKey: ["document-print", documentId] });
        qc.invalidateQueries({ queryKey: ["document-revisions", documentId] });
        qc.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        toast.error(dict.revisionError);
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
      frame.onload = async () => {
        const printWindow = frame.contentWindow as (Window & { __posPagedReady?: Promise<unknown> }) | null;
        await printWindow?.__posPagedReady;
        printWindow?.focus();
        printWindow?.print();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); }, 2000);
      };
    });
  }

  function handleDownloadPdf() {
    startOpenTransition(async () => {
      try {
        const blob = await getDocumentPdfBlob(documentId, copyIdx, receiptTemplate);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${documentNo || documentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(dict.pdfError);
      }
    });
  }

  function handleDuplicate() {
    startConvertTransition(async () => {
      try {
        const full = await getDocument(documentId);
        const today = new Date().toISOString().slice(0, 10);
        await createDocument({
          type: full.type,
          customer_id: full.customer_id,
          ...(full.customer_id ? {} : { customer_name: full.customer_name }),
          document_date: today,
          vat_rate: full.vat_rate,
          notes: full.notes,
          items: full.items.map((item) => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_type: item.discount_type,
            discount_value: item.discount_value,
          })),
        });
        qc.invalidateQueries({ queryKey: ["documents"] });
        toast.success(dict.duplicateSuccess);
      } catch {
        toast.error(dict.duplicateError);
      }
    });
  }

  function handleConvertGeneric(target: "CREDIT_NOTE") {
    startConvertTransition(async () => {
      try {
        await convertDocument(documentId, target);
        qc.invalidateQueries({ queryKey: ["documents"] });
        toast.success(dict.convertSuccess);
      } catch (error) {
        notifyConversionFailure(error, dict.convertError);
      }
    });
  }

  const canEditDocument = onEdit && documentStatus !== "COMPLETED" && documentStatus !== "CANCELLED" && paymentStatus !== "PAID";
  const utilityMenuItems = [
    { label: dict.printPreview, icon: FileSearch, onClick: () => handlePrint() },
    { label: dict.downloadPDF, icon: FileDown, onClick: handleDownloadPdf },
    { label: dict.duplicate, icon: Copy, onClick: handleDuplicate },
    ...(canEditDocument ? [{ label: dict.editDocument, icon: Pencil, onClick: () => onEdit?.() }] : []),
  ];
  const hasDirectConversion = (target: string) => related.some(
    (item) => item.id !== documentId && item.type === target && item.source_document_id === documentId,
  );
  const conversionMenuItems = (
    documentType === "QUOTATION"
      ? [{ label: dict.typeInvoice, icon: FileBadge, target: "INVOICE", onClick: handleConvert }]
      : documentType === "INVOICE"
        ? [
            { label: dict.typeReceipt, icon: Receipt, target: "RECEIPT", onClick: handleOpenOrCreateReceipt },
            { label: dict.typeTaxInvoice, icon: FileBadge, target: "TAX_INVOICE", onClick: handleConvertToTax },
            { label: dict.typeDeliveryOrder, icon: Truck, target: "DELIVERY_ORDER", onClick: handleConvertToDO },
            { label: dict.typeCreditNote, icon: FileMinus, target: "CREDIT_NOTE", onClick: () => handleConvertGeneric("CREDIT_NOTE") },
          ]
        : documentType === "DELIVERY_ORDER" || documentType === "BILL"
          ? [{ label: dict.typeReceipt, icon: Receipt, target: "RECEIPT", onClick: handleOpenOrCreateReceipt }]
          : []
  ).filter((item) => !hasDirectConversion(item.target));
  const statusMenuItems = [
    documentType === "INVOICE" && !isPaid && !isCancelled
      ? { label: dict.recordPayment, icon: Wallet, onClick: handlePayInvoice, tone: "text-emerald-700 hover:bg-emerald-50" }
      : null,
    documentType === "DELIVERY_ORDER" && !isPaid && !isCancelled
      ? { label: dict.recordPayment, icon: Wallet, onClick: handlePayDO, tone: "text-emerald-700 hover:bg-emerald-50" }
      : null,
    !isCancelled && documentStatus !== "COMPLETED"
      ? { label: dict.cancelDocument, icon: Ban, onClick: handleCancel, tone: "text-rose-600 hover:bg-rose-50" }
      : null,
  ].filter((item): item is { label: string; icon: typeof Wallet; onClick: () => void; tone: string } => item !== null);

  const handlePreviewLoad = async () => {
    const frame = iframeRef.current;
    const frameWindow = frame?.contentWindow as (Window & { __posPagedReady?: Promise<unknown> }) | null;
    if (!frame || !frameWindow || !drawer) return;

    try {
      await frameWindow.__posPagedReady;
    } catch (error) {
      console.error("Document preview pagination failed", error);
      return;
    }

    const frameDocument = frame.contentDocument;
    const pages = Array.from(frameDocument?.querySelectorAll<HTMLElement>(".pagedjs_page") ?? []);
    if (!pages.length || !frameDocument) return;

    const styles = Array.from(frameDocument.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("\n");

    setPreviewStyles(styles);
    setPreviewPages(pages.map((page) => stripScriptsFromPreviewPage(page.outerHTML)));
  };

  const handlePreviewPageLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget;
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;

    const scale = Math.min(1, frame.clientWidth / 794);
    frameDocument.documentElement.style.zoom = String(scale);
  };

  const iframeBody = (
    <div className={`relative flex min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden ${drawer ? "bg-slate-100 p-6 sm:p-8" : "bg-white"}`}>
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          {dict.loading}
        </div>
      ) : html ? (
        <>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="document pagination worker"
            onLoad={handlePreviewLoad}
            className={drawer
              ? "pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
              : "h-full w-full border-0"}
            sandbox="allow-same-origin allow-scripts"
          />
          {drawer && previewPages.length > 0 && (
            <div className="flex w-full flex-col items-center gap-4">
              {previewPages.map((page, index) => (
                <iframe
                  key={`preview-page-${index + 1}`}
                  title={`document preview page ${index + 1}`}
                  srcDoc={buildPreviewPageDocument(previewStyles, page)}
                  onLoad={handlePreviewPageLoad}
                  className="block aspect-[210/297] w-full max-w-[794px] shrink-0 overflow-y-auto border-0 bg-white shadow-md"
                  sandbox="allow-same-origin"
                />
              ))}
            </div>
          )}
          {drawer && previewPages.length === 0 && (
            <div className="flex min-h-full items-center justify-center text-sm text-slate-400">
              {dict.loading}
            </div>
          )}
        </>
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
        <div className="fixed inset-y-0 right-0 z-[51] flex w-[960px] max-w-[96vw] flex-col bg-white shadow-2xl slide-in-right">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">{dict.previewTitle}</span>
              {documentNo && (
                <span className="nums text-xs font-semibold text-slate-500 whitespace-nowrap">{documentNo}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  aria-label={dict.manageDocuments}
                  title={dict.manageDocuments}
                  onClick={() => setManageMenuOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {dict.manageDocuments}
                  <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${manageMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {manageMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setManageMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-[61] mt-1 flex w-56 flex-col gap-1 overflow-hidden rounded-xl border border-violet-100 bg-white p-1.5 shadow-xl">
                    {utilityMenuItems.map(({ label, icon: Icon, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { onClick(); setManageMenuOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                      >
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        {label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    {conversionMenuItems.length > 0 && (
                      <>
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dict.convertDocument}</p>
                        {conversionMenuItems.map(({ label, icon: Icon, onClick, target }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              onClick();
                              // Keep this menu mounted while the receipt-template
                              // portal opens; the portal currently lives below the
                              // menu fragment and would otherwise unmount instantly.
                              if (target !== "RECEIPT") setManageMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                          >
                            <Icon className="h-3.5 w-3.5 opacity-70" />
                            {label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                      </>
                    )}
                    {statusMenuItems.map(({ label, icon: Icon, onClick, tone }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { onClick(); setManageMenuOpen(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        {label}
                      </button>
                    ))}
                    <div className="hidden">
              {documentType === "QUOTATION" && (
                <button
                  type="button"
                  aria-label={dict.typeInvoice}
                  title={dict.typeInvoice}
                  disabled={isConverting}
                  onClick={handleConvert}
                  className="group relative flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  <span>{dict.typeInvoice}</span>
                </button>
              )}
              {documentType === "INVOICE" && !isPaid && !isCancelled && (
                <>
                  <button
                    type="button"
                    aria-label={dict.recordPayment}
                    title={dict.recordPayment}
                    disabled={isPaying}
                    onClick={handlePayInvoice}
                    className="group relative flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                  >
                    {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    <span>{dict.recordPayment}</span>
                  </button>
                  {/* Create document dropdown */}
                  <div className="relative w-full">
                    <button
                      type="button"
                      aria-label={dict.convertDocument}
                      title={dict.convertDocument}
                      disabled={isConverting}
                      onClick={() => setCreateMenuOpen((o) => !o)}
                      className="group relative flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40"
                    >
                      {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      <span>{dict.convertDocument}</span>
                      <ChevronDown className="ml-auto h-3 w-3" />
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
                <div className="relative w-full">
                  <button
                    type="button"
                    aria-label={dict.convertDocument}
                    title={dict.convertDocument}
                    disabled={isConverting}
                    onClick={() => setCreateMenuOpen((o) => !o)}
                    className="group relative flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40"
                  >
                    {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    <span>{dict.convertDocument}</span>
                    <ChevronDown className="ml-auto h-3 w-3" />
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
                  aria-label={dict.recordPayment}
                  title={dict.recordPayment}
                  disabled={isPaying}
                  onClick={handlePayDO}
                  className="group relative flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  <span>{dict.recordPayment}</span>
                </button>
              )}
              {documentType === "DELIVERY_ORDER" && documentStatus !== "COMPLETED" && !isCancelled && (
                <button type="button" aria-label={dict.completeDelivery} title={dict.completeDelivery} disabled={isConverting} onClick={handleCompleteDelivery} className="group relative flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40">
                  {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                  <span>{dict.completeDelivery}</span>
                </button>
              )}
              {!isCancelled && documentStatus !== "COMPLETED" && (
                <button
                  type="button"
                  aria-label={dict.cancel}
                  title={dict.cancel}
                  disabled={isCancelling}
                  onClick={handleCancel}
                  className="group relative flex w-full items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40"
                >
                  {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  <span>{dict.cancel}</span>
                </button>
              )}
              {onEdit && documentStatus !== "COMPLETED" && documentStatus !== "CANCELLED" && paymentStatus !== "PAID" && (
                <button
                  type="button"
                  aria-label={dict.editDocument}
                  title={dict.editDocument}
                  onClick={onEdit}
                  className="group relative flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{dict.editDocument}</span>
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
                    <button type="button" onClick={() => { setReceiptTemplateModalOpen(false); setManageMenuOpen(false); }} className="mt-5 w-full rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">{dict.cancel}</button>
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
                className="flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-left text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
                <span>{dict.print}</span>
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
                  className="flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-left text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>{dict.moreOptions}</span>
                </button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setMoreMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-[61] mt-1 w-52 overflow-hidden rounded-lg border border-violet-100 bg-white p-1 shadow-lg">
                    {utilityMenuItems.map(({ label, icon: Icon, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { onClick(); setMoreMenuOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                      >
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        {label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    {conversionMenuItems.length > 0 && (
                      <>
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dict.convertDocument}</p>
                        {conversionMenuItems.map(({ label, icon: Icon, onClick }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => { onClick(); setMoreMenuOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-violet-50"
                          >
                            <Icon className="h-3.5 w-3.5 opacity-70" />
                            {label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                      </>
                    )}
                    {statusMenuItems.map(({ label, icon: Icon, onClick, tone }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { onClick(); setMoreMenuOpen(false); }}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        {label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setRevisionHistoryOpen((open) => !open)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50">
                      <FileText className="h-3.5 w-3.5 text-violet-600" />{dict.revisionHistory}
                    </button>
                    {revisionHistoryOpen && (
                      <div className="mb-1 max-h-48 overflow-y-auto rounded-md bg-slate-50 p-1">
                        {revisions.length === 0 ? <p className="px-2 py-2 text-xs text-slate-400">{dict.noRevisions}</p> : revisions.map((revision) => (
                          <div key={revision.revision_no} className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-slate-600">
                            <span>v{revision.revision_no} · {new Date(revision.changed_at).toLocaleString()}</span>
                            {documentStatus !== "COMPLETED" && documentStatus !== "CANCELLED" && paymentStatus !== "PAID" && <button type="button" onClick={() => handleRestoreRevision(revision.revision_no)} className="shrink-0 font-semibold text-violet-700 hover:text-violet-900">{dict.restoreRevision}</button>}
                          </div>
                        ))}
                      </div>
                    )}
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
                    </div>
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
