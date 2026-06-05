"use client";

import { useRef } from "react";
import { Printer, X } from "lucide-react";

type Dict = {
  receiptPreviewLoading: string;
  receiptPreviewTitle: string;
  printReceiptNowButton: string;
  closeReceiptButton: string;
};

type Props = {
  isOpen: boolean;
  html: string;
  isLoading: boolean;
  onClose: () => void;
  onPrint: (frameWindow: Window) => void;
  dictionary: Dict;
};

export function ReceiptPreviewModal({ isOpen, html, isLoading, onClose, onPrint, dictionary }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  if (!isOpen) {
    return null;
  }

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
          {isLoading ? (
            <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 shadow-sm">
              <span className="rounded-full bg-violet-100 px-4 py-2">
                {dictionary.receiptPreviewLoading}
              </span>
            </div>
          ) : html ? (
            <div className="rounded-md bg-white shadow-[0_12px_34px_rgba(15,23,42,0.12)] ring-1 ring-violet-200/60">
              <iframe
                className="h-[70dvh] max-h-[35rem] min-h-[30rem] w-full border-0 bg-white"
                ref={frameRef}
                srcDoc={html}
                title={dictionary.receiptPreviewTitle}
              />
            </div>
          ) : (
            <div className="flex h-[70dvh] max-h-[35rem] min-h-[30rem] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 shadow-sm">
              <span className="rounded-full bg-violet-100 px-4 py-2">
                {dictionary.receiptPreviewLoading}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] gap-3">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
            disabled={isLoading || !html}
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
      </div>
    </div>
  );
}
