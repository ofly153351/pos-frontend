"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, X } from "lucide-react";

import { getCreditSaleBillUrl } from "@/services/credit-sales";

// Labels come from the `creditStatement` i18n section (structural subset).
type BillModalDict = {
  title: string;
  print: string;
  close: string;
  loading: string;
  notFound: string;
};

type Props = {
  creditSaleId: string;
  open: boolean;
  onClose: () => void;
  dict: BillModalDict;
};

// Fetches the billing-notice HTML (rendered by the shared document template on the
// backend). The auth cookie rides along on the same-origin request.
async function fetchBillHtml(creditSaleId: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(getCreditSaleBillUrl(creditSaleId), {
    signal,
    headers: { Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  return res.text();
}

// Shows the billing notice (ใบวางบิล) in an iframe for in-place preview + print —
// no new tab, no client-side A4 layout. Data flows through TanStack Query (no manual
// effect/setState), refetching fresh each time the modal opens.
export function CreditStatementModal({ creditSaleId, open, onClose, dict }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: html, isLoading, isError } = useQuery({
    queryKey: ["credit-bill", creditSaleId],
    queryFn: ({ signal }) => fetchBillHtml(creditSaleId, signal),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePrint = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={dict.title}
    >
      <div className="flex h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">{dict.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || isError || !html}
              className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
            >
              <Printer className="h-4 w-4" />
              {dict.print}
            </button>
            <button
              onClick={onClose}
              aria-label={dict.close}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="relative flex-1 overflow-auto bg-slate-100">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              {dict.loading}
            </div>
          ) : null}
          {isError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-rose-600">
              {dict.notFound}
            </div>
          ) : null}
          {!isLoading && !isError && html ? (
            <iframe
              ref={iframeRef}
              title={dict.title}
              srcDoc={html}
              className="h-full w-full border-0 bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
