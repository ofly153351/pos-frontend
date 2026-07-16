"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Printer, X } from "lucide-react";

import { getDocumentPrintHtml } from "@/services/documents";

type Dict = {
  loading: string;
  requestFailed: string;
  print: string;
  cancel: string;
  noDocuments: string;
};

type Props = {
  documentId: string;
  dict: Dict;
  copy?: number; // 0-based copy index; -1/undefined = whole set
};

export function DocumentPrintClient({ documentId, dict, copy = -1 }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    getDocumentPrintHtml(documentId, copy)
      .then((h) => setHtml(h))
      .catch(() => setError(dict.requestFailed))
      .finally(() => setLoading(false));
  }, [documentId, copy, dict.requestFailed]);

  function handlePrint() {
    const fw = frameRef.current?.contentWindow;
    if (fw) {
      fw.focus();
      fw.print();
    } else {
      window.print();
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 border-b border-violet-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <FileText className="h-4 w-4 text-violet-600" />
        </div>
        <span className="font-semibold text-slate-700">พิมพ์เอกสาร</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!html}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-40"
          >
            <Printer className="h-4 w-4" />
            {dict.print}
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            {dict.cancel}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-[calc(100vh-57px)] flex-col items-center bg-slate-100 py-8">
        {loading && (
          <div className="flex items-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            {dict.loading}
          </div>
        )}
        {error && (
          <div className="py-20 text-sm text-red-500">{error}</div>
        )}
        {html && (
          <iframe
            ref={frameRef}
            srcDoc={html}
            title="document-preview"
            className="h-[297mm] w-[210mm] border-0 bg-white shadow-xl"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
