"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Barcode, Pencil, Printer, Trash2, X } from "lucide-react";

import type { ManagementDictionary } from "@/components/stock/types";
import type { Product } from "@/types/product";

type ProductsTableProps = {
  emptyState: string;
  isPending: boolean;
  loadingLabel: string;
  lowStockLabel: string;
  outOfStockLabel: string;
  managementDictionary: ManagementDictionary;
  onDelete: (productId: string) => void;
  onEdit: (product: Product) => void;
  onExport: (selectedIds: string[]) => void;
  products: Product[];
  tableDictionary: {
    actions: string;
    barcodeAction: string;
    barcodePreviewTitle: string;
    barcodePrintLabel: string;
    category: string;
    deleteAction: string;
    editAction: string;
    exportLabel: string;
    importLabel: string;
    invalidBarcodeLabel: string;
    noBarcodeLabel: string;
    barcode: string;
    price: string;
    productDetails: string;
    sku: string;
    stock: string;
  };
};

export function ProductsTable({
  emptyState,
  isPending,
  loadingLabel,
  lowStockLabel,
  outOfStockLabel,
  managementDictionary,
  onDelete,
  onEdit,
  onExport,
  products,
  tableDictionary,
}: ProductsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  function formatCurrency(value: number) {
    return new Intl.NumberFormat("th-TH", {
      currency: "THB",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(value);
  }

  const [previewSku, setPreviewSku] = useState<string | null>(null);

  function generateBarcodeSvg(sku: string): string {
    const normalized = sku.trim().toUpperCase();
    const code128Patterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312",
      "132212","221213","221312","231212","112232","122132","122231","113222",
      "123122","123221","223211","221132","221231","213212","223112","312131",
      "311222","321122","321221","312212","322112","322211","212123","212321",
      "232121","111323","131123","131321","112313","132113","132311","211313",
      "231113","231311","112133","112331","132131","113123","113321","133121",
      "313121","211331","231131","213113","213311","213131","311123","311321",
      "331121","312113","312311","332111","314111","221411","431111","111224",
      "111422","121124","121421","141122","141221","112214","112412","122114",
      "122411","142112","142211","241211","221114","413111","241112","134111",
      "111242","121142","121241","114212","124112","124211","411212","421112",
      "421211","212141","214121","412121","111143","111341","131141","114113",
      "114311","411113","411311","113141","114131","311141","411131","211412",
      "211214","211232","2331112",
    ];

    const encodedValues = encodeCode128B(normalized);
    if (!encodedValues) return "";

    const moduleWidth = 2;
    const quietZone = 20;
    const barTop = 16;
    const barHeight = 92;
    let x = quietZone;
    let bars = "";

    for (const encodedValue of encodedValues) {
      const pattern = code128Patterns[encodedValue];
      if (!pattern) return "";

      let isBar = true;
      for (const unitChar of pattern) {
        const unit = Number(unitChar);
        const width = unit * moduleWidth;
        if (isBar) {
          bars += `<rect x="${x}" y="${barTop}" width="${width}" height="${barHeight}" fill="#0f172a" />`;
        }
        x += width;
        isBar = !isBar;
      }
    }

    const totalWidth = x + quietZone;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="146" viewBox="0 0 ${totalWidth} 146" role="img" aria-label="barcode">
        <rect width="${totalWidth}" height="146" fill="white"/>
        ${bars}
        <text x="${totalWidth / 2}" y="132" text-anchor="middle" font-family="monospace" font-size="14" fill="#0f172a">${normalized}</text>
      </svg>
    `.trim();
  }

  const previewBarcodeSvg = useMemo(() => {
    if (!previewSku) return "";
    return generateBarcodeSvg(previewSku);
  }, [previewSku]);

  function isOutOfStock(product: Product) {
    return product.quantity <= 0;
  }

  function isLowStock(product: Product) {
    if (product.quantity <= 0) return false;
    if (product.max_stock != null && product.quantity < product.max_stock / 2) return true;
    if (product.min_stock != null && product.min_stock > 0 && product.quantity <= product.min_stock) return true;
    return (product.min_stock == null || product.min_stock === 0) && product.max_stock == null && product.quantity <= 20;
  }

  function printBarcode(svgContent: string, sku: string | null) {
    if (!svgContent || !sku) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const printWindow = window.open(
      "",
      "barcode-print",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!printWindow) return;

    const encodedSvg = encodeURIComponent(svgContent);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcode - ${sku}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            background: white;
          }
          .barcode-wrapper {
            display: inline-block;
            padding: 8px;
          }
          .barcode-wrapper img {
            display: block;
            max-width: none;
            height: auto;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="barcode-wrapper">
          <img src="data:image/svg+xml;utf8,${encodedSvg}" alt="${sku}" />
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function encodeCode128B(value: string) {
    if (!value) {
      return null;
    }

    const encodedValues: number[] = [];
    for (const character of value) {
      const code = character.charCodeAt(0);
      if (code < 32 || code > 126) {
        return null;
      }
      encodedValues.push(code - 32);
    }

    let checksum = 104;
    encodedValues.forEach((encodedValue, index) => {
      checksum += encodedValue * (index + 1);
    });

    return [104, ...encodedValues, checksum % 103, 106];
  }

  useEffect(() => {
    if (!previewSku) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewSku(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewSku]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
            <span className="text-sm text-slate-700">
              <strong className="font-semibold">{selectedIds.size}</strong> selected
            </span>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  const selectedProducts = products.filter((p) =>
                    selectedIds.has(p.id) && (p.barcode || p.sku),
                  );
                  if (selectedProducts.length === 0) return;

                  const barcodesHtml = selectedProducts
                    .map((p) => {
                      const code = (p.barcode ?? p.sku ?? "").trim();
                      const svg = generateBarcodeSvg(code);
                      if (!svg) {
                        return `<div class="barcode-item"><div class="barcode-label">${p.name}</div><div class="barcode-fallback">${code}</div></div>`;
                      }
                      return `<div class="barcode-item"><div class="barcode-label">${p.name}</div><img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" alt="${code}" /></div>`;
                    })
                    .join("");

                  const printWindow = window.open("", "barcode-bulk-print", `width=${window.innerWidth},height=${window.innerHeight}`);
                  if (!printWindow) return;
                  printWindow.document.write(`<!DOCTYPE html>
<html>
<head><title>Print Barcodes</title>
<style>
  @page { margin: 8mm; size: auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; padding: 8px; }
  .barcode-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
  .barcode-item { text-align: center; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-flex; flex-direction: column; align-items: center; }
  .barcode-label { font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 4px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barcode-item img { display: block; max-width: none; height: auto; }
  .barcode-fallback { font-family: monospace; font-size: 13px; color: #64748b; padding: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="barcode-grid">${barcodesHtml}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
</body>
</html>`);
                  printWindow.document.close();
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v8H6z" />
                </svg>
                {tableDictionary.barcodeAction}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                onClick={() => onExport(Array.from(selectedIds))}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                </svg>
                {tableDictionary.exportLabel}
              </button>
            </div>
          </div>
        ) : null}
        <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
            <th className="w-[5%] px-4 py-4 text-center">
              <input
                aria-label="Select all"
                checked={products.length > 0 && selectedIds.size === products.length}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                onChange={() => {
                  if (selectedIds.size === products.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(products.map((p) => p.id)));
                  }
                }}
                type="checkbox"
              />
            </th>
            <th className="w-[10%] px-6 py-4 text-center font-bold">รูป</th>
            <th className="w-[25%] px-6 py-4 font-bold">{tableDictionary.productDetails}</th>
            <th className="w-[13%] px-6 py-4 font-bold">{tableDictionary.barcode}</th>
            <th className="w-[14%] px-6 py-4 font-bold">{tableDictionary.category}</th>
            <th className="w-[10%] px-6 py-4 font-bold">{tableDictionary.price}</th>
            <th className="w-[8%] px-6 py-4 font-bold">{tableDictionary.stock}</th>
            <th className="w-[15%] px-6 py-4 text-right font-bold">{tableDictionary.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 ? (
            <tr>
              <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={8}>
                {isPending ? (
                  <span className="inline-flex items-center gap-3">
                    <svg aria-hidden="true" className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                    <span className="animate-pulse">{loadingLabel}</span>
                  </span>
                ) : (
                  emptyState
                )}
              </td>
            </tr>
          ) : null}
          {products.map((product, index) => (
            <tr
              key={product.id}
              className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
            >
              <td className="px-4 py-4 text-center">
                <input
                  aria-label={`Select ${product.name}`}
                  checked={selectedIds.has(product.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  onChange={() => {
                    const next = new Set(selectedIds);
                    if (next.has(product.id)) {
                      next.delete(product.id);
                    } else {
                      next.add(product.id);
                    }
                    setSelectedIds(next);
                  }}
                  type="checkbox"
                />
              </td>
              <td className="px-6 py-4 text-center">
                {product.image_url ? (
                  <img
                    alt={product.name}
                    className="mx-auto h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                    loading="lazy"
                    src={product.image_url}
                  />
                ) : (
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex min-w-0 flex-col">
                  <span
                    className="overflow-hidden break-all text-sm font-bold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                    title={product.name}
                  >
                    {product.name}
                  </span>
                  {product.sku ? (
                    <span className="mt-0.5 truncate text-xs text-slate-400" title={product.sku}>
                      {product.sku}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                <span className="block truncate font-mono" title={product.barcode ?? "-"}>
                  {product.barcode ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className="block truncate rounded px-2 py-1 text-[11px] font-bold uppercase text-blue-800"
                  title={product.product_type_name ?? product.product_type?.name ?? "-"}
                >
                  {product.product_type_name ?? product.product_type?.name ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-bold text-blue-700">
                {formatCurrency(Number(product.effective_price ?? 0))}
              </td>
              <td className="px-2 py-4">
                <div className="flex flex-col">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      isOutOfStock(product)
                        ? "text-rose-700"
                        : isLowStock(product)
                          ? "text-amber-700"
                          : "text-slate-900"
                    }`}
                  >
                    {isOutOfStock(product) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        <svg aria-hidden="true" className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        {outOfStockLabel}
                      </span>
                    ) : (
                      <>
                        {isLowStock(product) ? (
                          <AlertTriangle
                            aria-label={lowStockLabel}
                            className="h-4 w-4 text-amber-500"
                          />
                        ) : null}
                        <span>
                          {product.max_stock != null
                            ? `${product.quantity} / ${product.max_stock}`
                            : product.quantity}
                          {product.product_unit_name
                            ? ` ${product.product_unit_name}`
                            : ""}
                        </span>
                      </>
                    )}
                  </span>
                  {product.min_stock != null && product.min_stock > 0 || product.max_stock != null ? (
                    <span
                      className={`mt-0.5 text-[11px] ${
                        isOutOfStock(product)
                          ? "text-rose-400"
                          : isLowStock(product)
                            ? "text-amber-400"
                            : "text-slate-400"
                      }`}
                    >  {product.min_stock != null && product.min_stock > 0
                        ? `Min ${product.min_stock}`
                        : ""}{" "}
                      {product.min_stock != null && product.min_stock > 0 && product.max_stock != null ? "/ " : ""}
                      {product.max_stock != null ? `Max ${product.max_stock}` : ""}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={tableDictionary.barcodeAction}
                    disabled={!product.barcode && !product.sku}
                    onClick={() => setPreviewSku(product.barcode ?? product.sku ?? null)}
                    title={tableDictionary.barcodeAction}
                    type="button"
                  >
                    <Barcode className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-50"
                    aria-label={tableDictionary.editAction}
                    onClick={() => onEdit(product)}
                    title={tableDictionary.editAction}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label={tableDictionary.deleteAction}
                    onClick={() => onDelete(product.id)}
                    title={tableDictionary.deleteAction}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </section>

      {previewSku ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {tableDictionary.barcodePreviewTitle}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  onClick={() => printBarcode(previewBarcodeSvg, previewSku)}
                  type="button"
                >
                  <Printer className="h-4 w-4" />
                  {tableDictionary.barcodePrintLabel}
                </button>
                <button
                  aria-label={tableDictionary.barcodePreviewTitle}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setPreviewSku(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              {previewBarcodeSvg ? (
                <img
                  alt={`${tableDictionary.barcodeAction} ${previewSku}`}
                  className="mx-auto h-auto max-w-full"
                  id="barcode-preview-img"
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(previewBarcodeSvg)}`}
                />
              ) : (
                <p className="text-center text-sm text-slate-500">
                  {previewSku?.trim()
                    ? tableDictionary.invalidBarcodeLabel
                    : tableDictionary.noBarcodeLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
