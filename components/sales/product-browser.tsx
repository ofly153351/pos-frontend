"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Search, SlidersHorizontal, Ticket } from "lucide-react";

import { CardSettingsModal } from "@/components/sales/card-settings-modal";
import { ProductCard } from "@/components/sales/product-card";
import { ScanButton } from "@/components/shared/scan-button";
import {
  CARD_SIZE_MIN,
  DEFAULT_CARD_SETTINGS,
  cacheCardSettings,
  loadCardSettings,
  type CardSettings,
} from "@/lib/card-settings";
import { fetchCardSettings } from "@/services/card-settings";

const PAGE_SIZE_LIST = 15;

import type {
  ProductViewMode,
  SalesDictionary,
} from "@/components/sales/types";
import type { PromoChip } from "@/components/sales/promo-display";
import type { Campaign } from "@/components/promotions/promotion-types";
import type { Product } from "@/types/product";

type ProductBrowserProps = {
  categories: string[];
  dictionary: SalesDictionary;
  error: string;
  hideSearch?: boolean;
  onAddToCart: (product: Product) => void;
  onCategoryFilterChange: (category: string) => void;
  onProductViewChange: (mode: ProductViewMode) => void;
  onSearchChange: (value: string) => void;
  /** Camera scan: decoded barcode/SKU → parent resolves & adds to cart. */
  onScanDetected?: (code: string) => void;
  productView: ProductViewMode;
  products: Product[];
  /** Sentinel value for the promotion tab (e.g. "__promo__"). */
  promoCategory?: string;
  /** IDs of products covered by at least one active promotion. */
  promotionProductIds?: Set<string>;
  /** Sub-chips (one per product-targeting promo), shown under the promo tab. */
  promoChips?: PromoChip[];
  /** Store-wide / bill-level promos, shown as an info strip under the promo tab. */
  promoStoreWide?: Campaign[];
  /** Selected promo sub-chip id (null = all promo products). */
  selectedPromoId?: string | null;
  onPromoSelect?: (promoId: string | null) => void;
  /** productId → short promo badge label rendered on each card. */
  productPromoLabels?: Map<string, string>;
  search: string;
  selectedCategory: string;
  getCartQuantity: (productId: string) => number;
  /** Compact selector/label rendered in the toolbar row (Cases C / D). Null hides it. */
  salePointSlot?: ReactNode;
  /** Replaces the product grid with a blocking state (Case A: no sale points). */
  salePointBlocker?: ReactNode;
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
  onScanDetected,
  productView,
  products,
  promoCategory,
  promotionProductIds,
  promoChips,
  promoStoreWide,
  selectedPromoId = null,
  onPromoSelect,
  productPromoLabels,
  search,
  selectedCategory,
  hideSearch = false,
  salePointSlot,
  salePointBlocker,
}: ProductBrowserProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [page, setPage] = useState(1);

  const [cardSettingsOpen, setCardSettingsOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<CardSettings>(DEFAULT_CARD_SETTINGS);

  useEffect(() => {
    // Instant render from local cache, then reconcile with the server (per-user, cross-device).
    setCardSettings(loadCardSettings());
    const refresh = () => setCardSettings(loadCardSettings());
    window.addEventListener("pos-card-settings-changed", refresh);
    window.addEventListener("storage", refresh);

    let active = true;
    fetchCardSettings()
      .then((res) => {
        if (!active || !res.data) return;
        cacheCardSettings(res.data);
        setCardSettings(res.data);
      })
      .catch(() => {/* offline / unauthenticated → keep local cache */});

    return () => {
      active = false;
      window.removeEventListener("pos-card-settings-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Grid column width is the only size-driven style; the card itself is config-driven.
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_SIZE_MIN[cardSettings.size]}, 1fr))`,
  };

  // Measure how many columns fit → page size = 3 rows worth of cards.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || productView !== "grid") return;
    const minPx = parseInt(CARD_SIZE_MIN[cardSettings.size], 10) || 180;
    const gap = 12; // gap-3
    const measure = () => {
      const w = el.clientWidth;
      setCols(Math.max(1, Math.floor((w + gap) / (minPx + gap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [productView, cardSettings.size]);

  const GRID_ROWS = 3;
  const pageSize =
    productView === "grid" ? Math.max(cols * GRID_ROWS, cols) : PAGE_SIZE_LIST;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = useMemo(
    () => products.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [products, currentPage, pageSize],
  );

  const suggestionProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return [];
    }

    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [products, search]);

  return (
    <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-48 shrink-0 text-2xl font-semibold text-slate-950">
          {dictionary.title}
        </h2>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setCardSettingsOpen(true)}
            aria-label={dictionary.cardSettings}
            title={dictionary.cardSettings}
            className="inline-flex h-[42px] items-center gap-1.5 self-start rounded-lg border border-violet-200 bg-white px-3.5 text-xs font-semibold text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{dictionary.cardSettings}</span>
          </button>
          <div className="inline-flex items-center gap-1 self-start rounded-lg border border-violet-200 bg-white p-1">
            <button
              aria-label={dictionary.productViewGrid}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                productView === "grid"
                  ? "bg-violet-600 text-white"
                  : "text-violet-600 hover:bg-violet-50"
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
                  ? "bg-violet-600 text-white"
                  : "text-violet-600 hover:bg-violet-50"
              }`}
              onClick={() => onProductViewChange("list")}
              title={dictionary.productViewList}
              type="button"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {salePointSlot}
          {!hideSearch && <div className="relative flex w-full items-center gap-2">
            <div className="relative flex-1">
            <input
              className="w-full rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-violet-100 bg-white shadow-xl">
                {suggestionProducts.map((product) => (
                  <button
                    className="flex w-full items-center gap-3 border-b border-violet-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-violet-50"
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    type="button"
                  >
                    {product.image_url ? (
                      <Image
                        alt={product.name}
                        className="h-9 w-12 rounded-lg border border-violet-100 bg-white object-cover"
                        height={36}
                        loading="lazy"
                        src={product.image_url}
                        unoptimized
                        width={48}
                      />
                    ) : (
                      <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-xs font-bold text-slate-500">
                        {product.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dictionary.stockLabel} {product.total_stock ?? 0}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {formatCurrency(product.base_price)}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
            </div>
            {onScanDetected ? (
              <ScanButton
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50/60 text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
                onScan={onScanDetected}
                title={dictionary.scanWithCamera}
              />
            ) : null}
          </div>}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {salePointBlocker ?? (
        <>
      {/* Category filter pills */}
      {(categories.length > 0 || (promoCategory && (promotionProductIds?.size ?? 0) > 0)) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              !selectedCategory
                ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                : "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"
            }`}
            onClick={() => onCategoryFilterChange("")}
            type="button"
          >
            {dictionary.categoryFilterAll}
          </button>
          {/* Promotion tab — shown only when active promotions cover at least one product */}
          {promoCategory && (promotionProductIds?.size ?? 0) > 0 ? (
            <button
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                selectedCategory === promoCategory
                  ? "border-amber-400 bg-amber-500 text-white shadow-sm"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
              onClick={() => onCategoryFilterChange(promoCategory)}
              type="button"
            >
              🏷 โปรโมชั่น ({promotionProductIds!.size})
            </button>
          ) : null}
          {categories.map((category) => (
            <button
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                selectedCategory === category
                  ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                  : "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"
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

      {/* Promo sub-bar — one chip per active promotion + a store-wide info strip */}
      {promoCategory &&
      selectedCategory === promoCategory &&
      ((promoChips?.length ?? 0) > 0 || (promoStoreWide?.length ?? 0) > 0) ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          {(promoChips?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onPromoSelect?.(null)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedPromoId === null
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                }`}
              >
                {dictionary.promo.all}
              </button>
              {promoChips!.map((chip) => {
                const active = selectedPromoId === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onPromoSelect?.(chip.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                        : "border-amber-200 bg-white text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {chip.name}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {(promoStoreWide?.length ?? 0) > 0 ? (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
              <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-semibold">{dictionary.promo.storeWide}:</span>{" "}
                {promoStoreWide!.map((c) => c.name).join(" · ")}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={gridRef}
        className={`pretty-scroll mt-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 ${productView === "grid" ? "grid content-start auto-rows-max gap-3" : "space-y-3"}`}
        style={productView === "grid" ? gridStyle : undefined}
      >
        {pagedProducts.length > 0 ? (
          pagedProducts.map((product) => {
            const currentQuantity = getCartQuantity(product.id);

            return productView === "grid" ? (
              <ProductCard
                key={product.id}
                item={{
                  id: product.id,
                  name: product.name,
                  price: product.base_price,
                  stock: product.total_stock ?? 0,
                  image: product.image_url,
                }}
                config={cardSettings}
                qtyInCart={currentQuantity}
                onAdd={() => onAddToCart(product)}
                labels={{
                  stock: dictionary.stockLabel,
                  outOfStock: dictionary.productOutOfStock,
                  add: dictionary.addButton,
                }}
                promoLabel={productPromoLabels?.get(product.id) ?? null}
              />
            ) : (
              <div
                key={product.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
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
                  <Image
                    alt={product.name}
                    className="h-14 w-20 rounded-lg border border-violet-100 bg-white object-cover"
                    height={56}
                    loading="lazy"
                    src={product.image_url}
                    unoptimized
                    width={80}
                  />
                ) : (
                  <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-sm font-bold text-slate-500">
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
                  {cardSettings.showPromoBadge && productPromoLabels?.get(product.id) ? (
                    <span className="mt-1 inline-block rounded-full border border-amber-300 bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {productPromoLabels.get(product.id)}
                    </span>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      {dictionary.stockLabel} {product.total_stock ?? 0}
                    </span>
                    {currentQuantity > 0 ? (
                      <span className="rounded-full bg-violet-700 px-2 py-0.5 font-semibold text-white">
                        {dictionary.quantityLabel} {currentQuantity}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(product.base_price)}
                  </p>
                  <button
                    className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                    disabled={currentQuantity >= (product.total_stock ?? 0)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product);
                    }}
                    type="button"
                  >
                    {currentQuantity >= (product.total_stock ?? 0)
                      ? dictionary.productOutOfStock
                      : dictionary.addButton}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={productView === "grid" ? "sm:col-span-2 xl:col-span-4" : ""}>
            <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50 px-6 py-10 text-center text-sm text-slate-500">
              {dictionary.emptyProducts}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2.5">
          <span className="text-sm text-slate-500">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, products.length)} / {products.length}
          </span>
          <button
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-violet-200 px-2 text-violet-500 transition hover:bg-violet-50 disabled:opacity-30"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            type="button"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "…")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-300">…</span>
              ) : (
                <button
                  key={p}
                  className={`flex min-h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${currentPage === p ? "bg-violet-600 text-white" : "border border-violet-200 text-slate-600 hover:bg-violet-50"}`}
                  onClick={() => setPage(p as number)}
                  type="button"
                >
                  {p}
                </button>
              )
            )}
          <button
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-violet-200 px-2 text-violet-500 transition hover:bg-violet-50 disabled:opacity-30"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
        </>
      )}

      <CardSettingsModal
        open={cardSettingsOpen}
        onClose={() => setCardSettingsOpen(false)}
        dictionary={dictionary.cardSettingsModal}
      />
    </div>
  );
}
