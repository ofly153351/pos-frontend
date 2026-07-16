"use client";

import { useEffect, useState } from "react";
import {
  Barcode, Check, Copy, Download, MapPin,
  Pencil, Printer, Rows2, Rows3, Rows4, SlidersHorizontal, Trash2, X,
} from "lucide-react";
import { DEFAULT_LABEL_FLAGS } from "@/lib/barcode";
import { printBarcodeBatch } from "@/lib/label";

import type { ManagementDictionary, StockManagerDictionary } from "@/components/stock/types";
import type { Product, ProductType } from "@/types/product";
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
  /** Open the (single) Barcode Center for one product. */
  onBarcode?: (product: Product) => void;
  /** Open the Barcode Center in batch mode for many products. */
  onBulkBarcode?: (products: Product[]) => void;
  /** Open the Product Detail page (whole-row click). */
  onRowClick?: (product: Product) => void;
  /** When false, the per-row Adjust-stock action is hidden (product master list). */
  showStockActions?: boolean;
  products: Product[];
  productTypes?: ProductType[];
  onBulkEnable?: (ids: string[]) => void;
  onBulkDisable?: (ids: string[]) => void;
  onBulkCategoryChange?: (ids: string[], categoryId: string) => void;
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
  tableDictionary: StockManagerDictionary["table"];
};

// ── Density ───────────────────────────────────────────────────────────────────

type Density = "comfortable" | "compact" | "warehouse";
const DENSITY: Record<Density, { rowPad: string; img: string; nameText: string }> = {
  comfortable: { rowPad: "py-4", img: "h-12 w-12", nameText: "text-sm md:text-[15px]" },
  compact: { rowPad: "py-2.5", img: "h-10 w-10", nameText: "text-sm" },
  warehouse: { rowPad: "py-1.5", img: "h-9 w-9", nameText: "text-[13px]" },
};
const DENSITY_ICON: Record<Density, typeof Rows2> = { comfortable: Rows2, compact: Rows3, warehouse: Rows4 };

// ── Stock helpers ─────────────────────────────────────────────────────────────

type Health = "ready" | "low" | "out" | "unknown";

function getStockHealth(p: Product): Health {
  const s = p.total_stock;
  if (s == null) return "unknown";
  if (s <= 0) return "out";
  if (p.min_stock != null && p.min_stock > 0 && s <= p.min_stock) return "low";
  return "ready";
}

function getStockPercent(p: Product): number {
  const s = p.total_stock ?? 0;
  if (s <= 0) return 0;
  if (p.max_stock != null && p.max_stock > 0) return Math.max(4, Math.min(100, Math.round((s / p.max_stock) * 100)));
  if (p.min_stock != null && p.min_stock > 0) return Math.max(4, Math.min(100, Math.round((s / (p.min_stock * 2)) * 100)));
  return 100;
}

const HEALTH_BAR: Record<Exclude<Health, "unknown">, string> = {
  ready: "bg-emerald-500", low: "bg-amber-500", out: "bg-rose-400",
};

