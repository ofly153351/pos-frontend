"use client";

import { useEffect, useMemo, useState } from "react";
import { Barcode, Check, ClipboardCopy, Download, FileText, Loader2, Printer, X } from "lucide-react";
import {
  DEFAULT_LABEL_FLAGS,
  generateBarcodeSvgByType,
  validateBarcodeForType,
  type BarcodeType,
  type LabelContentFlags,
  type PrinterMode,
  type PrintTemplate,
} from "@/lib/barcode";
import {
  A4_LAYOUTS,
  A4_MM,
  LABEL_CSS,
  MM_TO_PX,
  TEMPLATE_DIMS_MM,
  a4PerPage,
  buildA4PageInner,
  buildLabelHtml,
  pageCount,
  printSheet,
  type A4LayoutId,
  type LabelData,
} from "@/lib/label";
import { exportLabelPng, exportSheetPdf } from "@/lib/label-raster";
import type { Product } from "@/types/product";

// ── Label types ───────────────────────────────────────────────────────────────

export type BarcodeModalLabels = {
  title: string;
  printLabel: string;
  downloadPng: string;
  downloadPdf: string;
  copyCode: string;
  copied: string;
  exporting: string;
  noBarcodeLabel: string;
  invalidBarcodeLabel: string;
  templateLabel: string;
  templateSmall: string;
  templateMedium: string;
  templateLarge: string;
  templateShelf: string;
  templateQr: string;
  barcodeTypeLabel: string;
  barcodeTypeCode128: string;
  barcodeTypeEan13: string;
  barcodeTypeEan8: string;
  barcodeTypeUpca: string;
  barcodeTypeQr: string;
  contentOptionsLabel: string;
  showName: string;
  showSku: string;
  showPrice: string;
  showBarcodeNumber: string;
  showCategory: string;
  showBrand: string;
  showLocation: string;
  showStoreName: string;
  showSalePrice: string;
  origPriceInput: string;
  salePriceInput: string;
  quantityLabel: string;
  printerModeLabel: string;
  printerLabel: string;
  printerA4: string;
  printer58mm: string;
  printer80mm: string;
  a4LayoutLabel: string;
  previewLabel: string;
  infoTemplate: string;
  infoSize: string;
  infoType: string;
  infoMode: string;
  infoQuantity: string;
  infoPages: string;
  pagesUnit: string;
  labelsUnit: string;
  pagesWillPrint: string;     // "{n} pages will be printed"
  sampleNote: string;         // "Showing {shown} of {total} labels"
  labelPrinterNote: string;
  closeLabel: string;
  // batch mode
  batchTitle: string;
  batchProducts: string;          // "{n} products"
  batchQtyPerProduct: string;
  batchPrintAll: string;
  batchTotalLabels: string;       // "{n} labels total"
};

type BarcodeModalProps = {
  product: Product | null;
  labels: BarcodeModalLabels;
  storeName?: string | null;
  onClose: () => void;
};

// ── Static config ─────────────────────────────────────────────────────────────

const BARCODE_TYPES: Array<{ value: BarcodeType; labelKey: keyof BarcodeModalLabels }> = [
  { value: "code128", labelKey: "barcodeTypeCode128" },
  { value: "ean13",   labelKey: "barcodeTypeEan13"   },
  { value: "ean8",    labelKey: "barcodeTypeEan8"    },
  { value: "upca",    labelKey: "barcodeTypeUpca"    },
  { value: "qr",      labelKey: "barcodeTypeQr"      },
];

const TEMPLATES: Array<{ key: PrintTemplate; labelKey: keyof BarcodeModalLabels }> = [
  { key: "small",  labelKey: "templateSmall"  },
  { key: "medium", labelKey: "templateMedium" },
  { key: "large",  labelKey: "templateLarge"  },
  { key: "shelf",  labelKey: "templateShelf"  },
  { key: "qr",     labelKey: "templateQr"     },
];

const PRINTER_MODES: Array<{ value: PrinterMode; labelKey: keyof BarcodeModalLabels }> = [
  { value: "label", labelKey: "printerLabel"  },
  { value: "a4",    labelKey: "printerA4"     },
  { value: "58mm",  labelKey: "printer58mm"   },
  { value: "80mm",  labelKey: "printer80mm"   },
];

const QUICK_QTY = [1, 5, 10, 20, 50, 100];

