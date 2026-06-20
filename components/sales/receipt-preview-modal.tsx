"use client";

import { useRef } from "react";
import { AlertTriangle, FileText, Loader2, Printer, RotateCcw, X } from "lucide-react";

type Dict = {
  receiptPreviewLoading: string;
  receiptPreviewError: string;
  receiptPreviewRetryButton: string;
  receiptPreviewTitle: string;
  printReceiptNowButton: string;
  closeReceiptButton: string;
};

// Explicit lifecycle so the modal can never stall on the loading state: a failed
// fetch lands on "error" (not a permanent spinner), and Print/Tax-invoice stay
// disabled until the receipt HTML is actually ready ("success").
export type ReceiptPreviewStatus = "loading" | "success" | "error";

type Props = {
  isOpen: boolean;
  status: ReceiptPreviewStatus;
  html: string;
  onClose: () => void;
  onPrint: (frameWindow: Window) => void;
  onRetry: () => void;
  dictionary: Dict;
  onCreateTaxInvoice?: () => void;
  isTaxInvoicePending?: boolean;
};

export function ReceiptPreviewModal({
  isOpen,
  status,
  html,
  onClose,
  onPrint,
  onRetry,
  dictionary,
  onCreateTaxInvoice,
  isTaxInvoicePending,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  if (!isOpen) {
    return null;
  }

  const isReady = status === "success" && Boolean(html);
  const isError = status === "error";

  function handlePrint() {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }
    onPrint(frameWindow);
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/45 px-4 py-5 backdrop-blur-[2px] transition-opacity duration-300">
      <div className="relative flex max-h-[94dvh] w-fit max-w-[calc(100vw-2rem)] flex-col rounded-[1.75rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-6">
        <button
          aria-label={dictionary.closeReceiptButton}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-400 shadow-sm transition hover:bg-violet-100 hover:text-violet-600"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 w-[384px] max-w-[calc(100vw-4rem)] flex-1 rounded-lg bg-violet-50/60 p-0 shadow-inner sm:max-w-[calc(100vw-5rem)]">
          {isReady ? (
            <div className="rounded-md bg-white shadow-[0_12px_34px_rgba(15,23,42,0.12)] ring-1 ring-violet-200/60">
              <iframe
                className="h-[70dvh] max-h-[35rem] min-h-[30rem] w-full border-0 bg-white"
                ref={frameRef}
                srcDoc={html}
                title={dictionary.receiptPreviewTitle}
              />
            </div>
          ) : isError ? (
            <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full flex-col items-center justify-center gap-4 rounded-md border border-dashed border-rose-200 bg-white px-6 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {dictionary.receiptPreviewError}
              </p>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)] transition hover:bg-violet-700"
                onClick={onRetry}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {dictionary.receiptPreviewRetryButton}
              </button>
            </div>
          ) : (
            <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 shadow-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {dictionary.receiptPreviewLoading}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {isError ? (
            <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)] transition hover:bg-violet-700"
                onClick={onRetry}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {dictionary.receiptPreviewRetryButton}
              </button>
              <button
                className="min-h-12 rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                onClick={onClose}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
                disabled={!isReady}
                onClick={handlePrint}
                type="button"
              >
                <Printer className="h-4 w-4" />
                {dictionary.printReceiptNowButton}
              </button>
              <button
                className="min-h-12 rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                onClick={onClose}
                type="button"
              >
                {dictionary.closeReceiptButton}
              </button>
            </div>
          )}

          {onCreateTaxInvoice && !isError && (
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isTaxInvoicePending || !isReady}
              onClick={onCreateTaxInvoice}
              type="button"
            >
              {isTaxInvoicePending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileText className="h-4 w-4" />}
              ออกใบกำกับภาษี
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