function locationParts(s?: string | null): { primary: string; rest: string } | null {
  const raw = s?.trim();
  if (!raw) return null;
  const parts = raw.split(/[·/>]/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return null;
  return { primary: parts[parts.length - 1], rest: parts.slice(0, -1).join(" · ") };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductsTable({
  emptyState,
  isPending,
  onDelete,
  onDeleteMany,
  onEdit,
  onAdjustStock,
  onExport,
  onBarcode,
  onBulkBarcode,
  onRowClick,
  showStockActions = true,
  products,
  productTypes,
  onBulkEnable,
  onBulkDisable,
  onBulkCategoryChange,
  receiveDictionary,
  tableDictionary,
}: ProductsTableProps) {
  const t = tableDictionary;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");
  const [changeCategoryOpen, setChangeCategoryOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Restore density preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos-table-density");
      if (saved === "comfortable" || saved === "compact" || saved === "warehouse") setDensity(saved);
    } catch { /* ignore */ }
  }, []);

  function changeDensity(d: Density) {
    setDensity(d);
    try { localStorage.setItem("pos-table-density", d); } catch { /* ignore */ }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("th-TH", {
      currency: "THB", maximumFractionDigits: 0, minimumFractionDigits: 0, style: "currency",
    }).format(value);
  }

  function copyBarcode(p: Product) {
    const v = (p.barcode ?? p.sku ?? "").trim();
    if (!v) return;
    navigator.clipboard.writeText(v).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
    });
  }

  const pad = DENSITY[density].rowPad;
  const imgSize = DENSITY[density].img;
  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const allSelected = products.length > 0 && selectedIds.size === products.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function statusBadge(p: Product) {
    if (!p.is_active) return { label: t.statusInactive, cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
    const h = getStockHealth(p);
    if (h === "out") return { label: t.statusOut, cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" };
    if (h === "low") return { label: t.statusLow, cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
    return { label: t.statusReady, cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  }

  function bulkPrintBarcode() {
    const withCode = selectedProducts.filter((p) => p.barcode || p.sku);
    if (withCode.length === 0) return;
    if (onBulkBarcode) { onBulkBarcode(withCode); return; }
    printBarcodeBatch(
      withCode.map((p) => ({
        name: p.name, sku: p.sku ?? null, barcode: p.barcode ?? null, price: p.base_price,
        location: p.storage_location ?? null,
        category: p.product_type_name ?? p.product_type?.name ?? null, brand: p.brand_name ?? null,
      })),
      "medium",
      DEFAULT_LABEL_FLAGS,
    );
  }

  return (
    <>
      <section className="rounded-2xl bg-white shadow-sm">
        {/* Density toolbar */}
        <div className="flex items-center justify-end gap-2 border-b border-slate-100 px-4 py-2">
          <span className="text-xs font-semibold text-slate-400">{t.densityLabel}</span>
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
            {(["comfortable", "compact", "warehouse"] as Density[]).map((d) => {
              const Icon = DENSITY_ICON[d];
              const label = d === "comfortable" ? t.densityComfortable : d === "compact" ? t.densityCompact : t.densityWarehouse;
              return (
                <button
                  key={d}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={density === d}
                  onClick={() => changeDensity(d)}
                  className={`rounded-md px-2 py-1.5 transition ${density === d ? "bg-violet-600 text-white" : "text-violet-700 hover:bg-violet-50"}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll container with sticky header */}
        <div className="overflow-auto rounded-b-2xl" style={{ maxHeight: "68vh" }}>
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "4%" }} /><col style={{ width: "5%" }} /><col style={{ width: "16%" }} />
              <col style={{ width: "11%" }} /><col style={{ width: "9%" }} /><col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} /><col style={{ width: "13%" }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 text-xs md:text-[13px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 text-center">
                  <input
                    aria-label="Select all"
                    checked={allSelected}
                    className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
                    onChange={toggleAll}
                    type="checkbox"
                  />
                </th>
                <th className="px-3 py-3.5 text-center font-bold" aria-label="image" />
                <th className="px-4 py-3.5 font-bold">{t.productDetails}</th>
                <th className="px-4 py-3.5 font-bold">{t.barcode}</th>
                <th className="px-4 py-3.5 font-bold">{t.category}</th>
                <th className="px-3 py-3.5 font-bold">{t.costPrice}</th>
                <th className="px-3 py-3.5 font-bold">{t.sellingPrice}</th>
                <th className="px-4 py-3.5 font-bold">{t.stock}</th>
                <th className="px-4 py-3.5 font-bold">{t.location}</th>
                <th className="px-4 py-3.5 font-bold">{t.status}</th>
                <th className="px-2 py-3.5 text-right font-bold">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending && products.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-4 bg-slate-100" /></td>
                    <td className="px-3 py-3"><Skeleton className="mx-auto h-10 w-10 rounded-lg bg-slate-200" /></td>
                    <td className="px-4 py-3"><Skeleton className="mb-1.5 h-4 w-36 bg-slate-200" /><Skeleton className="h-3 w-20 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-14 bg-slate-100" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-12 bg-slate-100" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-12 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-full bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full bg-slate-100" /></td>
                    <td className="px-2 py-3"><Skeleton className="h-7 w-7 rounded-lg bg-slate-100" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={11}>{emptyState}</td></tr>
              ) : null}

              {products.map((product, index) => {
                const health = getStockHealth(product);
                const unit = product.product_unit_name ?? "";
                const loc = locationParts(product.storage_location);
                const status = statusBadge(product);
                const code = product.barcode ?? product.sku ?? null;
                return (
                  <tr
                    key={product.id}
                    onClick={() => onRowClick?.(product)}
                    className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group cursor-pointer transition hover:bg-violet-50/40 ${selectedIds.has(product.id) ? "bg-violet-50/60" : ""}`}
                  >
                    {/* Select — clicking here must not navigate */}
                    <td className={`px-4 ${pad} text-center`} onClick={(e) => e.stopPropagation()}>
                      <input
                        aria-label={`Select ${product.name}`}
                        checked={selectedIds.has(product.id)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
                        onChange={() => toggleOne(product.id)}
                        type="checkbox"
                      />
                    </td>
                    {/* Image */}
                    <td className={`px-3 ${pad} text-center`}>
                      {product.image_url ? (
                        <img alt={product.name} className={`mx-auto ${imgSize} rounded-lg border border-slate-200 bg-slate-100 object-cover`} loading="lazy" src={product.image_url} />
                      ) : (
                        <div className={`mx-auto flex ${imgSize} items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500`}>
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    {/* Product: name + SKU badge */}
                    <td className={`px-4 ${pad}`}>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className={`overflow-hidden break-all ${DENSITY[density].nameText} font-bold leading-[1.5] text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]`} title={product.name}>
                          {product.name}
                        </span>
                        {product.sku ? (
                          <span className="inline-flex w-fit max-w-full items-center truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500" title={product.sku}>
                            {product.sku}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {/* Barcode + copy */}
                    <td className={`px-4 ${pad}`}>
                      {code ? (
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate text-[13px] text-slate-600" title={code}>{code}</span>
                          <button
                            type="button"
                            title={copiedId === product.id ? t.copied : t.copy}
                            aria-label={t.copy}
                            onClick={(e) => { e.stopPropagation(); copyBarcode(product); }}
                            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                          >
                            {copiedId === product.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300">{t.noLocation}</span>
                      )}
                    </td>
                    {/* Category */}
                    <td className={`px-4 ${pad}`}>
                      {product.product_type_name ?? product.product_type?.name ? (
                        <span className="inline-block max-w-full truncate rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700" title={product.product_type_name ?? product.product_type?.name ?? ""}>
                          {product.product_type_name ?? product.product_type?.name}
                        </span>
                      ) : (
                        <span className="text-slate-300">{t.noLocation}</span>
                      )}
                    </td>
                    {/* Cost price */}
                    <td className={`px-3 ${pad} text-sm font-semibold text-slate-600`}>
                      {product.cost_price != null ? formatCurrency(Number(product.cost_price)) : "-"}
                    </td>
                    {/* Selling price */}
                    <td className={`px-3 ${pad} text-sm font-bold text-violet-700`}>
                      {formatCurrency(Number(product.base_price ?? 0))}
                    </td>
                    {/* Stock: qty + bar + % */}
                    <td className={`px-4 ${pad}`}>
                      {product.total_stock != null ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`text-sm font-bold ${health === "out" ? "text-rose-700" : health === "low" ? "text-amber-700" : "text-slate-900"}`}>
                              {product.max_stock != null ? `${product.total_stock} / ${product.max_stock}` : `${product.total_stock}${unit ? ` ${unit}` : ""}`}
                            </span>
                            {product.max_stock != null ? (
                              <span className="text-[11px] font-semibold text-slate-400">{getStockPercent(product)}%</span>
                            ) : null}
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                            <div className={`h-full rounded-full transition-all ${health === "unknown" ? "bg-slate-300" : HEALTH_BAR[health]}`} style={{ width: `${getStockPercent(product)}%` }} />
                          </div>
                          {product.min_stock != null && product.min_stock > 0 ? (
                            <span className="text-[10px] text-slate-400">Min {product.min_stock}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-300">{t.noLocation}</span>
                      )}
                    </td>
                    {/* Location (dedicated) */}
                    <td className={`px-4 ${pad}`}>
                      {loc ? (
                        <div className="flex min-w-0 items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden="true" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-bold text-slate-700" title={product.storage_location ?? ""}>{loc.primary}</span>
                            {loc.rest ? <span className="truncate text-[11px] text-slate-400" title={loc.rest}>{loc.rest}</span> : null}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">{t.noLocation}</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className={`px-4 ${pad}`}>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    {/* Actions — visible icon buttons; never trigger row navigation */}
                    <td className={`px-2 ${pad}`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={t.barcodeAction}
                          aria-label={t.barcodeAction}
                          disabled={!code}
                          onClick={() => onBarcode?.(product)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                        >
                          <Barcode className="h-[18px] w-[18px]" />
                        </button>
                        {showStockActions ? (
                          <button
                            type="button"
                            title={t.receiveAction}
                            aria-label={t.receiveAction}
                            onClick={() => onAdjustStock(product)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                          >
                            <SlidersHorizontal className="h-[18px] w-[18px]" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title={t.editAction}
                          aria-label={t.editAction}
                          onClick={() => onEdit(product)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                        >
                          <Pencil className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sticky floating bulk action bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 smooth-fade-up">
          <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-3 py-2.5 shadow-2xl">
            <span className="px-2 text-sm font-semibold text-slate-700">
              <strong className="text-violet-700">{selectedIds.size}</strong> {t.selectedSuffix}
            </span>
            <span className="h-6 w-px bg-slate-200" />
            <button type="button" onClick={bulkPrintBarcode}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">
              <Printer className="h-4 w-4" /> {t.printBarcodeAction}
            </button>
            <button type="button" onClick={() => onExport(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
              <Download className="h-4 w-4" /> {t.exportLabel}
            </button>
            {showStockActions ? (
              <button type="button" onClick={() => setIsReceiveModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                {t.receiveAction}
              </button>
            ) : null}
            {onBulkEnable ? (
              <button type="button" onClick={() => { onBulkEnable(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                {t.bulkEnableLabel ?? "เปิดใช้"}
              </button>
            ) : null}
            {onBulkDisable ? (
              <button type="button" onClick={() => { onBulkDisable(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                {t.bulkDisableLabel ?? "ปิดใช้"}
              </button>
            ) : null}
            {onBulkCategoryChange && productTypes && productTypes.length > 0 ? (
              <button type="button" onClick={() => setChangeCategoryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                {t.bulkChangeCategoryLabel ?? "เปลี่ยนหมวดหมู่"}
              </button>
            ) : null}
            <button type="button" onClick={() => setConfirmDeleteIds(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> {t.deleteAction}
            </button>
            <button type="button" aria-label={t.clearSelection} title={t.clearSelection}
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Change Category mini-modal */}
      {changeCategoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center" onClick={() => setChangeCategoryOpen(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 font-bold text-slate-900">{t.changeCategoryTitle ?? "เปลี่ยนหมวดหมู่"}</p>
            <select
              className="w-full rounded-lg border border-violet-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">{t.changeCategorySelectPlaceholder ?? "เลือกหมวดหมู่..."}</option>
              {productTypes?.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setChangeCategoryOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!selectedCategoryId}
                onClick={() => {
                  if (selectedCategoryId && onBulkCategoryChange) {
                    onBulkCategoryChange(Array.from(selectedIds), selectedCategoryId);
                    setChangeCategoryOpen(false);
                    setSelectedCategoryId("");
                    setSelectedIds(new Set());
                  }
                }}
                className="rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.changeCategoryApply ?? "นำไปใช้"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isReceiveModalOpen ? (
        <StockReceiveModal
          dictionary={receiveDictionary}
          onClose={() => setIsReceiveModalOpen(false)}
          onComplete={() => { setIsReceiveModalOpen(false); setSelectedIds(new Set()); }}
          products={products}
          selectedIds={selectedIds}
        />
      ) : null}

      <ConfirmDialog
        cancelLabel={t.cancel}
        confirmLabel={t.deleteAction}
        danger
        icon={<Trash2 className="h-5 w-5 text-rose-600" />}
        isOpen={confirmDeleteIds !== null}
        onCancel={() => setConfirmDeleteIds(null)}
        onConfirm={() => {
          if (confirmDeleteIds) {
            if (confirmDeleteIds.length === 1) onDelete(confirmDeleteIds[0]);
            else { onDeleteMany(confirmDeleteIds); setSelectedIds(new Set()); }
            setConfirmDeleteIds(null);
          }
        }}
        title={confirmDeleteIds?.length === 1 ? t.deleteConfirmTitle : t.deleteConfirmTitleMany.replace("{n}", String(confirmDeleteIds?.length ?? 0))}
      >
        <p className="text-sm text-slate-600">
          {confirmDeleteIds?.length === 1
            ? t.deleteConfirmBody
            : t.deleteConfirmBodyMany.replace("{n}", String(confirmDeleteIds?.length ?? 0))}
        </p>
      </ConfirmDialog>
    </>
  );
}
