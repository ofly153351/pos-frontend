"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Barcode, Pencil, Trash2, X } from "lucide-react";

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
  products: Product[];
  tableDictionary: {
    actions: string;
    barcodeAction: string;
    barcodePreviewTitle: string;
    category: string;
    deleteAction: string;
    editAction: string;
    invalidBarcodeLabel: string;
    noBarcodeLabel: string;
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
  products,
  tableDictionary,
}: ProductsTableProps) {
  const [previewSku, setPreviewSku] = useState<string | null>(null);

  function isOutOfStock(product: Product) {
    return product.quantity <= 0;
  }

  function isLowStock(product: Product) {
    return product.quantity > 0 && product.quantity <= 20;
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

  const previewBarcodeSvg = useMemo(() => {
    if (!previewSku) {
      return "";
    }

    const normalized = previewSku.trim().toUpperCase();
    const code128Patterns = [
      "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
      "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
      "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
      "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
      "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
      "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
      "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
      "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
      "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
      "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
      "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
      "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
      "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
      "211214", "211232", "2331112",
    ];

    const encodedValues = encodeCode128B(normalized);
    if (!encodedValues) {
      return "";
    }

    const moduleWidth = 2;
    const quietZone = 20;
    const barTop = 16;
    const barHeight = 92;
    let x = quietZone;
    let bars = "";

    for (const encodedValue of encodedValues) {
      const pattern = code128Patterns[encodedValue];
      if (!pattern) {
        return "";
      }

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
  }, [previewSku]);

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
        <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
            <th className="w-[34%] px-6 py-4 font-bold">{tableDictionary.productDetails}</th>
            <th className="w-[16%] px-6 py-4 font-bold">{tableDictionary.category}</th>
            <th className="w-[18%] px-6 py-4 font-bold">{tableDictionary.sku}</th>
            <th className="w-[10%] px-6 py-4 font-bold">{tableDictionary.price}</th>
            <th className="w-[8%] px-6 py-4 font-bold">{tableDictionary.stock}</th>
            <th className="w-[14%] px-6 py-4 text-right font-bold">{tableDictionary.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 ? (
            <tr>
              <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={6}>
                {isPending ? loadingLabel : emptyState}
              </td>
            </tr>
          ) : null}
          {products.map((product, index) => (
            <tr
              key={product.id}
              className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
            >
              <td className="px-6 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  {product.image_url ? (
                    <img
                      alt={product.name}
                      className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                      loading="lazy"
                      src={product.image_url}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span
                      className="overflow-hidden break-all text-sm font-bold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                      title={product.name}
                    >
                      {product.name}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {product.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className="block truncate rounded px-2 py-1 text-[11px] font-bold uppercase text-blue-800"
                  title={product.product_type_name ?? product.product_type?.name ?? "-"}
                >
                  {product.product_type_name ?? product.product_type?.name ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                <span className="block truncate" title={product.sku ?? "-"}>
                  {product.sku ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-bold text-blue-700">
                {product.effective_price}
              </td>
              <td className="px-6 py-4">
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
                    {isOutOfStock(product) || isLowStock(product) ? (
                      <AlertTriangle
                        aria-label={
                          isOutOfStock(product)
                            ? outOfStockLabel
                            : lowStockLabel
                        }
                        className={`h-4 w-4 ${
                          isOutOfStock(product) ? "text-rose-500" : "text-amber-500"
                        }`}
                      />
                    ) : null}
                    {product.quantity}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={tableDictionary.barcodeAction}
                    disabled={!product.sku}
                    onClick={() => setPreviewSku(product.sku ?? null)}
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
              <button
                aria-label={tableDictionary.barcodePreviewTitle}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                onClick={() => setPreviewSku(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              {previewBarcodeSvg ? (
                <img
                  alt={`${tableDictionary.barcodeAction} ${previewSku}`}
                  className="mx-auto h-auto max-w-full"
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
