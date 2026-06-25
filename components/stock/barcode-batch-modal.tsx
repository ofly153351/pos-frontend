"use client";

import { useEffect, useMemo, useState } from "react";
import { Barcode, FileText, Loader2, Printer, X } from "lucide-react";
import {
  DEFAULT_LABEL_FLAGS,
  generateBarcodeSvgByType,
  type LabelContentFlags,
  type PrinterMode,
  type PrintTemplate,
} from "@/lib/barcode";
import {
  A4_LAYOUTS,
  LABEL_CSS,
  MM_TO_PX,
  TEMPLATE_DIMS_MM,
  buildLabelHtml,
  pageCount,
  printBarcodeBatch,
  type A4LayoutId,
  type BatchProduct,
  type LabelData,
} from "@/lib/label";
import { exportSheetPdf } from "@/lib/label-raster";
import type { Product } from "@/types/product";
import type { BarcodeModalLabels } from "@/components/stock/barcode-modal";

type BarcodeBatchModalProps = {
  products: Product[] | null;
  labels: BarcodeModalLabels;
  storeName?: string | null;
  onClose: () => void;
};

const TEMPLATES: Array<{ key: PrintTemplate; labelKey: keyof BarcodeModalLabels }> = [
  { key: "small",  labelKey: "templateSmall"  },
  { key: "medium", labelKey: "templateMedium" },
  { key: "large",  labelKey: "templateLarge"  },
  { key: "shelf",  labelKey: "templateShelf"  },
];

const PRINTER_MODES: Array<{ value: PrinterMode; labelKey: keyof BarcodeModalLabels }> = [
  { value: "label", labelKey: "printerLabel"  },
  { value: "a4",    labelKey: "printerA4"     },
  { value: "58mm",  labelKey: "printer58mm"   },
  { value: "80mm",  labelKey: "printer80mm"   },
];

const QUICK_QTY = [1, 2, 5, 10];

const CONTENT_FLAG_KEYS: Array<{ flag: keyof LabelContentFlags; labelKey: keyof BarcodeModalLabels }> = [
  { flag: "showName",          labelKey: "showName"          },
  { flag: "showSku",           labelKey: "showSku"           },
  { flag: "showPrice",         labelKey: "showPrice"         },
  { flag: "showBarcodeNumber", labelKey: "showBarcodeNumber" },
  { flag: "showCategory",      labelKey: "showCategory"      },
  { flag: "showStoreName",     labelKey: "showStoreName"     },
];

function toBatchProduct(p: Product): BatchProduct {
  return {
    name: p.name,
    sku: p.sku ?? null,
    barcode: p.barcode ?? null,
    price: p.base_price,
    location: p.storage_location ?? null,
    category: p.product_type_name ?? p.product_type?.name ?? null,
    brand: p.brand_name ?? null,
  };
}

