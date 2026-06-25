/**
 * Label layout engine — single source of truth for how a barcode label looks.
 *
 * The same buildLabelHtml() + LABEL_CSS is consumed by:
 *   • the on-screen React preview (dangerouslySetInnerHTML, scaled)
 *   • the print window  (lib/label.ts → printSheet)
 *   • PNG / PDF export  (lib/label-raster.ts → foreignObject rasterization)
 *
 * This guarantees "what you see is what prints / exports".
 */

import type { LabelContentFlags, PrintTemplate, PrinterMode } from "@/lib/barcode";

// ── Units ─────────────────────────────────────────────────────────────────────

export const MM_TO_PT = 72 / 25.4;      // ≈ 2.8346
export const MM_TO_PX = 96 / 25.4;      // ≈ 3.7795 (CSS px at 96dpi)

// ── Template dimensions (mm) ──────────────────────────────────────────────────

export const TEMPLATE_DIMS_MM: Record<PrintTemplate, { w: number; h: number }> = {
  small: { w: 40, h: 20 },
  medium: { w: 58, h: 30 },
  large: { w: 80, h: 50 },
  shelf: { w: 100, h: 50 },
  qr: { w: 40, h: 40 },
};

export const A4_MM = { w: 210, h: 297, margin: 6 };

export type A4LayoutId = "3x8" | "4x10" | "5x13";

export const A4_LAYOUTS: Record<A4LayoutId, { cols: number; rows: number; label: string }> = {
  "3x8": { cols: 3, rows: 8, label: "3 × 8" },
  "4x10": { cols: 4, rows: 10, label: "4 × 10" },
  "5x13": { cols: 5, rows: 13, label: "5 × 13" },
};

export function a4PerPage(layout: A4LayoutId): number {
  const l = A4_LAYOUTS[layout];
  return l.cols * l.rows;
}

/** Total physical "pages" that will be produced. */
export function pageCount(mode: PrinterMode, layout: A4LayoutId, total: number): number {
  if (total <= 0) return 0;
  if (mode === "a4") return Math.ceil(total / a4PerPage(layout));
  return total; // label / thermal — one label per feed
}

// ── Shared label CSS (prefixed to avoid app-style clashes) ────────────────────

// NOTE on line-height: Thai stacks marks both ABOVE (วรรณยุกต์ ่ ้ ๊ ๋, สระ ิ ี ึ ื)
// and BELOW (สระ ุ ู) the consonant. A single-line box with overflow:hidden clips
// those marks when line-height is too tight. Thai-bearing fields use ≥1.5 so the
// line box is taller than the tallest stacked glyph. (Same root cause as the
// product-card vowel fix.) Latin-only fields (price, barcode number) can stay tighter.
export const LABEL_CSS = `
.bclbl{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.3mm;padding:1mm;overflow:hidden;background:#fff;font-family:'Sarabun',system-ui,sans-serif;text-align:center;color:#0f172a;}
.bclbl-store{font-size:6pt;font-weight:700;color:#6d28d9;line-height:1.5;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bclbl-name{font-size:8pt;font-weight:700;line-height:1.6;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:normal;}
.bclbl-pair{display:flex;align-items:center;justify-content:center;gap:2mm;max-width:100%;}
.bclbl-half{max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bclbl-sku,.bclbl-cat,.bclbl-brand,.bclbl-loc{font-size:6pt;color:#475569;line-height:1.5;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bclbl-cat{color:#6d28d9;}
.bclbl-price{font-size:12pt;font-weight:800;line-height:1.3;}
.bclbl-price-wrap{display:flex;align-items:baseline;justify-content:center;gap:1.5mm;}
.bclbl-price-orig{font-size:7pt;font-weight:600;color:#94a3b8;text-decoration:line-through;line-height:1.3;}
.bclbl-price-sale{font-size:12pt;font-weight:800;color:#dc2626;line-height:1.3;}
.bclbl-bc{display:flex;align-items:center;justify-content:center;max-width:100%;max-height:56%;overflow:hidden;}
.bclbl-bc svg{display:block;max-width:100%;max-height:100%;width:auto;height:auto;}
.bclbl-num{font-size:7pt;font-variant-numeric:tabular-nums;letter-spacing:0.5px;line-height:1.3;}
`.trim();

