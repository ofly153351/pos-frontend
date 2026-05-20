"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";

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
  productView: ProductViewMode;
  products: Product[];
  search: string;
  selectedCategory: string;
  successMessage: string;
  getCartQuantity: (productId: string) => number;
};

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
  productView,
  products,
  search,
  selectedCategory,
  successMessage,
}: ProductBrowserProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const suggestionProducts = useMemo(() => {
    if (!search.trim()) {
      return [];
    }

    return products.slice(0, 6);
  }, [products, search]);

  return (
    <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-48 shrink-0 text-2xl font-semibold text-slate-950">
          {dictionary.title}
        </h2>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="inline-flex items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1">
            <button
              aria-label={dictionary.productViewGrid}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                productView === "grid"
                  ? "bg-sky-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => onProductViewChange("grid")}
              title={dictionary.productViewGrid}
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              aria-label={dictionary.productViewList}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                productView === "list"
                  ? "bg-sky-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => onProductViewChange("list")}
              title={dictionary.productViewList}
              type="button"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="relative w-full">
            <input
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-sky-300"
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 120);
              }}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={dictionary.searchPlaceholder}
              value={search}
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            {isSearchFocused && suggestionProducts.length > 0 ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {suggestionProducts.map((product) => (
                  <button
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50"
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    type="button"
                  >
                    {product.image_url ? (
                      <img
                        alt={product.name}
                        className="h-9 w-12 rounded-lg border border-slate-200 bg-white object-cover"
                        loading="lazy"
                        src={product.image_url}
                      />
                    ) : (
                      <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                        {product.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dictionary.stockLabel} {product.quantity}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {formatCurrency(product.effective_price)}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {/* Category filter pills */}
      {categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              !selectedCategory
                ? "border-sky-300 bg-sky-600 text-white shadow-sm"
                : "border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100"
            }`}
            onClick={() => onCategoryFilterChange("")}
            type="button"
          >
            {dictionary.categoryFilterAll}
          </button>
          {categories.map((category) => (
            <button
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                selectedCategory === category
                  ? "border-sky-300 bg-sky-600 text-white shadow-sm"
                  : "border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
              key={category}
              onClick={() => onCategoryFilterChange(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`pretty-scroll mt-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 ${productView === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "space-y-3"}`}
      >
        {products.length > 0 ? (
          products.map((product) => {
            const currentQuantity = getCartQuantity(product.id);

            return productView === "grid" ? (
              <div
                key={product.id}
                className="flex h-[205px] cursor-pointer flex-col rounded-[1.1rem] border border-sky-100 bg-gradient-to-b from-sky-50/70 to-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => onAddToCart(product)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onAddToCart(product);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="relative">
                  <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                    {dictionary.stockLabel} {product.quantity}
                  </span>
                  {product.image_url ? (
                    <div className="relative">
                      <img
                        alt={product.name}
                        className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
                        loading="lazy"
                        src={product.image_url}
                      />
                      <span className="absolute bottom-1.5 right-1.5 max-w-[85%] truncate rounded bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {product.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-700 shadow-sm">
                      <span className="line-clamp-2">{product.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {formatCurrency(product.effective_price)}
                  </span>
                  {currentQuantity > 0 ? (
                    <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {dictionary.quantityLabel} {currentQuantity}
                    </span>
                  ) : null}
                </div>

                <button
                  className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  disabled={currentQuantity >= product.quantity}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToCart(product);
                  }}
                  type="button"
                >
                  {currentQuantity >= product.quantity
                    ? dictionary.productOutOfStock
                    : dictionary.addButton}
                </button>
              </div>
            ) : (
              <div
                key={product.id}
                className="flex cursor-pointer items-center gap-4 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
                onClick={() => onAddToCart(product)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onAddToCart(product);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {product.image_url ? (
                  <img
                    alt={product.name}
                    className="h-14 w-20 rounded-xl border border-slate-200 bg-white object-cover"
                    loading="lazy"
                    src={product.image_url}
                  />
                ) : (
                  <div className="flex h-14 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {product.product_type_name ??
                      product.product_type?.name ??
                      "-"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      {dictionary.stockLabel} {product.quantity}
                    </span>
                    {currentQuantity > 0 ? (
                      <span className="rounded-full bg-blue-700 px-2 py-0.5 font-semibold text-white">
                        {dictionary.quantityLabel} {currentQuantity}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(product.effective_price)}
                  </p>
                  <button
                    className="mt-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                    disabled={currentQuantity >= product.quantity}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product);
                    }}
                    type="button"
                  >
                    {currentQuantity >= product.quantity
                      ? dictionary.productOutOfStock
                      : dictionary.addButton}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className={
              productView === "grid" ? "sm:col-span-2 xl:col-span-4" : ""
            }
          >
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {dictionary.emptyProducts}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