export function BarcodeBatchModal({ products, labels, storeName, onClose }: BarcodeBatchModalProps) {
  const [template, setTemplate]       = useState<PrintTemplate>("medium");
  const [printerMode, setPrinterMode] = useState<PrinterMode>("label");
  const [a4Layout, setA4Layout]       = useState<A4LayoutId>("4x10");
  const [qtyPer, setQtyPer]           = useState(1);
  const [flags, setFlags]             = useState<LabelContentFlags>(DEFAULT_LABEL_FLAGS);
  const [isExporting, setIsExporting] = useState(false);

  const list = useMemo(() => (products ?? []).filter((p) => (p.barcode ?? p.sku ?? "").trim()), [products]);

  useEffect(() => {
    setTemplate("medium"); setPrinterMode("label"); setA4Layout("4x10");
    setQtyPer(1); setFlags(DEFAULT_LABEL_FLAGS); setIsExporting(false);
  }, [products]);

  useEffect(() => {
    if (!products) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [products, onClose]);

  if (!products || list.length === 0) return null;

  const dims = TEMPLATE_DIMS_MM[template];
  const totalLabels = list.length * qtyPer;
  const pages = pageCount(printerMode, a4Layout, totalLabels);

  // Preview = first product's label
  const first = list[0];
  const previewSvg = generateBarcodeSvgByType((first.barcode ?? first.sku ?? "").trim(), "code128", false);
  const previewData: LabelData = {
    name: first.name,
    sku: first.sku ?? null,
    barcode: first.barcode ?? null,
    price: first.base_price,
    location: first.storage_location ?? null,
    category: first.product_type_name ?? first.product_type?.name ?? null,
    brand: first.brand_name ?? null,
    storeName: storeName ?? null,
    barcodeSvg: previewSvg,
  };
  const previewHtml = buildLabelHtml(previewData, flags);
  const labelPxW = dims.w * MM_TO_PX;
  const labelPxH = dims.h * MM_TO_PX;
  const scale = Math.min(360 / labelPxW, 220 / labelPxH, 3.5);

  function buildAllLabels(): string[] {
    const out: string[] = [];
    for (const p of list) {
      const code = (p.barcode ?? p.sku ?? "").trim();
      const svg = generateBarcodeSvgByType(code, "code128", false);
      const html = buildLabelHtml(
        {
          name: p.name, sku: p.sku ?? null, barcode: p.barcode ?? null, price: p.base_price,
          location: p.storage_location ?? null,
          category: p.product_type_name ?? p.product_type?.name ?? null,
          brand: p.brand_name ?? null, storeName: storeName ?? null, barcodeSvg: svg,
        },
        flags,
      );
      for (let i = 0; i < qtyPer; i++) out.push(html);
    }
    return out;
  }

  function handlePrintAll() {
    printBarcodeBatch(list.map(toBatchProduct), template, flags, printerMode, a4Layout, qtyPer);
  }

  async function handleExportPdf() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const ok = await exportSheetPdf(buildAllLabels(), printerMode, template, a4Layout, `barcodes-${list.length}.pdf`);
      if (!ok) handlePrintAll();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.batchTitle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style dangerouslySetInnerHTML={{ __html: LABEL_CSS }} />
      <div className="relative my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-violet-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">{labels.batchTitle}</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {labels.batchProducts.replace("{n}", String(list.length))}
            </span>
          </div>
          <button
            aria-label={labels.closeLabel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-violet-100">

          {/* LEFT — settings */}
          <div className="flex flex-col gap-5 overflow-y-auto p-6 lg:w-[320px] lg:max-h-[72vh] shrink-0">
            {/* Template */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.templateLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(({ key, labelKey }) => {
                  const d = TEMPLATE_DIMS_MM[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTemplate(key)}
                      className={`inline-flex flex-col items-center rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        template === key ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                      }`}
                    >
                      <span>{labels[labelKey] as string}</span>
                      <span className={`mt-0.5 text-[10px] ${template === key ? "text-violet-100" : "text-slate-400"}`}>{d.w}×{d.h} mm</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content flags */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.contentOptionsLabel}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {CONTENT_FLAG_KEYS.map(({ flag, labelKey }) => (
                  <label key={flag} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={flags[flag]}
                      onChange={() => setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))}
                      className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                    />
                    {labels[labelKey] as string}
                  </label>
                ))}
              </div>
            </div>

            {/* Qty per product */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.batchQtyPerProduct}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={99} value={qtyPer}
                  onChange={(e) => setQtyPer(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QTY.map((q) => (
                    <button key={q} type="button" onClick={() => setQtyPer(q)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${qtyPer === q ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"}`}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Printer mode */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.printerModeLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRINTER_MODES.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => setPrinterMode(value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${printerMode === value ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"}`}>
                    {labels[labelKey] as string}
                  </button>
                ))}
              </div>
              {printerMode === "a4" ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.a4LayoutLabel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(A4_LAYOUTS) as A4LayoutId[]).map((id) => (
                      <button key={id} type="button" onClick={() => setA4Layout(id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${a4Layout === id ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"}`}>
                        {A4_LAYOUTS[id].label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT — preview + actions */}
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 lg:max-h-[72vh]">
              {/* Info summary */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-violet-100 bg-violet-50/30 px-4 py-3 sm:grid-cols-3">
                {[
                  { label: labels.infoTemplate, value: labels[TEMPLATES.find((t) => t.key === template)!.labelKey] as string },
                  { label: labels.infoSize, value: `${dims.w} × ${dims.h} mm` },
                  { label: labels.infoMode, value: labels[PRINTER_MODES.find((m) => m.value === printerMode)!.labelKey] as string },
                  { label: labels.batchTitle, value: labels.batchProducts.replace("{n}", String(list.length)) },
                  { label: labels.infoQuantity, value: labels.batchTotalLabels.replace("{n}", String(totalLabels)) },
                  { label: labels.infoPages, value: printerMode === "a4" ? `${pages} ${labels.pagesUnit}` : `${totalLabels} ${labels.labelsUnit}` },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Preview (first product) */}
              <div className="flex flex-col items-center gap-2">
                <p className="self-start text-xs font-bold uppercase tracking-wide text-slate-400">{labels.previewLabel} · {first.name}</p>
                <div className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-slate-50/60 p-6">
                  <div className="shadow-lg shrink-0" style={{ width: labelPxW * scale, height: labelPxH * scale }}>
                    <div
                      style={{ width: labelPxW, height: labelPxH, transform: `scale(${scale})`, transformOrigin: "top left" }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-violet-100 bg-white px-6 py-4">
              <button type="button" disabled={isExporting} onClick={handleExportPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isExporting ? labels.exporting : labels.downloadPdf}
              </button>
              <button type="button" onClick={handlePrintAll}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
                <Printer className="h-4 w-4" />
                {labels.batchPrintAll} ({totalLabels})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
