"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Barcode, MoreHorizontal, Pencil, Printer, SlidersHorizontal, Trash2, X } from "lucide-react";

import type { ManagementDictionary } from "@/components/stock/types";
import type { Product } from "@/types/product";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { StockReceiveModal } from "@/components/stock/stock-receive-modal";
import { Skeleton } from "@/components/ui/skeleton";

type ProductsTableProps = {
  emptyState: string;
  isPending: boolean;
  loadingLabel: string;
  lowStockLabel: string;
  outOfStockLabel: string;
  managementDictionary: ManagementDictionary;
  onDelete: (productId: string) => void;
  onDeleteMany: (productIds: string[]) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onExport: (selectedIds: string[]) => void;
  products: Product[];
  receiveDictionary: {
    receiveStockTitle: string;
    receiveStock: string;
    receiveStockConfirm: string;
    receiveStockSuccess: string;
    quantityToAdd: string;
    productName: string;
    currentStock: string;
    note?: string;
    cancel: string;
    saving: string;
    historyTab?: string;
    historyEmpty?: string;
    historyProduct?: string;
    historyQty?: string;
    historyDate?: string;
    historyNote?: string;
    historyOperator?: string;
    historyLoadError?: string;
  };
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
    costPrice: string;
    sellingPrice: string;
    productDetails: string;
    sku: string;
    stock: string;
    status: string;
    statusActive: string;
    statusInactive: string;
    receiveAction: string;
    moreActions: string;
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
  onDeleteMany,
  onEdit,
  onAdjustStock,
  onExport,
  products,
  receiveDictionary,
  tableDictionary,
}: ProductsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  function formatCurrency(value: number) {
    return new Intl.NumberFormat("th-TH", {
      currency: "THB",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(value);
  }

  const [previewSku, setPreviewSku] = useState<string | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

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

  function getTotalStock(product: Product): number {
    return product.total_stock ?? 0;
  }

  function isOutOfStock(product: Product) {
    return getTotalStock(product) === 0;
  }

  function isLowStock(product: Product) {
    const stock = getTotalStock(product);
    if (stock <= 0) return false;
    return product.min_stock != null && stock <= product.min_stock;
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

  // Close action menu on click outside
  useEffect(() => {
    if (!isActionMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
            <span className="text-sm md:text-[15px] text-slate-700">
              <strong className="font-semibold">{selectedIds.size}</strong> selected
            </span>
            <div className="relative" ref={actionMenuRef}>
              <button
                aria-label={tableDictionary.moreActions}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                onClick={() => setIsActionMenuOpen((prev) => !prev)}
                type="button"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {isActionMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-30 mt-1 w-56 origin-top-right animate-fadeIn rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                    onClick={() => {
                      const selectedProducts = products.filter((p) =>
                        selectedIds.has(p.id) && (p.barcode || p.sku),
                      );
                      if (selectedProducts.length === 0) {
                        setIsActionMenuOpen(false);
                        return;
                      }

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
                      if (!printWindow) { setIsActionMenuOpen(false); return; }
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
  <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\\/script>
</body>
</html>`);
                      printWindow.document.close();
                      setIsActionMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Barcode className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{tableDictionary.barcodeAction}</span>
                  </button>

                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                    onClick={() => {
                      onExport(Array.from(selectedIds));
                      setIsActionMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                    <span>{tableDictionary.exportLabel}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setConfirmDeleteIds(Array.from(selectedIds));
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>{tableDictionary.deleteAction}</span>
                  </button>

                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    onClick={() => {
                      setIsReceiveModalOpen(true);
                      setIsActionMenuOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    <span>{tableDictionary.receiveAction}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-slate-100 text-xs md:text-[13px] uppercase tracking-widest text-slate-500">
            <th className="w-[5%] px-4 py-4.5 text-center">
              <input
                aria-label="Select all"
                checked={products.length > 0 && selectedIds.size === products.length}
                className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
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
            <th className="w-[10%] px-6 py-4.5 text-center font-bold">รูป</th>
            <th className="w-[22%] px-6 py-4.5 font-bold">{tableDictionary.productDetails}</th>
            <th className="w-[11%] px-6 py-4.5 font-bold">{tableDictionary.barcode}</th>
            <th className="w-[11%] px-6 py-4.5 font-bold">{tableDictionary.category}</th>
            <th className="w-[8%] px-6 py-4.5 font-bold">{tableDictionary.costPrice}</th>
            <th className="w-[8%] px-6 py-4.5 font-bold">{tableDictionary.sellingPrice}</th>
            <th className="w-[10%] px-6 py-4.5 font-bold">{tableDictionary.stock}</th>
            <th className="w-[9%] px-6 py-4.5 font-bold">{tableDictionary.status}</th>
            <th className="w-[12%] px-6 py-4.5 text-right font-bold">{tableDictionary.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isPending && products.length === 0 ? (
            [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3"><Skeleton className="h-4 w-4 bg-slate-100" /></td>
                <td className="px-4 py-3"><Skeleton className="h-10 w-10 rounded-xl bg-slate-200" /></td>
                <td className="px-4 py-3">
                  <Skeleton className="mb-1.5 h-4 w-36 bg-slate-200" />
                  <Skeleton className="h-3 w-20 bg-slate-100" />
                </td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-14 bg-slate-100" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full bg-slate-100" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full bg-slate-100" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto bg-slate-100" /></td>
                <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-lg bg-slate-100" /></td>
              </tr>
            ))
          ) : products.length === 0 ? (
            <tr>
              <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={10}>
                {emptyState}
              </td>
            </tr>
          ) : null}
          {products.map((product, index) => (
            <tr
              key={product.id}
              className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
            >
              <td className="px-4 py-4.5 text-center">
                <input
                  aria-label={`Select ${product.name}`}
                  checked={selectedIds.has(product.id)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
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
              <td className="px-6 py-4.5 text-center">
                {product.image_url ? (
                  <img
                    alt={product.name}
                    className="mx-auto h-14 w-14 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                    loading="lazy"
                    src={product.image_url}
                  />
                ) : (
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </td>
              <td className="px-6 py-4.5">
                <div className="flex min-w-0 flex-col">
                  <span
                    className="overflow-hidden break-all text-sm md:text-[15px] font-bold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                    title={product.name}
                  >
                    {product.name}
                  </span>
                  {product.sku ? (
                    <span className="mt-0.5 truncate text-xs md:text-sm text-slate-400" title={product.sku}>
                      {product.sku}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4.5 text-sm md:text-[15px] text-slate-500">
                <span className="block truncate font-mono" title={product.barcode ?? "-"}>
                  {product.barcode ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4.5">
                <span
                  className="block truncate rounded px-2 py-1 text-xs font-bold uppercase text-violet-800"
                  title={product.product_type_name ?? product.product_type?.name ?? "-"}
                >
                  {product.product_type_name ?? product.product_type?.name ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4.5 text-sm md:text-[15px] font-semibold text-slate-600">
                {product.cost_price != null ? formatCurrency(Number(product.cost_price)) : "-"}
              </td>
              <td className="px-6 py-4.5 text-sm md:text-[15px] font-bold text-violet-700">
                {formatCurrency(Number(product.base_price ?? 0))}
              </td>
              <td className="px-2 py-4.5">
                <div className="flex flex-col">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm md:text-[15px] font-semibold ${
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
                            ? `${getTotalStock(product)} / ${product.max_stock}`
                            : getTotalStock(product)}
                          {product.product_unit_name
                            ? ` ${product.product_unit_name}`
                            : ""}
                        </span>
                      </>
                    )}
                  </span>
                  {product.min_stock != null && product.min_stock > 0 || product.max_stock != null ? (
                    <span
                      className={`mt-0.5 text-xs ${
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
              <td className="px-6 py-4.5">
                {product.is_active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {tableDictionary.statusActive}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {tableDictionary.statusInactive}
                  </span>
                )}
              </td>
              <td className="px-6 py-4.5 text-right">
                <div className="relative flex items-center justify-end" ref={openMenuId === product.id ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenuId === product.id && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-lg">
                      <button type="button" onClick={() => { onEdit(product); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-violet-50">
                        <Pencil className="h-3.5 w-3.5 text-violet-500" /> {tableDictionary.editAction}
                      </button>
                      <button type="button" onClick={() => { onAdjustStock(product); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-violet-50">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-violet-500" /> ปรับสตอก
                      </button>
                      <button type="button"
                        disabled={!product.barcode && !product.sku}
                        onClick={() => { setPreviewSku(product.barcode ?? product.sku ?? null); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Barcode className="h-3.5 w-3.5 text-violet-500" /> {tableDictionary.barcodeAction}
                      </button>
                      <div className="my-1 border-t border-violet-50" />
                      <button type="button" onClick={() => { setConfirmDeleteIds([product.id]); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" /> {tableDictionary.deleteAction}
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </section>

      {previewSku ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 smooth-fade">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl smooth-fade-up">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {tableDictionary.barcodePreviewTitle}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
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

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
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

      {isReceiveModalOpen ? (
        <StockReceiveModal
          dictionary={receiveDictionary}
          onClose={() => setIsReceiveModalOpen(false)}
          onComplete={() => {
            setIsReceiveModalOpen(false);
            setSelectedIds(new Set());
          }}
          products={products}
          selectedIds={selectedIds}
        />
      ) : null}

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={tableDictionary.deleteAction}
        danger
        icon={
          <Trash2 className="h-5 w-5 text-rose-600" />
        }
        isOpen={confirmDeleteIds !== null}
        onCancel={() => setConfirmDeleteIds(null)}
        onConfirm={() => {
          if (confirmDeleteIds) {
            if (confirmDeleteIds.length === 1) {
              onDelete(confirmDeleteIds[0]);
            } else {
              onDeleteMany(confirmDeleteIds);
            }
            setConfirmDeleteIds(null);
          }
        }}
        title={confirmDeleteIds?.length === 1 ? "Delete product" : `Delete ${confirmDeleteIds?.length ?? 0} products`}
      >
        <p className="text-sm text-slate-600">
          {confirmDeleteIds?.length === 1
            ? "Are you sure you want to delete this product? This action cannot be undone."
            : `Are you sure you want to delete ${confirmDeleteIds?.length ?? 0} products? This action cannot be undone.`}
        </p>
      </ConfirmDialog>
    </>
  );
}
