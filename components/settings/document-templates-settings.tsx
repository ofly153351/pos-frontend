"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Loader2, RotateCcw, Save } from "lucide-react";
import { DrawerShell } from "@/components/warehouse/inventory/drawer-shell";
import { toast } from "@/components/ui/toast";
import { getCurrentStoreId } from "@/lib/store-storage";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import { getDocuments, getDocumentTemplatePreviewHtml } from "@/services/documents";
import { getReceiptSettings, updateReceiptSettings } from "@/services/receipt-settings";
import type { ReceiptSettingsData } from "@/types/receipt-settings";
import th from "@/locales/th.json";

type T = typeof th.documentTemplates;
type Draft = Pick<ReceiptSettingsData, "document_template_key">;
const DEFAULT_DRAFT: Draft = { document_template_key: "standard" };
const card = "rounded-2xl border border-violet-100 bg-white p-5 shadow-sm";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PREVIEW_SCREEN_STYLES = `<style>@media screen{html,body{width:210mm!important;min-height:297mm!important;overflow:hidden!important}body{margin:0!important;background:#e2e8f0!important}.page{width:210mm!important;min-height:297mm!important;margin:0!important;padding:12mm 12mm 16mm!important;box-sizing:border-box!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.16)}.page[data-show-signature="true"]{padding-bottom:47mm!important}.page[data-show-signature="true"] .signature-source{display:flex!important;position:absolute;left:12mm;right:12mm;bottom:16mm;z-index:1;margin:0!important}.pagedjs_pages{width:210mm!important;align-items:center!important}.pagedjs_page{flex:0 0 auto!important}}</style>`;

const REFERENCE_PREVIEW_SCREEN_STYLES = `<style>@media screen{html,body{width:210mm!important;min-height:297mm!important;overflow:hidden!important}body{margin:0!important;background:#e2e8f0!important}.page.template-classic{width:210mm!important;min-height:297mm!important;margin:0!important;padding:21.5mm 25mm 26mm 23.5mm!important;box-sizing:border-box!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.16)}}</style>`;
const TEMPLATE3_PREVIEW_SCREEN_STYLES = `<style>@media screen{html,body{width:210mm!important;min-height:297mm!important;overflow:hidden!important}body{margin:0!important;background:#e2e8f0!important}.page.template-template3{width:210mm!important;min-height:297mm!important;margin:0!important;padding:16mm 17mm 18mm!important;box-sizing:border-box!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.16)}.page.template-template3[data-show-signature="true"]{padding-bottom:36mm!important}.page.template-template3[data-show-signature="true"] .signature-source{display:flex!important;position:absolute;left:17mm;right:17mm;bottom:11mm;margin:0!important}}</style>`;

function A4DocumentPreview({ html, title }: { html: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / A4_WIDTH_PX) : 0.45;
  const previewStyles = html.includes('class="page template-template3"') ? TEMPLATE3_PREVIEW_SCREEN_STYLES : html.includes('class="page template-classic"') ? REFERENCE_PREVIEW_SCREEN_STYLES : PREVIEW_SCREEN_STYLES;
  const previewHTML = html.replace("</head>", `${previewStyles}</head>`);
  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl bg-slate-100" style={{ height: A4_HEIGHT_PX * scale }}>
      <iframe
        title={title}
        srcDoc={previewHTML}
        sandbox="allow-same-origin"
        className="absolute top-0 border-0 bg-white"
        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, left: (containerWidth - A4_WIDTH_PX * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}
        tabIndex={-1}
      />
    </div>
  );
}

