"use client";

import { useState } from "react";
import { Barcode, Eye, MapPin, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/product";

/**
 * ProductCardGrid — Card view for the Product List (master data).
 * Uses the existing violet design system. Read-only stock display only;
 * stock adjustment is NOT available here (belongs to the Stock module).
 *
 * Layout hierarchy: active status → image → name → sku → tags →
 * stock status → progress bar → price → quantity → storage location → actions.
 */

export type ProductCardLabels = {
  sku: string;
  category: string;
  brand: string;
  stock: string;
  stockReady: string;
  lowStock: string;
  outOfStock: string;
  statusActive: string;
  statusInactive: string;
  viewAction: string;
  barcodeAction: string;
  editAction: string;
  deleteAction: string;
};

type ProductCardGridProps = {
  products: Product[];
  isPending: boolean;
  emptyState: string;
  labels: ProductCardLabels;
  onView: (product: Product) => void;
  onBarcode: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

type StockHealth = "ready" | "low" | "out" | "unknown";

function getStockHealth(product: Product): StockHealth {
  const stock = product.total_stock;
  if (stock == null) return "unknown";
  if (stock <= 0) return "out";
  if (product.min_stock != null && product.min_stock > 0 && stock <= product.min_stock) return "low";
  return "ready";
}

/** Percentage fill for the stock bar (0–100). Prefers max_stock, falls back to a
 * min-stock heuristic so the bar still conveys "healthy vs low" without a max. */
function getStockPercent(product: Product): number {
  const stock = product.total_stock ?? 0;
  if (stock <= 0) return 0;
  if (product.max_stock != null && product.max_stock > 0) {
    return Math.max(6, Math.min(100, Math.round((stock / product.max_stock) * 100)));
  }
  if (product.min_stock != null && product.min_stock > 0) {
    return Math.max(6, Math.min(100, Math.round((stock / (product.min_stock * 2)) * 100)));
  }
  return 100;
}

const HEALTH_STYLES: Record<Exclude<StockHealth, "unknown">, { dot: string; text: string; bg: string; bar: string }> = {
  ready: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100", bar: "bg-emerald-500" },
  low: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100", bar: "bg-amber-500" },
  out: { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-100", bar: "bg-rose-400" },
};

export function ProductCardGrid({
  products,
  isPending,
  emptyState,
  labels,
  onView,
  onBarcode,
  onEdit,
  onDelete,
}: ProductCardGridProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Denser grid: up to 6 columns on very large screens.
  const gridClass =
    "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

  if (isPending && products.length === 0) {
    return (
      <div className={gridClass}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
            <div className="flex items-start gap-3 p-3 pb-2">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-3/4 bg-slate-200" />
                <Skeleton className="h-3 w-1/2 bg-slate-100" />
              </div>
            </div>
            <div className="space-y-2 px-3 pb-3">
              <Skeleton className="h-5 w-1/3 bg-slate-100" />
              <Skeleton className="h-1.5 w-full bg-slate-100" />
              <Skeleton className="h-6 w-1/2 bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-6 py-12 text-center text-sm text-slate-500">
        {emptyState}
      </div>
    );
  }

  return (
    <>
      <div className={gridClass}>
        {products.map((product) => {
          const health = getStockHealth(product);
          const stock = product.total_stock;
          const unit = product.product_unit_name ?? "";
          const categoryName = product.product_type_name ?? product.product_type?.name ?? null;
          const brandName = product.brand_name ?? null;
          const location = product.storage_location?.trim() || null;
          const statusStyle = health === "unknown" ? HEALTH_STYLES.ready : HEALTH_STYLES[health];
          const stockLabel =
            health === "out"
              ? labels.outOfStock
              : health === "low"
                ? labels.lowStock
                : labels.stockReady;

          return (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
            >
              {/* Header: small icon left + name/sku right + active badge */}
              <div className="flex items-start gap-3 p-3 pb-2">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-slate-100">
                  {product.image_url ? (
                    <img
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={product.image_url}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs font-black text-violet-400">
                        {product.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-bold leading-[1.6] text-slate-900" title={product.name}>
                    {product.name}
                  </h3>
                  {product.sku ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400" title={product.sku}>
                      {product.sku}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 pt-0.5">
                  {product.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {labels.statusActive}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {labels.statusInactive}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                {/* Category / brand tags */}
                {categoryName || brandName ? (
                  <div className="flex flex-wrap gap-1">
                    {categoryName ? (
                      <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        {categoryName}
                      </span>
                    ) : null}
                    {brandName ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {brandName}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Stock status badge + progress bar */}
                {stock != null ? (
                  <div className="space-y-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                      {stockLabel}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <div
                        className={`h-full rounded-full transition-all ${statusStyle.bar}`}
                        style={{ width: `${getStockPercent(product)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Price + quantity */}
                <div className="flex items-end justify-between gap-2 pt-0.5">
                  <p className="text-lg font-bold leading-none text-violet-700">
                    {formatCurrency(Number(product.base_price ?? 0))}
                  </p>
                  {stock != null ? (
                    <p className="text-xs font-medium text-slate-500">
                      {labels.stock} {stock}
                      {unit ? ` ${unit}` : ""}
                    </p>
                  ) : null}
                </div>

                {/* Storage location (optional) */}
                {location ? (
                  <p className="flex items-center gap-1 truncate text-[11px] text-slate-400" title={location}>
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{location}</span>
                  </p>
                ) : null}

                {/* Actions */}
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                  <button
                    aria-label={labels.viewAction}
                    title={labels.viewAction}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                    onClick={() => onView(product)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={labels.barcodeAction}
                    title={labels.barcodeAction}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                    onClick={() => onBarcode(product)}
                    type="button"
                  >
                    <Barcode className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={labels.editAction}
                    title={labels.editAction}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                    onClick={() => onEdit(product)}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={labels.deleteAction}
                    title={labels.deleteAction}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    onClick={() => setConfirmDeleteId(product.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={labels.deleteAction}
        danger
        icon={<Trash2 className="h-5 w-5 text-rose-600" />}
        isOpen={confirmDeleteId !== null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        title="Delete product"
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
