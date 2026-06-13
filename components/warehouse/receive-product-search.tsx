"use client";

import { useMemo } from "react";
import { Minus, Package, Plus, Search } from "lucide-react";

import type { Product } from "@/types/product";
import type { ReceiveDictionary } from "./receive-shared";

export type ReceiveProductSearchProps = {
  dictionary: ReceiveDictionary;
  products: Product[];
  search: string;
  scanCode: string;
  scanFeedback: { tone: "error" | "success"; value: string } | null;
  qtyByProduct: Record<string, number>;
  disabled: boolean;
  onSearchChange: (v: string) => void;
  onScanChange: (v: string) => void;
  onScanSubmit: () => void;
  onAdd: (product: Product) => void;
  onStep: (product: Product, delta: number) => void;
};

export function ReceiveProductSearch({
  dictionary: t,
  products,
  search,
  scanCode,
  scanFeedback,
  qtyByProduct,
  disabled,
  onSearchChange,
  onScanChange,
  onScanSubmit,
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
    <section className="rounded-3xl border border-violet-100 bg-violet-50/30 p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-slate-700">{t.labelAllProducts}</h3>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
            disabled={disabled}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[0]) onAdd(filtered[0]);
              }
            }}
            placeholder={t.placeholderSearchProducts}
            value={search}
          />
        </div>
        <input
          className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
          disabled={disabled}
          onChange={(e) => onScanChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onScanSubmit();
            }
          }}
          placeholder={t.placeholderScanCode}
          value={scanCode}
        />
      </div>

      {scanFeedback ? (
        <div className={`mb-3 rounded-2xl border px-3 py-2 text-sm ${scanFeedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {scanFeedback.value}
        </div>
      ) : null}

      {filtered.length ? (
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-0.5">
          {filtered.map((product) => {
            const currentQty = qtyByProduct[product.id] ?? 0;
            const isSelected = currentQty > 0;
            return (
              <div key={product.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${isSelected ? "border-violet-200 bg-white" : "border-transparent bg-white hover:border-violet-100"}`}>
                <button className="min-w-0 flex-1 text-left" disabled={disabled} onClick={() => onAdd(product)} type="button">
                  <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                  <p className="truncate text-xs text-slate-500">{product.sku || "—"}{product.product_unit_name ? ` · ${product.product_unit_name}` : ""}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isSelected ? (
                    <>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">×{currentQty}</span>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40" disabled={disabled} onClick={() => onStep(product, -1)} type="button">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40" disabled={disabled} onClick={() => onStep(product, 1)} type="button">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-white font-bold text-violet-600 hover:bg-violet-50 disabled:opacity-40" disabled={disabled} onClick={() => onAdd(product)} type="button">
                      <Plus className="h-4 w-4" />
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
