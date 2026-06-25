"use client";

import { useMemo } from "react";
import { Minus, Package, Plus, Search } from "lucide-react";

import type { Product } from "@/types/product";
import { ScanButton } from "@/components/shared/scan-button";
import type { ReceiveDictionary } from "./receive-shared";

export type ReceiveProductSearchProps = {
  dictionary: ReceiveDictionary;
  products: Product[];
  search: string;
  scanFeedback: { tone: "error" | "success"; value: string } | null;
  qtyByProduct: Record<string, number>;
  disabled: boolean;
  onSearchChange: (v: string) => void;
  onScanDetected: (barcode: string) => void;
  onAdd: (product: Product) => void;
  onStep: (product: Product, delta: number) => void;
};

export function ReceiveProductSearch({
  dictionary: t,
  products,
  search,
  scanFeedback,
  qtyByProduct,
  disabled,
  onSearchChange,
  onScanDetected,
  onAdd,
  onStep,
}: ReceiveProductSearchProps) {
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((p) => {
      const haystack = [p.name, p.sku, p.barcode, p.brand_name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [products, search]);

  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
      {/* ── Title ── */}
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-slate-700">{t.labelAllProducts}</h3>
      </div>

      {/* ── Unified search + scan + camera row ──
          One field does everything: type a name/SKU/barcode to filter the grid, fire a
          physical scanner (auto-Enter) for an exact-match add, or tap the camera button. */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
            disabled={disabled}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const keyword = search.trim().toLowerCase();
              if (!keyword) return;
              // Prefer an exact SKU/barcode hit (physical-scanner workflow): the parent
              // adds it and shows scan feedback, then we clear for the next scan.
              const exact = products.find(
                (p) =>
                  (p.sku ?? "").trim().toLowerCase() === keyword ||
                  (p.barcode ?? "").trim().toLowerCase() === keyword,
              );
              if (exact) {
                // Clear the box first — onSearchChange also resets scan feedback — THEN
                // resolve, so the parent's fresh success/error banner is the last write
                // and survives instead of being wiped by the clear.
                onSearchChange("");
                onScanDetected(keyword);
                return;
              }
              // Otherwise fall back to adding the top filtered result.
              if (filtered[0]) onAdd(filtered[0]);
            }}
            placeholder={t.placeholderSearchProducts}
            value={search}
          />
        </div>
        <ScanButton
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 transition-colors hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
          disabled={disabled}
          onScan={onScanDetected}
          title={t.scanWithCamera}
        />
      </div>

      {scanFeedback ? (
        <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${scanFeedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {scanFeedback.value}
        </div>
      ) : null}

      {/* ── Product grid ── */}
      {filtered.length ? (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((product) => {
            const currentQty = qtyByProduct[product.id] ?? 0;
            const isSelected = currentQty > 0;
            return (
              <div
                key={product.id}
                className={`flex items-start justify-between gap-1.5 rounded-xl border p-2.5 transition-colors ${isSelected ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-slate-50/60 hover:border-violet-100 hover:bg-white"}`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  disabled={disabled}
                  onClick={() => onAdd(product)}
                  type="button"
                >
                  <p className="truncate text-xs font-semibold leading-tight text-slate-800">{product.name}</p>
                  <p className="truncate text-[10px] text-slate-400">{product.sku || "—"}{product.product_unit_name ? ` · ${product.product_unit_name}` : ""}</p>
                </button>
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  {isSelected ? (
                    <>
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">×{currentQty}</span>
                      <div className="flex gap-0.5">
                        <button
                          className="flex h-5 w-5 items-center justify-center rounded border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40"
                          disabled={disabled}
                          onClick={() => onStep(product, -1)}
                          type="button"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <button
                          className="flex h-5 w-5 items-center justify-center rounded border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40"
                          disabled={disabled}
                          onClick={() => onStep(product, 1)}
                          type="button"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-600 hover:bg-violet-50 disabled:opacity-40"
                      disabled={disabled}
                      onClick={() => onAdd(product)}
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white px-4 py-8 text-center text-sm text-slate-500">{t.emptyProducts}</div>
      )}
    </section>
  );
}
