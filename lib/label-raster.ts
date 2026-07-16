/**
 * Rasterize label HTML → canvas (via SVG <foreignObject>) → PNG / multi-page PDF.
 *
 * Because it rasterizes the exact same buildLabelHtml() + LABEL_CSS used by the
 * print window and the on-screen preview, exported files match the preview.
 *
 * Client-only (uses Image / canvas / atob).
 */

import {
  A4_LAYOUTS,
  A4_MM,
  LABEL_CSS,
  MM_TO_PT,
  MM_TO_PX,
  TEMPLATE_DIMS_MM,
  a4PerPage,
  buildA4PageInner,
  type A4LayoutId,
} from "@/lib/label";
import { buildPdf, dataUrlToBytes, type PdfImagePage } from "@/lib/pdf";
import type { PrinterMode, PrintTemplate } from "@/lib/barcode";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Render arbitrary HTML at a given CSS size into a canvas.
 * @param widthPx/heightPx  intrinsic CSS size of the content box
 * @param scale             super-sampling factor for crisp output
 */
async function rasterize(innerHtml: string, widthPx: number, heightPx: number, scale: number): Promise<HTMLCanvasElement> {
  const fontImport =
    "@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">` +
    `<foreignObject x="0" y="0" width="${widthPx}" height="${heightPx}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${widthPx}px;height:${heightPx}px;background:#fff;">` +
    `<style>${fontImport}${LABEL_CSS}</style>${innerHtml}` +
    `</div></foreignObject></svg>`;

  const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthPx * scale);
  canvas.height = Math.round(heightPx * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function triggerDownload(blobOrUrl: Blob | string, filename: string) {
  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  if (typeof blobOrUrl !== "string") setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── PNG (single label) ────────────────────────────────────────────────────────

/** @returns true on success; false if rasterization/encoding failed (e.g. tainted canvas). */
export async function exportLabelPng(labelHtml: string, template: PrintTemplate, filename: string): Promise<boolean> {
  try {
    const dims = TEMPLATE_DIMS_MM[template];
    const canvas = await rasterize(labelHtml, dims.w * MM_TO_PX, dims.h * MM_TO_PX, 5);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return false;
    triggerDownload(blob, filename);
    return true;
  } catch {
    return false;
  }
}

// ── PDF (paginated sheet) ─────────────────────────────────────────────────────

function thermalWidthMm(mode: PrinterMode): number {
  return mode === "58mm" ? 58 : 80;
}

/**
 * Export the full label set as a multi-page PDF.
 * @param labels  full ordered list of label boxes (one per copy)
 */
/** @returns true on success; false if rasterization/encoding failed (e.g. tainted canvas). */
export async function exportSheetPdf(
  labels: string[],
  mode: PrinterMode,
  template: PrintTemplate,
  layout: A4LayoutId,
  filename: string,
): Promise<boolean> {
  if (labels.length === 0) return false;
  try {
    const dims = TEMPLATE_DIMS_MM[template];
    const pages: PdfImagePage[] = [];

    if (mode === "a4") {
      const { cols } = A4_LAYOUTS[layout];
      const per = a4PerPage(layout);
      const wPx = A4_MM.w * MM_TO_PX;
      const hPx = A4_MM.h * MM_TO_PX;
      for (let i = 0; i < labels.length; i += per) {
        const inner = buildA4PageInner(labels.slice(i, i + per), cols, dims.h);
        const canvas = await rasterize(inner, wPx, hPx, 2);
        const jpeg = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.9));
        pages.push({
          jpeg,
          pxWidth: canvas.width,
          pxHeight: canvas.height,
          widthPt: A4_MM.w * MM_TO_PT,
          heightPt: A4_MM.h * MM_TO_PT,
        });
      }
    } else {
      const wMm = mode === "label" ? dims.w : thermalWidthMm(mode);
      const wPx = wMm * MM_TO_PX;
      const hPx = dims.h * MM_TO_PX;
      for (const label of labels) {
        const inner = `<div style="width:${wMm}mm;height:${dims.h}mm;background:#fff;">${label}</div>`;
        const canvas = await rasterize(inner, wPx, hPx, 5);
        const jpeg = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
        pages.push({
          jpeg,
          pxWidth: canvas.width,
          pxHeight: canvas.height,
          widthPt: wMm * MM_TO_PT,
          heightPt: dims.h * MM_TO_PT,
        });
      }
    }

    triggerDownload(buildPdf(pages), filename);
    return true;
  } catch {
    return false;
  }
}
