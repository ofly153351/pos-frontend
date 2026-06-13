"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

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
  noProductsFound: string;
  stockExceeded: string; // uses {count} — shown when stock is 0 or already maxed in the cart
};

function baht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function unitOf(p: Product): string {
  return p.unit_type ?? p.product_unit_name ?? "";
}

// An unset total_stock is treated as "not stock-tracked" → unlimited, matching the
// parent's cap convention; the backend is the real gate (it deducts on save).
function stockOf(p: Product): number {
  return p.total_stock ?? Number.MAX_SAFE_INTEGER;
}

// POS-style product picker. Searching shows a dropdown; selecting a result — by
// click, Enter, or barcode scan (scanner sends the code + a trailing Enter) — adds
// it straight into the transaction at quantity 1 (the parent dedupes/increments).
// There is NO intermediate confirm card: quantity is adjusted in the item table.
export function ProductCombobox({
  products,
  labels,
  onAdd,
  cartQtyOf,
}: {
  products: Product[];
  labels: ProductComboboxLabels;
  onAdd: (pick: ProductPick) => void;
  // Current quantity of a product already in the transaction — lets the picker
  // warn (instead of silently clamping) when the item is already at its stock cap.
  cartQtyOf?: (productId: string) => number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // True when the product can't be added right now (no stock, or the cart already
  // holds every available unit).
  function blockedReason(product: Product): number | null {
    const stock = stockOf(product);
    const inCart = cartQtyOf?.(product.id) ?? 0;
    if (stock < 1 || inCart >= stock) return stock < 1 ? 0 : stock;
    return null;
  }

  // Add the product into the transaction at qty 1, then clear + refocus the box for
  // the next search/scan. Blocked products (out of stock / already maxed) show a
  // brief notice instead of being added.
  function add(product: Product) {
    const blocked = blockedReason(product);
    if (blocked !== null) {
      setNotice(`${product.name} · ${labels.stockExceeded.replace("{count}", String(blocked))}`);
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
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
    setNotice("");
    setQuery("");
    setActive(0);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleQuery(value: string) {
    setNotice("");
    setQuery(value);
    setOpen(true);
    setActive(0);
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
      const t = query.trim();
      if (!t) return;
      // Barcode/SKU scan (or typed code): an exact match adds that product; the
      // scanner's trailing Enter is what triggers the add, so a code that is a
      // prefix of a longer one can never auto-fire mid-stream.
      const exact = products.find((p) => (p.barcode ?? "") === t || (p.sku ?? "") === t);
      if (exact) {
        add(exact);
        return;
      }
      // Otherwise Enter adds the highlighted result instantly.
      if (results[active]) add(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

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

      {notice ? <p className="mt-1.5 text-xs font-medium text-rose-600">{notice}</p> : null}

      {/* Results dropdown (capped) — click/Enter adds straight to the table */}
      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">{labels.noProductsFound}</div>
          ) : (
            <>
              {results.map((p, i) => {
                const stock = p.total_stock ?? 0;
                const blocked = blockedReason(p) !== null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add(p);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                      i === active ? "bg-violet-50" : "hover:bg-slate-50"
                    } ${blocked ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {labels.skuLabel}: {p.sku || "—"} · {labels.stockLabel}: {stock}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-violet-700">{baht(Number(p.base_price ?? 0))}</span>
                  </button>
                );
              })}
              {matches.length > MAX_RESULTS ? (
                <div className="px-3 py-2 text-center text-[11px] text-slate-400">
                  {results.length} / {matches.length}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
