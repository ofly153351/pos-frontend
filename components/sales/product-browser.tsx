"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Scan, Search } from "lucide-react";

import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import type { Product } from "@/types/product";

type ProductBrowserProps = {
  categories: string[];
  dictionary: SalesDictionary;
  error: string;
  onAddToCart: (product: Product) => void;
  onCategoryFilterChange: (category: string) => void;
  onProductViewChange: (mode: ProductViewMode) => void;
  onSearchChange: (value: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  productView: ProductViewMode;
  products: Product[];
  search: string;
  selectedCategory: string;
  successMessage: string;
  getCartQuantity: (productId: string) => number;
};

type SortMode = "default" | "name-asc" | "price-asc" | "price-desc" | "stock-desc";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function ProductBrowser({
  categories,
  dictionary,
  error,
  getCartQuantity,
  onAddToCart,
  onCategoryFilterChange,
  onProductViewChange,
  onSearchChange,
  onUpdateCartQuantity,
  productView,
  products,
  search,
  selectedCategory,
  successMessage,
}: ProductBrowserProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const suggestionProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [products, search]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortMode === "name-asc") return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === "price-asc") return list.sort((a, b) => Number(a.base_price) - Number(b.base_price));
    if (sortMode === "price-desc") return list.sort((a, b) => Number(b.base_price) - Number(a.base_price));
    if (sortMode === "stock-desc") return list.sort((a, b) => (b.total_stock ?? 0) - (a.total_stock ?? 0));
    return list;
  }, [products, sortMode]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[2rem] border border-violet-100 bg-white shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-violet-50 px-5 py-4">
        <h2 className="shrink-0 text-xl font-bold text-slate-900">{dictionary.title}</h2>

        {/* View toggle */}
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-violet-200 bg-white p-1">
          <button
            aria-label={dictionary.productViewGrid}
            className={`rounded-lg p-2 transition ${productView === "grid" ? "bg-violet-600 text-white shadow-sm" : "text-violet-500 hover:bg-violet-50"}`}
            onClick={() => onProductViewChange("grid")}
            type="button"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            aria-label={dictionary.productViewList}
            className={`rounded-lg p-2 transition ${productView === "list" ? "bg-violet-600 text-white shadow-sm" : "text-violet-500 hover:bg-violet-50"}`}
            onClick={() => onProductViewChange("list")}
            type="button"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <input
            className="w-full rounded-2xl border border-violet-200 bg-violet-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder={dictionary.searchPlaceholder}
            value={search}
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {isSearchFocused && suggestionProducts.length > 0 && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-xl">
              {suggestionProducts.map((product) => (
                <button
                  className="flex w-full items-center gap-3 border-b border-violet-50 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-violet-50"
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  type="button"
                >
                  {product.image_url ? (
                    <img alt={product.name} className="h-9 w-12 rounded-lg border border-violet-100 bg-white object-cover" loading="lazy" src={product.image_url} />
                  ) : (
                    <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-xs font-bold text-slate-500">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{dictionary.stockLabel} {product.total_stock ?? 0}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{formatCurrency(product.effective_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Barcode scan */}
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
          type="button"
        >
          <Scan className="h-4 w-4" />
          <span className="hidden sm:inline">สแกน</span>
        </button>
      </div>

      {/* ── Category + sort row ── */}
      {categories.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-50 px-5 py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            <button
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition ${!selectedCategory ? "border-violet-500 bg-violet-600 text-white shadow-sm" : "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
              onClick={() => onCategoryFilterChange("")}
              type="button"
            >
              {dictionary.categoryFilterAll}
            </button>
            {categories.map((cat) => (
              <button
                className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition ${selectedCategory === cat ? "border-violet-500 bg-violet-600 text-white shadow-sm" : "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
                key={cat}
                onClick={() => onCategoryFilterChange(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            className="shrink-0 rounded-xl border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-300"
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            value={sortMode}
          >
            <option value="default">เรียงตาม: ค่าเริ่มต้น</option>
            <option value="name-asc">ชื่อ A→Z</option>
            <option value="price-asc">ราคา น้อย→มาก</option>
            <option value="price-desc">ราคา มาก→น้อย</option>
            <option value="stock-desc">สต็อกมาก→น้อย</option>
          </select>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mx-5 mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}
      {successMessage && (
        <div className="mx-5 mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{successMessage}</div>
      )}

      {/* ── Product grid/list ── */}
      <div className={`pretty-scroll min-h-0 flex-1 overflow-y-auto p-4 ${productView === "grid" ? "grid grid-cols-2 gap-3 xl:grid-cols-4" : "space-y-2"}`}>
        {sortedProducts.length > 0 ? (
          sortedProducts.map((product) => {
            const qty = getCartQuantity(product.id);
            const outOfStock = qty >= (product.total_stock ?? 0) && (product.total_stock ?? 0) > 0;
            const inCart = qty > 0;

            if (productView === "grid") {
              return (
                <div
                  key={product.id}
                  className={`relative flex cursor-pointer flex-col rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${inCart ? "border-violet-400 bg-violet-50/60 shadow-[0_0_0_2px_rgba(124,58,237,0.12)]" : "border-violet-100 bg-white"}`}
                  onClick={() => !outOfStock && onAddToCart(product)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!outOfStock) onAddToCart(product); } }}
                  role="button"
                  tabIndex={0}
                >
                  {/* Qty badge */}
                  {inCart && (
                    <span className="absolute left-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-md">
                      {qty}
                    </span>
                  )}

                  {/* SKU */}
                  <span className="absolute right-2.5 top-2.5 z-10 text-[10px] font-medium text-slate-400">
                    {product.sku ? `รหัส ${product.sku}` : ""}
                  </span>

                  {/* Image */}
                  <div className="flex h-[130px] w-full items-center justify-center overflow-hidden rounded-xl border border-violet-100 bg-white">
                    {product.image_url ? (
                      <img alt={product.name} className="h-full w-full object-contain" loading="lazy" src={product.image_url} />
                    ) : (
                      <span className="px-2 text-center text-sm font-semibold text-slate-600 line-clamp-3">{product.name}</span>
                    )}
                  </div>

                  {/* Name */}
                  <p className="mt-2 text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</p>

                  {/* Price + stock */}
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(Number(product.base_price ?? 0))}</span>
                    <span className="text-[11px] text-slate-400">สต็อก {product.total_stock ?? 0}</span>
                  </div>

                  {/* Add / Stepper */}
                  {inCart ? (
                    <div
                      className="mt-2 flex items-center justify-between rounded-xl bg-violet-600 px-3 py-2 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white transition hover:bg-white/30"
                        onClick={() => onUpdateCartQuantity(product.id, qty - 1)}
                        type="button"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-white">{qty}</span>
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white transition hover:bg-white/30 disabled:opacity-40"
                        disabled={outOfStock}
                        onClick={() => onUpdateCartQuantity(product.id, qty + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={outOfStock}
                      onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                      type="button"
                    >
                      {outOfStock ? dictionary.productOutOfStock : `${dictionary.addButton} +`}
                    </button>
                  )}
                </div>
              );
            }

            // List view
            return (
              <div
                key={product.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition hover:shadow-sm ${inCart ? "border-violet-300 bg-violet-50/50" : "border-violet-100 bg-white"}`}
                onClick={() => !outOfStock && onAddToCart(product)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!outOfStock) onAddToCart(product); } }}
                role="button"
                tabIndex={0}
              >
                <div className="relative h-14 w-14 shrink-0">
                  {inCart && (
                    <span className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                      {qty}
                    </span>
                  )}
                  {product.image_url ? (
                    <img alt={product.name} className="h-full w-full rounded-xl border border-violet-100 object-cover" loading="lazy" src={product.image_url} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-sm font-bold text-slate-500">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.product_type_name ?? product.product_type?.name ?? ""}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{dictionary.stockLabel} {product.total_stock ?? 0}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(product.base_price ?? 0))}</p>
                  {inCart ? (
                    <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700 hover:bg-violet-200" onClick={() => onUpdateCartQuantity(product.id, qty - 1)} type="button">−</button>
                      <span className="w-5 text-center text-sm font-bold text-violet-700">{qty}</span>
                      <button className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40" disabled={outOfStock} onClick={() => onUpdateCartQuantity(product.id, qty + 1)} type="button">+</button>
                    </div>
                  ) : (
                    <button className="mt-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40" disabled={outOfStock} onClick={(e) => { e.stopPropagation(); onAddToCart(product); }} type="button">
                      {outOfStock ? dictionary.productOutOfStock : dictionary.addButton}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={productView === "grid" ? "col-span-2 xl:col-span-4" : ""}>
            <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/40 px-6 py-16 text-center text-sm text-violet-400">
              {dictionary.emptyProducts}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
