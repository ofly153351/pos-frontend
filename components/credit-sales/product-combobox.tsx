"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Package, Plus, Search, X } from "lucide-react";

import type { Product } from "@/types/product";

// Cap the number of rendered rows so a 1000+ product catalog never mounts as one
// giant DOM list — search narrows it, and broad queries show the first slice only.
const MAX_RESULTS = 50;

export type ProductPick = {
  product_id: string;
  product_name: string;
  unit?: string;
  price: number;
  quantity: number;
  total: number;
};

export type ProductComboboxLabels = {
  searchPlaceholder: string;
  skuLabel: string;
  stockLabel: string;
  priceLabel: string;
  unitLabel: string;
  noProductsFound: string;
  addBtn: string;
  stockExceeded: string; // uses {count} — shown when qty exceeds available stock
};

function baht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function unitOf(p: Product): string {
  return p.unit_type ?? p.product_unit_name ?? "";
}

// Searchable product picker (name / SKU / barcode), POS-friendly: large touch
// targets, scanner auto-match, qty stepper, and a compact summary card.
export function ProductCombobox({
  products,
  labels,
  onAdd,
}: {
  products: Product[];
  labels: ProductComboboxLabels;
  onAdd: (pick: ProductPick) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // True right after a barcode auto-add, so the scanner's trailing Enter is ignored.
  const justScannedRef = useRef(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(product: Product) {
    setSelected(product);
    setQty(1);
    setQuery("");
    setOpen(false);
  }

  // Add a product immediately at qty 1 (Enter / barcode path), then clear and
  // refocus the box for the next scan. Out-of-stock products are selected instead
  // so the stock warning shows rather than the add silently doing nothing.
  function quickAdd(product: Product) {
    const maxStock = product.total_stock ?? 0;
    if (maxStock < 1) {
      pick(product);
      return;
    }
    const price = Number(product.base_price ?? 0);
    onAdd({
      product_id: product.id,
      product_name: product.name,
      unit: unitOf(product) || undefined,
      price,
      quantity: 1,
      total: price,
    });
    setSelected(null);
    setQty(1);
    setQuery("");
    setActive(0);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleQuery(value: string) {
    justScannedRef.current = false;
    setQuery(value);
    setOpen(true);
    setActive(0);
    // Barcode/SKU scanner: an exact match adds the product immediately.
    const t = value.trim();
    if (t.length >= 6) {
      const exact = products.find((p) => (p.barcode ?? "") === t || (p.sku ?? "") === t);
      if (exact) {
        justScannedRef.current = true;
        quickAdd(exact);
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Swallow the scanner's trailing Enter (the barcode already auto-added).
      if (justScannedRef.current) {
        justScannedRef.current = false;
        return;
      }
      const t = query.trim();
      if (!t) return;
      const exact = products.find((p) => (p.barcode ?? "") === t || (p.sku ?? "") === t);
      if (exact) {
        quickAdd(exact);
        return;
      }
      if (results[active]) quickAdd(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function commit() {
    if (!selected) return;
    const price = Number(selected.base_price ?? 0);
    const maxStock = selected.total_stock ?? 0;
    const q = Math.max(1, Math.floor(qty));
    if (q > maxStock) return; // never add more than is in stock — backend deducts immediately
    onAdd({
      product_id: selected.id,
      product_name: selected.name,
      unit: unitOf(selected) || undefined,
      price,
      quantity: q,
      total: price * q,
    });
    setSelected(null);
    setQty(1);
    setQuery("");
  }

  const selPrice = selected ? Number(selected.base_price ?? 0) : 0;
  const selUnit = selected ? unitOf(selected) : "";
  const selStock = selected?.total_stock ?? 0;
  const exceedsStock = !!selected && qty > selStock;

  return (
    <div ref={boxRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={labels.searchPlaceholder}
          value={query}
        />
      </div>

      {/* Results dropdown (capped) */}
      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">{labels.noProductsFound}</div>
          ) : (
            <>
              {results.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(p);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                    i === active ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {labels.skuLabel}: {p.sku || "—"} · {labels.stockLabel}: {p.total_stock ?? 0}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-violet-700">{baht(Number(p.base_price ?? 0))}</span>
                </button>
              ))}
              {matches.length > MAX_RESULTS ? (
                <div className="px-3 py-2 text-center text-[11px] text-slate-400">
                  {results.length} / {matches.length}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* Selected product summary + qty stepper + add */}
      {selected ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900" title={selected.name}>{selected.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {labels.skuLabel}: {selected.sku || "—"} · {labels.stockLabel}: {selected.total_stock ?? 0}
                  {selUnit ? ` · ${labels.unitLabel}: ${selUnit}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{labels.priceLabel}</span>
              <span className="text-base font-bold text-violet-700">{baht(selPrice)}</span>
            </div>
            {/* POS-style quantity stepper */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                className="h-10 w-14 rounded-lg border border-slate-200 text-center text-sm font-semibold outline-none focus:border-violet-500"
                inputMode="numeric"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setQty(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);
                }}
                value={qty}
              />
              <button
                type="button"
                onClick={() => setQty((q) => (selStock > 0 ? Math.min(selStock, q + 1) : q))}
                disabled={qty >= selStock}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {exceedsStock ? (
            <p className="mt-2 text-center text-xs font-medium text-rose-600">
              {labels.stockExceeded.replace("{count}", String(selStock))}
            </p>
          ) : null}

          <button
            type="button"
            onClick={commit}
            disabled={exceedsStock}
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> {labels.addBtn}
          </button>
        </div>
      ) : null}
    </div>
  );
}