const CONTENT_FLAG_KEYS: Array<{ flag: keyof LabelContentFlags; labelKey: keyof BarcodeModalLabels }> = [
  { flag: "showName",          labelKey: "showName"          },
  { flag: "showSku",           labelKey: "showSku"           },
  { flag: "showPrice",         labelKey: "showPrice"         },
  { flag: "showSalePrice",     labelKey: "showSalePrice"     },
  { flag: "showBarcodeNumber", labelKey: "showBarcodeNumber" },
  { flag: "showCategory",      labelKey: "showCategory"      },
  { flag: "showBrand",         labelKey: "showBrand"         },
  { flag: "showLocation",      labelKey: "showLocation"      },
  { flag: "showStoreName",     labelKey: "showStoreName"     },
];

const GRID_PREVIEW_CAP = 24;  // max individual labels rendered in label/thermal grid
const A4_PREVIEW_PAGE_CAP = 2; // max A4 pages rendered in preview

// ── Scaled HTML helper ────────────────────────────────────────────────────────

function ScaledHtml({ html, widthPx, heightPx, scale }: { html: string; widthPx: number; heightPx: number; scale: number }) {
  return (
    <div style={{ width: widthPx * scale, height: heightPx * scale }} className="shrink-0">
      <div
        style={{ width: widthPx, height: heightPx, transform: `scale(${scale})`, transformOrigin: "top left" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BarcodeModal({ product, labels, storeName, onClose }: BarcodeModalProps) {
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("code128");
  const [template, setTemplate]       = useState<PrintTemplate>("medium");
  const [printerMode, setPrinterMode] = useState<PrinterMode>("label");
  const [a4Layout, setA4Layout]       = useState<A4LayoutId>("4x10");
  const [quantity, setQuantity]       = useState(1);
  const [flags, setFlags]             = useState<LabelContentFlags>(DEFAULT_LABEL_FLAGS);
  const [salePriceInput, setSalePriceInput] = useState("");
  const [origPriceInput, setOrigPriceInput] = useState("");
  const [copied, setCopied]           = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const barcodeCode = product ? (product.barcode ?? product.sku ?? "").trim() : "";
  const validationError = barcodeCode ? validateBarcodeForType(barcodeCode, barcodeType) : null;

  // Barcode graphic WITHOUT embedded number — the number is shown once below.
  const barcodeSvg = useMemo(() => {
    if (!barcodeCode || validationError) return "";
    return generateBarcodeSvgByType(barcodeCode, barcodeType, false);
  }, [barcodeCode, barcodeType, validationError]);

  const categoryName = product?.product_type_name ?? product?.product_type?.name ?? null;
  const brandName    = product?.brand_name ?? null;
  const location     = product?.storage_location?.trim() || null;

  const salePriceNum = salePriceInput.trim() ? parseFloat(salePriceInput) : null;
  const validSalePrice = salePriceNum !== null && !isNaN(salePriceNum) && salePriceNum >= 0;
  const origPriceNum = origPriceInput.trim() ? parseFloat(origPriceInput) : null;
  const validOrigPrice = origPriceNum !== null && !isNaN(origPriceNum) && origPriceNum >= 0;

  const labelData: LabelData | null = product
    ? {
        name: product.name,
        sku: product.sku ?? null,
        barcode: product.barcode ?? null,
        price: (flags.showSalePrice && validOrigPrice) ? origPriceNum : product.base_price,
        salePrice: (flags.showSalePrice && validSalePrice) ? salePriceNum : null,
        location,
        category: categoryName,
        brand: brandName,
        storeName: storeName ?? null,
        barcodeSvg,
      }
    : null;

  const labelHtml = useMemo(
    () => (labelData ? buildLabelHtml(labelData, flags) : ""),
    [labelData, flags],
  );

  const dims = TEMPLATE_DIMS_MM[template];
  const labelPxW = dims.w * MM_TO_PX;
  const labelPxH = dims.h * MM_TO_PX;
  const total = quantity;
  const pages = pageCount(printerMode, a4Layout, total);

  // Reset on product change
  useEffect(() => {
    setBarcodeType("code128");
    setTemplate("medium");
    setPrinterMode("label");
    setA4Layout("4x10");
    setQuantity(1);
    setFlags(DEFAULT_LABEL_FLAGS);
    setSalePriceInput("");
    setOrigPriceInput(product ? String(product.base_price ?? "") : "");
    setCopied(false);
    setIsExporting(false);
  }, [product?.id]);

  // Keyboard close
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [product, onClose]);

  if (!product || !labelData) return null;

  const hasGraphic = Boolean(barcodeSvg);

  function buildLabelList(): string[] {
    return Array.from({ length: total }, () => labelHtml);
  }

  function handlePrint() {
    if (!hasGraphic) return;
    printSheet({ labels: buildLabelList(), mode: printerMode, template, layout: a4Layout });
  }

  async function handlePng() {
    if (!hasGraphic || isExporting) return;
    setIsExporting(true);
    try {
      const ok = await exportLabelPng(labelHtml, template, `label-${barcodeCode || "barcode"}.png`);
      if (!ok) printSheet({ labels: [labelHtml], mode: printerMode, template, layout: a4Layout });
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePdf() {
    if (!hasGraphic || isExporting) return;
    setIsExporting(true);
    try {
      const ok = await exportSheetPdf(buildLabelList(), printerMode, template, a4Layout, `labels-${barcodeCode || "barcode"}.pdf`);
      if (!ok) printSheet({ labels: buildLabelList(), mode: printerMode, template, layout: a4Layout });
    } finally {
      setIsExporting(false);
    }
  }

  function handleCopy() {
    if (!barcodeCode) return;
    navigator.clipboard.writeText(barcodeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleFlag(key: keyof LabelContentFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Single large preview scale (fit ~480×300 area)
  const singleScale = hasGraphic ? Math.min(480 / labelPxW, 300 / labelPxH, 4) : 1;

  // ── Preview content ─────────────────────────────────────────────────────────

  const templateName = labels[TEMPLATES.find((t) => t.key === template)!.labelKey] as string;
  const typeName     = labels[BARCODE_TYPES.find((t) => t.value === barcodeType)!.labelKey] as string;
  const modeName     = labels[PRINTER_MODES.find((m) => m.value === printerMode)!.labelKey] as string;

  const infoRows: Array<{ label: string; value: string }> = [
    { label: labels.infoTemplate, value: templateName },
    { label: labels.infoSize,     value: `${dims.w} × ${dims.h} mm` },
    { label: labels.infoType,     value: typeName },
    { label: labels.infoMode,     value: modeName },
    { label: labels.infoQuantity, value: String(quantity) },
    {
      label: labels.infoPages,
      value: printerMode === "a4" ? `${pages} ${labels.pagesUnit}` : `${total} ${labels.labelsUnit}`,
    },
  ];

  function renderSheetPreview() {
    if (!hasGraphic) return null;

    if (printerMode === "a4") {
      const per = a4PerPage(a4Layout);
      const { cols } = A4_LAYOUTS[a4Layout];
      const a4PxW = A4_MM.w * MM_TO_PX;
      const a4PxH = A4_MM.h * MM_TO_PX;
      const a4Scale = 300 / a4PxW;
      const shownPages = Math.min(pages, A4_PREVIEW_PAGE_CAP);
      const pageEls = [];
      for (let p = 0; p < shownPages; p++) {
        const start = p * per;
        const count = Math.min(per, total - start);
        const cells = Array.from({ length: count }, () => labelHtml);
        pageEls.push(
          <div key={p} className="rounded-lg border border-slate-200 shadow-sm overflow-hidden bg-white">
            <ScaledHtml html={buildA4PageInner(cells, cols, dims.h)} widthPx={a4PxW} heightPx={a4PxH} scale={a4Scale} />
          </div>,
        );
      }
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-4">{pageEls}</div>
          <p className="text-xs font-semibold text-slate-500">
            {labels.pagesWillPrint.replace("{n}", String(pages))}
          </p>
        </div>
      );
    }

    // label / thermal — grid of repeated labels
    if (total <= 1) return null;
    const shown = Math.min(total, GRID_PREVIEW_CAP);
    const gridScale = Math.min(150 / labelPxW, 1.2);
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex max-h-[260px] flex-wrap justify-center gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
          {Array.from({ length: shown }, (_, i) => (
            <div key={i} className="rounded border border-slate-100 shadow-sm overflow-hidden">
              <ScaledHtml html={labelHtml} widthPx={labelPxW} heightPx={labelPxH} scale={gridScale} />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          {total > shown ? (
            <p className="text-xs text-slate-400">
              {labels.sampleNote.replace("{shown}", String(shown)).replace("{total}", String(total))}
            </p>
          ) : null}
          <p className="text-xs text-slate-400">{labels.labelPrinterNote}</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Inject shared label CSS so preview HTML renders identically to print/export */}
      <style dangerouslySetInnerHTML={{ __html: LABEL_CSS }} />

      <div className="relative my-6 w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-violet-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">{labels.title}</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {product.name}
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

        {/* Body: two-panel */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-violet-100">

          {/* LEFT — settings */}
          <div className="flex flex-col gap-5 overflow-y-auto p-6 lg:w-[340px] lg:max-h-[78vh] shrink-0">

            {/* Product info */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <p className="text-sm font-bold text-slate-900 leading-snug">{product.name}</p>
              {product.sku ? <p className="mt-0.5 tabular-nums text-[11px] text-slate-400">{product.sku}</p> : null}
              {barcodeCode ? (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-white px-2 py-1 tabular-nums text-xs font-semibold text-violet-700">
                  <Barcode className="h-3 w-3" />
                  {barcodeCode}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">{labels.noBarcodeLabel}</p>
              )}
            </div>

            {/* Barcode type */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.barcodeTypeLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {BARCODE_TYPES.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBarcodeType(value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                      barcodeType === value
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    {labels[labelKey] as string}
                  </button>
                ))}
              </div>
              {validationError ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  ⚠ {validationError}
                </p>
              ) : null}
            </div>

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
                      className={`inline-flex flex-col items-center rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                        template === key
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                      }`}
                    >
                      <span>{labels[labelKey] as string}</span>
                      <span className={`mt-0.5 text-[10px] ${template === key ? "text-violet-100" : "text-slate-400"}`}>
                        {d.w}×{d.h} mm
                      </span>
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
                      onChange={() => toggleFlag(flag)}
                      className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                    />
                    {labels[labelKey] as string}
                  </label>
                ))}
              </div>

              {/* Sale price inputs — shown when showSalePrice is enabled */}
              {flags.showSalePrice ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2.5">
                  {/* Original price (crossed-out) — editable, defaults to base_price */}
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-slate-500">{labels.origPriceInput}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={origPriceInput}
                        onChange={(e) => setOrigPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 line-through outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>
                  </div>
                  {/* New sale price */}
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-rose-600">{labels.salePriceInput}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-rose-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={salePriceInput}
                        onChange={(e) => setSalePriceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-600 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      />
                    </div>
                  </div>
                  {!flags.showPrice ? (
                    <p className="text-[10px] text-amber-600">⚠ เปิด "ราคา" ด้วยเพื่อแสดงราคาขีดทับ</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Quantity */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.quantityLabel}</p>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(999, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_QTY.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      quantity === q
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Printer mode */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.printerModeLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRINTER_MODES.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPrinterMode(value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                      printerMode === value
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    {labels[labelKey] as string}
                  </button>
                ))}
              </div>

              {/* A4 layout — only for A4 mode */}
              {printerMode === "a4" ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{labels.a4LayoutLabel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(A4_LAYOUTS) as A4LayoutId[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setA4Layout(id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          a4Layout === id
                            ? "border-violet-500 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                        }`}
                      >
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

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 lg:max-h-[78vh]">

              {/* Info summary */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-violet-100 bg-violet-50/30 px-4 py-3 sm:grid-cols-3">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Single large label preview */}
              <div className="flex flex-col items-center gap-2">
                <p className="self-start text-xs font-bold uppercase tracking-wide text-slate-400">{labels.previewLabel}</p>
                <div className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-slate-50/60 p-6">
                  {hasGraphic ? (
                    <div className="shadow-lg">
                      <ScaledHtml html={labelHtml} widthPx={labelPxW} heightPx={labelPxH} scale={singleScale} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                      <Barcode className="h-10 w-10 opacity-30" />
                      <p className="text-sm">
                        {barcodeCode && !barcodeSvg && !validationError
                          ? labels.invalidBarcodeLabel
                          : validationError
                            ? validationError
                            : labels.noBarcodeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-label / A4 sheet preview */}
              {renderSheetPreview()}
            </div>

            {/* Actions footer */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-violet-100 bg-white px-6 py-4">
              <button
                type="button"
                disabled={!barcodeCode}
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}
                {copied ? labels.copied : labels.copyCode}
              </button>

              <button
                type="button"
                disabled={!hasGraphic || isExporting}
                onClick={handlePng}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <Download className="h-4 w-4" />
                {labels.downloadPng}
              </button>

              <button
                type="button"
                disabled={!hasGraphic || isExporting}
                onClick={handlePdf}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {isExporting ? labels.exporting : labels.downloadPdf}
              </button>

              <button
                type="button"
                disabled={!hasGraphic}
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <Printer className="h-4 w-4" />
                {labels.printLabel}{quantity > 1 ? ` ×${quantity}` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
