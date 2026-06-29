"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Ban, ChevronDown, FileDown, FileText, Loader2, Mail, Printer, Share2, Truck, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelDocument, convertQuotation, convertToDeliveryOrder, convertToTaxInvoice, payInvoice, getDocumentPrintHtml, getRelatedDocuments } from "@/services/documents";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { DocumentType } from "@/types/document";

import { DocumentTimeline } from "./document-timeline";

// Copy print options per document type, mirroring the backend doccopy.SpecFor.
// value -1 = whole set; 0..n = a single copy (0-based).
function copyOptionsFor(t?: DocumentType): { value: number; label: string }[] {
  if (t === "DELIVERY_ORDER") {
    return [
      { value: -1, label: "พิมพ์ทั้งชุด (3 ใบ)" },
      { value: 0, label: "ต้นฉบับ — ลูกค้า" },
      { value: 1, label: "สำเนา — ลูกค้า (ตั้งหนี้)" },
      { value: 2, label: "สำเนา — บริษัท" },
    ];
  }
  return [
    { value: -1, label: "พิมพ์ทั้งชุด (2 ใบ)" },
    { value: 0, label: "ต้นฉบับ — ลูกค้า" },
    { value: 1, label: "สำเนา — บริษัท" },
  ];
}

type Dict = {
  previewTitle: string;
  viewFull: string;
  loading: string;
  relatedDocs: string;
  downloadPDF: string;
  email: string;
  share: string;
  comingSoon: string;
  pdfError: string;
  pdfHint?: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
  cancel: string;
  confirm: string;
  cancelDocument: string;
  confirmCancelDoc: string;
  cancelSuccess: string;
  cancelError: string;
};

type Props = {
  documentId: string;
  documentNo?: string;
  documentType?: DocumentType;
  paymentStatus?: string;      // "UNPAID" | "PARTIAL" | "PAID"
  documentStatus?: string;     // "PENDING" | "COMPLETED" | "CANCELLED" | ...
  sourceDocumentId?: string;   // for DELIVERY_ORDER → linked INVOICE id
  dict: Dict;
  onClose: () => void;
  onNavigate?: (id: string) => void; // jump to another document in the lineage
};

// A4 types open as a full drawer; all others use the inline panel card.
const A4_TYPES: DocumentType[] = ["INVOICE", "TAX_INVOICE", "BILL", "QUOTATION", "CREDIT_NOTE", "DELIVERY_ORDER"];

function isA4(type?: DocumentType) {
  return type ? A4_TYPES.includes(type) : true; // default to drawer if unknown
}

export function DocumentPreviewPanel({ documentId, documentNo, documentType, paymentStatus, documentStatus, sourceDocumentId, dict, onClose, onNavigate }: Props) {
  const [, startOpenTransition] = useTransition();
  const [isConverting, startConvertTransition] = useTransition();
  const [isPaying, startPayTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const isPaid = paymentStatus === "PAID";
  const isCancelled = documentStatus === "CANCELLED";
  const drawer = isA4(documentType);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const qc = useQueryClient();

  const { data: html, isLoading } = useQuery({
    queryKey: ["document-print", documentId],
    queryFn: () => getDocumentPrintHtml(documentId),
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

  const [isPdfLoading, startPdfTransition] = useTransition();
  // Which copy to print/download: -1 = whole set (default), 0..n = a single copy.
  const [copySel, setCopySel] = useState(-1);
  const copyOptions = copyOptionsFor(documentType);
  function handleDownloadPdf() {
    startPdfTransition(async () => {
      try {
        // Render the SAME unified HTML as the preview/print, then let the browser
        // produce the PDF via its print dialog ("Save as PDF"). This guarantees the
        // PDF matches the on-screen document exactly — the app-wide pattern. The
        // standalone gofpdf renderer drew a different layout and is no longer used here.
        const freshHtml = await getDocumentPrintHtml(documentId, copySel);
        const titled = freshHtml.replace(
          /<title>[\s\S]*?<\/title>/i,
          `<title>${documentNo || documentId}</title>`,
        );
        const blob = new Blob([titled], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
        document.body.appendChild(frame);
        frame.src = blobUrl;
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => { URL.revokeObjectURL(blobUrl); frame.remove(); }, 2000);
        };
        toast.info(dict.pdfHint ?? "เลือก \"บันทึกเป็น PDF\" ในหน้าต่างพิมพ์");
      } catch {
        toast.error(dict.pdfError);
      }
    });
  }

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

  function handleConvertToDO() {
    setCreateMenuOpen(false);
    startConvertTransition(async () => {
      try {
        await convertToDeliveryOrder(documentId);
        toast.success("สร้างใบส่งของสำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถสร้างใบส่งของได้");
      }
    });
  }

  function handlePayDO() {
    if (!sourceDocumentId) return;
    startPayTransition(async () => {
      try {
        await payInvoice(sourceDocumentId);
        toast.success("ชำระแล้ว — สร้างใบกำกับภาษีสำเร็จ");
        qc.invalidateQueries({ queryKey: ["documents"] });
        onClose();
      } catch {
        toast.error("ไม่สามารถดำเนินการได้");
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

  function handlePrint() {
    startOpenTransition(async () => {
      const freshHtml = await getDocumentPrintHtml(documentId, copySel);
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
              {documentType === "DELIVERY_ORDER" && sourceDocumentId && !isPaid && !isCancelled && (
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
              {/* Copy selector — applies to both Print and PDF (Original/Copy set) */}
              <select
                value={copySel}
                onChange={(e) => setCopySel(Number(e.target.value))}
                title="เลือกชุดสำเนาที่จะพิมพ์/ดาวน์โหลด"
                className="rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs font-medium text-violet-700 outline-none transition-colors hover:bg-violet-50 focus:border-violet-400"
              >
                {copyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={isPdfLoading}
                onClick={handleDownloadPdf}
                title={dict.downloadPDF}
                className="rounded-lg border border-violet-200 bg-white p-1.5 text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
              >
                {isPdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => toast.info(dict.comingSoon)}
                title={dict.email}
                className="rounded-lg border border-violet-200 bg-white p-1.5 text-violet-700 transition-colors hover:bg-violet-50"
              >
                <Mail className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toast.info(dict.comingSoon)}
                title={dict.share}
                className="rounded-lg border border-violet-200 bg-white p-1.5 text-violet-700 transition-colors hover:bg-violet-50"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!html}
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-40"
              >
                <Printer className="h-3.5 w-3.5" />
                พิมพ์
              </button>
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
