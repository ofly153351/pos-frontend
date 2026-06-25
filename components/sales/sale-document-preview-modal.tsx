"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Copy, Loader2, Printer, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { getSaleDocumentHtml, getSaleReceiptHtml } from "@/services/sales";

import {
  DOCUMENT_ACTIONS,
  type DocumentActionKind,
  type SaleDocumentTemplate,
} from "./sale-document-templates";
import type { SalesHistoryDict } from "./sales-history-dict";

const COPY_VARIANTS = ["original", "copy-1", "copy-2"] as const;

function injectCopyBanner(html: string, label: string): string {
  const banner = `<div style="text-align:right;padding:4px 16px 2px;font-size:11px;font-weight:600;color:#555;letter-spacing:0.5px;border-bottom:1px dashed #ccc;margin-bottom:6px;">${label}</div>`;
  const match = html.match(/(<body[^>]*>)/i);
  if (match) return html.replace(match[1], match[1] + banner);
  return banner + html;
}

function buildAllCopiesHtml(html: string, labels: string[]): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headContent = headMatch?.[1] ?? "";
  const bodyContent = bodyMatch?.[1] ?? html;

  const pages = labels
    .map(
      (label, i) =>
        `<div${i < labels.length - 1 ? ' style="page-break-after:always;"' : ""}>` +
        `<div style="text-align:right;padding:4px 16px 2px;font-size:11px;font-weight:600;color:#555;letter-spacing:0.5px;border-bottom:1px dashed #ccc;margin-bottom:6px;">${label}</div>` +
        bodyContent +
        `</div>`,
    )
    .join("\n");

  return `<!DOCTYPE html><html><head>${headContent}</head><body>${pages}</body></html>`;
}

