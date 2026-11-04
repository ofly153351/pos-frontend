"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { withPreviewBridge } from "@/lib/preview-bridge";

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

function buildPreviewPageDocument(styles: string, page: string, zoom = 1) {
  return `<!doctype html><html><head><meta charset="utf-8">${styles}<style>
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0;width:794px;height:1123px;overflow:auto;background:#e2e8f0;scrollbar-width:none;-ms-overflow-style:none}
    html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
    .pagedjs_page,.pagedjs_sheet,.pagedjs_pagebox{width:794px!important;height:1123px!important;min-height:1123px!important;margin:0!important}
    .pagedjs_margin,.pagedjs_bleed,.pagedjs_marks{display:none!important}
    .pagedjs_page{background:#fff;box-shadow:none!important;position:relative;overflow:visible}
    .pagedjs_bleed-top{background:#e2e8f0;border-top:2px dashed #94a3b8}
    html{zoom:${zoom}}
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

  // B29: the worker frame has no same-origin access; it posts its paginated
  // pages back through the preview bridge instead of the parent reading its DOM.
  const [pageWidth, setPageWidth] = useState(794);
  const containerRef = useRef<HTMLDivElement>(null);
  const bridgedHtml = useMemo(() => (html ? withPreviewBridge(html) : ""), [html]);

  useEffect(() => {
    if (!bridgedHtml) return;
    setPages([]);
    setPaginationError(false);
    const timeoutId = window.setTimeout(() => setPaginationError(true), 20000);
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; pages?: unknown; styles?: unknown };
      if (data?.type === "pos-paged" && Array.isArray(data.pages) && data.pages.length > 0) {
        window.clearTimeout(timeoutId);
        setStyles(typeof data.styles === "string" ? data.styles : "");
        setPages(data.pages.filter((p): p is string => typeof p === "string").map(stripScriptsFromPreviewPage));
      } else if (data?.type === "pos-paged-error" || data?.type === "pos-paged-unavailable" || data?.type === "pos-paged") {
        window.clearTimeout(timeoutId);
        console.error("Document preview pagination failed", data?.type);
        setPaginationError(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeoutId);
    };
  }, [bridgedHtml]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPageWidth(Math.min(794, el.clientWidth || 794)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pages.length]);

  return (
    <div className="relative flex min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden bg-slate-100 p-6 sm:p-8">
      {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-400">{loadingLabel}</div> : html ? (
        <>
          <iframe ref={iframeRef} srcDoc={bridgedHtml} title="document pagination worker"
            className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
            sandbox="allow-scripts" />
          {pages.length > 0 ? (
            <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
              {/* Inert pages: scripts stripped, no scripts and no same-origin. */}
              {pages.map((page, index) => <iframe key={`preview-page-${index + 1}`}
                title={`document preview page ${index + 1}`} srcDoc={buildPreviewPageDocument(styles, page, pageWidth / 794)}
                className="block aspect-[210/297] w-full max-w-[794px] shrink-0 overflow-y-auto border-0 bg-white shadow-md"
                sandbox="" />)}
            </div>
          ) : <div className="flex min-h-full items-center justify-center text-sm text-slate-400">{paginationError ? errorLabel : loadingLabel}</div>}
        </>
      ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">{errorLabel}</div>}
    </div>
  );
}