// ── Label data ────────────────────────────────────────────────────────────────

export type LabelData = {
  name: string;
  sku: string | null;
  barcode: string | null;
  price?: number | null;
  /** When set alongside showSalePrice flag, the original price shows crossed-out. */
  salePrice?: number | null;
  location?: string | null;
  category?: string | null;
  brand?: string | null;
  storeName?: string | null;
  /** Barcode/QR graphic SVG, already generated WITHOUT embedded text. */
  barcodeSvg: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtPrice(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB", style: "currency",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

/** The human-readable code shown below the graphic — the single source of the number. */
export function labelCodeText(data: LabelData): string {
  return (data.barcode ?? data.sku ?? "").trim();
}

/**
 * Build a complete `.bclbl` label box (fills its parent 100%).
 * The barcode NUMBER is rendered exactly once, below the graphic,
 * and only when flags.showBarcodeNumber is on.
 */
export function buildLabelHtml(data: LabelData, flags: LabelContentFlags): string {
  const code = labelCodeText(data);
  const parts: string[] = [];

  // Store — full width, violet, small
  if (flags.showStoreName && data.storeName)
    parts.push(`<div class="bclbl-store">${escapeHtml(data.storeName)}</div>`);

  // Name — bold, wraps to 2 lines
  if (flags.showName && data.name)
    parts.push(`<div class="bclbl-name">${escapeHtml(data.name)}</div>`);

  // Pair 1: SKU + Category on one row (saves vertical space when both enabled)
  const skuHtml  = flags.showSku      && data.sku      ? `<span class="bclbl-sku bclbl-half">${escapeHtml(data.sku)}</span>`      : "";
  const catHtml  = flags.showCategory && data.category ? `<span class="bclbl-cat bclbl-half">${escapeHtml(data.category)}</span>` : "";
  if (skuHtml && catHtml)   parts.push(`<div class="bclbl-pair">${skuHtml}${catHtml}</div>`);
  else if (skuHtml)         parts.push(`<div class="bclbl-sku">${escapeHtml(data.sku!)}</div>`);
  else if (catHtml)         parts.push(`<div class="bclbl-cat">${escapeHtml(data.category!)}</div>`);

  // Price — regular or sale (crossed-out original + new price)
  if (flags.showPrice && data.price != null) {
    if (flags.showSalePrice && data.salePrice != null) {
      parts.push(
        `<div class="bclbl-price-wrap">` +
        `<span class="bclbl-price-orig">${escapeHtml(fmtPrice(data.price))}</span>` +
        `<span class="bclbl-price-sale">${escapeHtml(fmtPrice(data.salePrice))}</span>` +
        `</div>`
      );
    } else {
      parts.push(`<div class="bclbl-price">${escapeHtml(fmtPrice(data.price))}</div>`);
    }
  }

  // Pair 2: Brand + Location on one row (saves vertical space when both enabled)
  const brandHtml = flags.showBrand    && data.brand    ? `<span class="bclbl-brand bclbl-half">${escapeHtml(data.brand)}</span>`       : "";
  const locHtml   = flags.showLocation && data.location ? `<span class="bclbl-loc bclbl-half">📍 ${escapeHtml(data.location)}</span>` : "";
  if (brandHtml && locHtml)  parts.push(`<div class="bclbl-pair">${brandHtml}${locHtml}</div>`);
  else if (brandHtml)        parts.push(`<div class="bclbl-brand">${escapeHtml(data.brand!)}</div>`);
  else if (locHtml)          parts.push(`<div class="bclbl-loc">📍 ${escapeHtml(data.location!)}</div>`);

  // Barcode graphic (inline SVG — not <img> — so canvas rasterization stays untainted)
  if (data.barcodeSvg) {
    parts.push(`<div class="bclbl-bc">${data.barcodeSvg}</div>`);
  } else {
    parts.push(`<div class="bclbl-num">${escapeHtml(code)}</div>`);
  }

  // Barcode number below graphic
  if (flags.showBarcodeNumber && code && data.barcodeSvg)
    parts.push(`<div class="bclbl-num">${escapeHtml(code)}</div>`);

  return `<div class="bclbl">${parts.join("")}</div>`;
}

// ── Print document ────────────────────────────────────────────────────────────

type SheetParams = {
  labels: string[];          // each = a full .bclbl box, in print order
  mode: PrinterMode;
  template: PrintTemplate;
  layout: A4LayoutId;
};

function thermalWidthMm(mode: PrinterMode): number {
  return mode === "58mm" ? 58 : 80;
}

/** Build the full HTML document for a print window (or rasterization fallback). */
export function buildSheetDocument({ labels, mode, template, layout }: SheetParams): string {
  const dims = TEMPLATE_DIMS_MM[template];

  let pageCss = "";
  let body = "";

  if (mode === "a4") {
    const { cols } = A4_LAYOUTS[layout];
    const per = a4PerPage(layout);
    pageCss = `
@page{size:A4;margin:${A4_MM.margin}mm;}
.bcpage{width:100%;page-break-after:always;}
.bcpage:last-child{page-break-after:auto;}
.bcgrid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:1.5mm;}
.bccell{height:${dims.h}mm;border:0.2mm solid #e2e8f0;}`;
    const pages: string[] = [];
    for (let i = 0; i < labels.length; i += per) {
      const cells = labels.slice(i, i + per).map((l) => `<div class="bccell">${l}</div>`).join("");
      pages.push(`<div class="bcpage"><div class="bcgrid">${cells}</div></div>`);
    }
    body = pages.join("");
  } else {
    const w = mode === "label" ? dims.w : thermalWidthMm(mode);
    pageCss = `
@page{size:${w}mm ${dims.h}mm;margin:0;}
.bcpage-label{width:${w}mm;height:${dims.h}mm;page-break-after:always;}
.bcpage-label:last-child{page-break-after:auto;}`;
    body = labels.map((l) => `<div class="bcpage-label">${l}</div>`).join("");
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Barcode Labels</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#fff;}
${LABEL_CSS}
${pageCss}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>${body}
<script>
(function(){
  function doPrint(){ try{window.focus();}catch(e){} window.print(); }
  function whenReady(){
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function(){ setTimeout(doPrint, 80); });
  }
  if (document.readyState === 'complete') whenReady();
  else window.addEventListener('load', whenReady);
  window.onafterprint = function(){ window.close(); };
})();
<\/script>
</body></html>`;
}

/** Build one A4 page's inner HTML (grid of label cells) — shared by preview + PDF. */
export function buildA4PageInner(cells: string[], cols: number, labelHmm: number): string {
  const cellHtml = cells
    .map((c) => `<div style="height:${labelHmm}mm;border:0.2mm solid #e2e8f0;">${c}</div>`)
    .join("");
  return (
    `<div style="width:${A4_MM.w}mm;height:${A4_MM.h}mm;padding:${A4_MM.margin}mm;background:#fff;box-sizing:border-box;">` +
    `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:1.5mm;">${cellHtml}</div>` +
    `</div>`
  );
}

/** Open a print window for the given pre-built label boxes. */
export function printSheet(params: SheetParams): void {
  if (params.labels.length === 0) return;
  const pw = window.open("", "barcode-print", `width=${window.innerWidth},height=${window.innerHeight}`);
  if (!pw) return;
  pw.document.write(buildSheetDocument(params));
  pw.document.close();
}

// ── Batch print (multiple products) ───────────────────────────────────────────

import { generateBarcodeSvgByType } from "@/lib/barcode";

export type BatchProduct = {
  name: string;
  sku: string | null;
  barcode: string | null;
  price?: number | null;
  location?: string | null;
  category?: string | null;
  brand?: string | null;
};

/** Print one CODE128 label per product (structure ready for future per-product qty). */
export function printBarcodeBatch(
  products: BatchProduct[],
  template: PrintTemplate,
  flags: LabelContentFlags,
  mode: PrinterMode = "label",
  layout: A4LayoutId = "4x10",
  qtyPerProduct = 1,
): void {
  const labels: string[] = [];
  for (const p of products) {
    const code = (p.barcode ?? p.sku ?? "").trim();
    if (!code) continue;
    const svg = generateBarcodeSvgByType(code, "code128", false);
    const html = buildLabelHtml({ ...p, barcodeSvg: svg }, flags);
    for (let i = 0; i < qtyPerProduct; i++) labels.push(html);
  }
  printSheet({ labels, mode, template, layout });
}
