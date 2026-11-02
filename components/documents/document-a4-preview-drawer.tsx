"use client";

import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

// Shared A4 drawer frame for real documents and read-only template samples.
export function DocumentA4PreviewDrawer({ children, onClose, title }: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])') ?? [])
      .filter((element) => element.offsetParent !== null);
    const focusTimer = window.setTimeout(() => (focusables()[0] ?? panel)?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); panel?.focus(); return; }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault(); items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault(); items[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[50] bg-black/20 smooth-fade" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-y-0 right-0 z-[51] flex w-[960px] max-w-[96vw] flex-col bg-white shadow-2xl slide-in-right">
        {children}
      </div>
    </>
  );
}

function stripScriptsFromPreviewPage(page: string) {
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

// Run the existing print HTML through Paged.js once, then show inert A4 pages.
export function DocumentA4PreviewPages({ html, loading, loadingLabel, errorLabel }: {
  html?: string;
  loading: boolean;
  loadingLabel: string;
  errorLabel: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [styles, setStyles] = useState("");
  const [paginationError, setPaginationError] = useState(false);

  const handlePreviewLoad = async () => {
    const frame = iframeRef.current;
    const frameWindow = frame?.contentWindow as (Window & { __posPagedReady?: Promise<unknown> }) | null;
    if (!frame || !frameWindow) return;
    try {
      if (!frameWindow.__posPagedReady) throw new Error("Document pagination is unavailable");
      let timeoutId: number | undefined;
      try {
        await Promise.race([
          frameWindow.__posPagedReady,
          new Promise((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error("Document pagination timed out")), 20000); }),
        ]);
      } finally {
        window.clearTimeout(timeoutId);
      }
      const frameDocument = frame.contentDocument;
      const renderedPages = Array.from(frameDocument?.querySelectorAll<HTMLElement>(".pagedjs_page") ?? []);
      if (!frameDocument || !renderedPages.length) throw new Error("Document pagination returned no pages");
      setStyles(Array.from(frameDocument.head.querySelectorAll("style, link[rel='stylesheet']"))
        .map((node) => node.outerHTML).join("\n"));
      setPages(renderedPages.map((page) => stripScriptsFromPreviewPage(page.outerHTML)));
    } catch (error) {
      console.error("Document preview pagination failed", error);
      setPaginationError(true);
    }
  };

  const handlePreviewPageLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget;
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;
    frameDocument.documentElement.style.zoom = String(Math.min(1, frame.clientWidth / 794));
  };

  return (
    <div className="relative flex min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden bg-slate-100 p-6 sm:p-8">
      {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-400">{loadingLabel}</div> : html ? (
        <>
          <iframe ref={iframeRef} srcDoc={html} title="document pagination worker"
            onLoad={handlePreviewLoad} className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
            sandbox="allow-same-origin allow-scripts" />
          {pages.length > 0 ? (
            <div className="flex w-full flex-col items-center gap-4">
              {pages.map((page, index) => <iframe key={`preview-page-${index + 1}`}
                title={`document preview page ${index + 1}`} srcDoc={buildPreviewPageDocument(styles, page)}
                onLoad={handlePreviewPageLoad}
                className="block aspect-[210/297] w-full max-w-[794px] shrink-0 overflow-y-auto border-0 bg-white shadow-md"
                sandbox="allow-same-origin" />)}
            </div>
          ) : <div className="flex min-h-full items-center justify-center text-sm text-slate-400">{paginationError ? errorLabel : loadingLabel}</div>}
        </>
      ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">{errorLabel}</div>}
    </div>
  );
}