export function SaleDocumentPreviewModal({
  saleId,
  saleNumber,
  template,
  dict,
  onClose,
}: {
  saleId: string;
  saleNumber: string;
  template: SaleDocumentTemplate;
  dict: SalesHistoryDict;
  onClose: () => void;
}) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "th";
  const source = template.source;
  const isReceipt = source.mode === "receipt-html";

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const printAllRef = useRef<HTMLIFrameElement>(null);
  const printDropRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [activeCopy, setActiveCopy] = useState(0);
  const [printDropOpen, setPrintDropOpen] = useState(false);

  const { data: html, isLoading, isError } = useQuery({
    queryKey: ["sale-doc-html", saleId, template.kind],
    queryFn: () =>
      source.mode === "sale-doc"
        ? getSaleDocumentHtml(saleId, source.docType)
        : getSaleReceiptHtml(saleId),
    enabled: source.mode !== "future",
    staleTime: 60_000,
  });

  const copyLabels = useMemo(
    () => [dict.copyOriginal, `${dict.copyCopy} 1`, `${dict.copyCopy} 2`],
    [dict.copyOriginal, dict.copyCopy],
  );

  const previewHtml = useMemo(() => {
    if (!html) return null;
    if (isReceipt) return html;
    return injectCopyBanner(html, copyLabels[activeCopy]);
  }, [html, activeCopy, copyLabels, isReceipt]);

  function handleClose() {
    setIsClosing(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsClosing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (printDropRef.current && !printDropRef.current.contains(e.target as Node)) {
        setPrintDropOpen(false);
      }
    }
    if (printDropOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [printDropOpen]);

  function printDocument() {
    const w = iframeRef.current?.contentWindow;
    if (w) {
      w.focus();
      w.print();
    }
  }

  function printAllCopies() {
    if (!html || isReceipt) {
      printDocument();
      return;
    }
    const allHtml = buildAllCopiesHtml(html, copyLabels);
    const iframe = printAllRef.current;
    if (!iframe) return;
    iframe.srcdoc = allHtml;
    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (w) {
        w.focus();
        w.print();
      }
    };
  }

  function printCopyDirect(idx: number | "all") {
    setPrintDropOpen(false);
    if (!html || isReceipt) {
      printDocument();
      return;
    }
    if (idx === "all") {
      printAllCopies();
      return;
    }
    if (idx === activeCopy) {
      printDocument();
      return;
    }
    const iframe = printAllRef.current;
    if (!iframe) return;
    iframe.srcdoc = injectCopyBanner(html, copyLabels[idx]);
    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (w) { w.focus(); w.print(); }
    };
  }

  async function shareDocument() {
    const url = `${window.location.origin}/${locale}/print/invoice/${saleId}`;
    const title = `${dict[template.labelKey as keyof SalesHistoryDict]} ${saleNumber}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(dict.shareCopied);
    } catch {
      toast.error(dict.comingSoon);
    }
  }

  function runAction(kind: DocumentActionKind) {
    switch (kind) {
      case "print":
        printDocument();
        break;
      case "pdf":
        printDocument();
        toast.success(dict.pdfHint);
        break;
      case "share":
        void shareDocument();
        break;
      case "email":
      case "line":
        toast.success(dict.comingSoon);
        break;
    }
  }

  const docLabel = dict[template.labelKey as keyof SalesHistoryDict];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm smooth-fade sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}
    >
      <div
        className={`flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          isClosing ? "fade-out" : "smooth-fade-up"
        }`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={() => {
          if (isClosing) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <template.icon className="h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-slate-900">{docLabel}</h2>
              <p className="truncate text-xs text-slate-400">{saleNumber}</p>
            </div>
          </div>

          {/* Copy selector — documents only (receipts don't use copies) */}
          {!isReceipt && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {COPY_VARIANTS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveCopy(idx)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    activeCopy === idx
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {copyLabels[idx]}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={dict.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview body */}
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              {dict.loading}
            </div>
          ) : isError || !previewHtml ? (
            <div className="p-6">
              <Alert tone="error">{dict.receiptLoadError}</Alert>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              title={docLabel}
              className={`h-full w-full bg-white ${isReceipt ? "mx-auto max-w-md" : ""}`}
              sandbox="allow-same-origin allow-scripts allow-modals"
            />
          )}
        </div>

        {/* Action bar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          {/* Print — split button with copy dropdown for documents; plain button for receipts */}
          {isReceipt ? (
            <button
              type="button"
              onClick={printDocument}
              className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
            >
              <Printer className="h-4 w-4" />
              {dict.actPrint}
            </button>
          ) : (
            <div className="relative" ref={printDropRef}>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => printCopyDirect(activeCopy)}
                  className="flex items-center gap-2 rounded-l-lg border-y border-l border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  <Printer className="h-4 w-4" />
                  {copyLabels[activeCopy]}
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDropOpen((o) => !o)}
                  className="flex items-center rounded-r-lg border border-violet-200 bg-violet-50 px-2 py-2 text-violet-700 transition hover:bg-violet-100"
                  aria-label="print options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {printDropOpen && (
                <div className="absolute bottom-full left-0 z-10 mb-1 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {copyLabels.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => printCopyDirect(idx)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${idx === activeCopy ? "font-medium text-violet-700" : "text-slate-700"}`}
                    >
                      <Printer className="h-3.5 w-3.5 opacity-50" />
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => printCopyDirect("all")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5 opacity-50" />
                    {dict.copyPrintAll}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Other actions (PDF, Share, Email, Line) */}
          {DOCUMENT_ACTIONS.filter((a) => a.kind !== "print").map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.kind}
                type="button"
                onClick={() => runAction(action.kind)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  action.future
                    ? "border-slate-200 text-slate-400 hover:bg-slate-50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {dict[action.labelKey as keyof SalesHistoryDict]}
                {action.future && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden iframe for printing all 3 copies at once */}
      <iframe
        ref={printAllRef}
        title="print-all"
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
        sandbox="allow-same-origin allow-scripts allow-modals"
      />
    </div>
  );
}