export function DocumentTemplatesSettings({ t }: { t: T }) {
  const queryClient = useQueryClient();
  const { role } = useStoreRole();
  const canManage = canManageStore(role);
  const [storeId] = useState(() => typeof window === "undefined" ? "" : (getCurrentStoreId() ?? ""));
  const [draftOverride, setDraftOverride] = useState<Draft | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const query = useQuery({
    queryKey: ["receipt-settings", storeId],
    queryFn: async () => (await getReceiptSettings()).data,
    enabled: !!storeId,
  });
  const initial = useMemo<Draft>(() => ({
    document_template_key: query.data?.document_template_key ?? "standard",
  }), [query.data]);
  const draft = draftOverride ?? initial;
  const dirty = draft.document_template_key !== initial.document_template_key;
  const saveMutation = useMutation({
    mutationFn: (value: Draft) => updateReceiptSettings({ document_template_key: value.document_template_key }),
    onSuccess: (result) => {
      queryClient.setQueryData(["receipt-settings", storeId], result.data);
      setDraftOverride(null);
      toast.success(t.saveSuccess);
    },
    onError: () => toast.error(t.saveError),
  });

  const cancel = () => setDraftOverride(null);
  const reset = () => {
    if (!window.confirm(t.confirmReset)) return;
    setDraftOverride(DEFAULT_DRAFT);
  };
  const sourceQuery = useQuery({
    queryKey: ["document-template-source", storeId],
    queryFn: async () => {
      const quotations = await getDocuments({ page: 1, limit: 1, type: "QUOTATION" });
      if (quotations.items.length) return quotations.items[0];
      const documents = await getDocuments({ page: 1, limit: 1 });
      return documents.items[0] ?? null;
    },
    enabled: !!storeId,
  });
  const sourceId = sourceQuery.data?.id;
  const previewsQuery = useQuery({
    queryKey: ["document-template-previews", storeId, sourceId, query.data?.document_design],
    queryFn: async () => {
      if (!sourceId) throw new Error("No document selected for preview");
      const [standard, classic, template3] = await Promise.all([
        getDocumentTemplatePreviewHtml(sourceId, "standard"),
        getDocumentTemplatePreviewHtml(sourceId, "classic"),
        getDocumentTemplatePreviewHtml(sourceId, "template3"),
      ]);
      return { standard, classic, template3 };
    },
    enabled: !!storeId && !!sourceId,
  });
  const currentPreviewHTML = previewsQuery.data?.[draft.document_template_key] ?? "";

  if (query.isLoading || !storeId) return <div className="rounded-xl border border-violet-100 bg-white p-6 text-sm text-slate-500">{t.loading}</div>;
  if (query.isError) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t.saveError}</div>;

  return (
    <div className="space-y-5">
      <header className={card}>
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-xl font-bold text-slate-900">{t.title}</h1><p className="mt-1 text-sm text-slate-500">{t.subtitle}</p></div>
          {canManage && <div className="flex shrink-0 gap-2">
            <button type="button" onClick={cancel} disabled={!dirty || saveMutation.isPending} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{t.cancel}</button>
            <button type="button" onClick={reset} disabled={!canManage || saveMutation.isPending} className="flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50"><RotateCcw className="h-4 w-4"/>{t.reset}</button>
            <button type="button" onClick={() => saveMutation.mutate(draft)} disabled={!dirty || saveMutation.isPending} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{t.save}</button>
          </div>}
        </div>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className={card}>
            <h2 className="mb-4 font-semibold text-slate-800">{t.choose}</h2>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {(["standard", "classic", "template3"] as const).map((key) => <button key={key} type="button" disabled={!canManage} onClick={() => setDraftOverride((current) => ({ ...(current ?? initial), document_template_key: key }))} className={`rounded-xl border-2 p-4 text-left transition ${draft.document_template_key === key ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-violet-300"}`}>
                <div className="mb-3 aspect-[210/297] overflow-hidden rounded-md border bg-white" aria-hidden="true">
                  {previewsQuery.data?.[key] ? (
                    <A4DocumentPreview html={previewsQuery.data[key]} title={t[key]} />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
                      {sourceQuery.isLoading || previewsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : sourceQuery.data === null ? t.noDocuments : t.previewError}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between"><span className="font-semibold text-slate-800">{t[key]}</span>{draft.document_template_key === key && <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700"><Check className="h-3 w-3"/>{t.active}</span>}</div>
              </button>)}
            </div>
            {sourceQuery.data && <p className="mt-3 text-xs text-slate-600">{t.sourceDocument}: {sourceQuery.data.document_no_full}</p>}
            {sourceQuery.data === null && <p role="status" className="mt-3 text-sm text-slate-600">{t.noDocuments}</p>}
          </section>
        </div>
        <aside className={card}>
          <h2 className="font-semibold text-slate-800">{t.preview}</h2>
          <p className="mt-2 text-sm text-slate-500">{t.previewNote}</p>
          <button type="button" onClick={() => setPreviewOpen(true)} disabled={!currentPreviewHTML || previewsQuery.isLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
            {previewsQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4"/>}
            {t.openPreview}
          </button>
          {(sourceQuery.isError || previewsQuery.isError) && <p role="alert" className="mt-3 text-sm text-amber-700">{t.previewError}</p>}
        </aside>
      </div>
      <DrawerShell open={previewOpen} title={t.preview} subtitle={t.previewNote} closeLabel={t.closePreview} onClose={() => setPreviewOpen(false)} widthClass="sm:max-w-[960px]">
        {currentPreviewHTML ? <A4DocumentPreview html={currentPreviewHTML} title={t.preview} /> : previewsQuery.isLoading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600"/></div> : <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{sourceQuery.data === null ? t.noDocuments : t.previewError}</p>}
      </DrawerShell>
    </div>
  );
}
