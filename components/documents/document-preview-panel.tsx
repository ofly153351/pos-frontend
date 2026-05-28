"use client";

import { useEffect, useRef, useTransition } from "react";
import { Printer, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getDocumentPrintHtml } from "@/services/documents";
import type { DocumentType } from "@/types/document";

type Dict = {
  previewTitle: string;
  viewFull: string;
  loading: string;
};

type Props = {
  documentId: string;
  documentType?: DocumentType;
  dict: Dict;
  onClose: () => void;
};

// A4 types open as a full drawer; all others use the inline panel card.
const A4_TYPES: DocumentType[] = ["INVOICE", "TAX_INVOICE", "BILL", "QUOTATION", "CREDIT_NOTE"];

function isA4(type?: DocumentType) {
  return type ? A4_TYPES.includes(type) : true; // default to drawer if unknown
}

export function DocumentPreviewPanel({ documentId, documentType, dict, onClose }: Props) {
  const [isOpening, startOpenTransition] = useTransition();
  const drawer = isA4(documentType);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: html, isLoading } = useQuery({
    queryKey: ["document-print", documentId],
    queryFn: () => getDocumentPrintHtml(documentId),
    enabled: !!documentId,
    staleTime: 30_000,
  });

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawer) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawer, onClose]);

  function handlePrint() {
    startOpenTransition(async () => {
      const freshHtml = await getDocumentPrintHtml(documentId);
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
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ดึงจาก API
              </span>
            </div>
            <div className="flex items-center gap-1">
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
