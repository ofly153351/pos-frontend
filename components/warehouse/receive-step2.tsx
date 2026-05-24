"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, MapPin, Minus, Package, Plus, Search, X } from "lucide-react";

import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { Product } from "@/types/product";
import type { Location } from "@/services/locations";
import type { ReceiveDictionary, ItemFormRow } from "./receive-shared";
import { formatCurrency, formatDateTimeLabel } from "./receive-shared";

export type ReceiveStep2Props = {
  dictionary: ReceiveDictionary;
  filteredProducts: Product[];
  globalLocationId: string;
  isPending: boolean;
  isView: boolean;
  itemRows: Record<string, ItemFormRow>;
  allLocationsCount: number;
  locale: string;
  locations: Location[];
  locationsQueryError: unknown;
  locationsQueryIsError: boolean;
  locationsQueryIsLoading: boolean;
  products: Product[];
  purchaseOrders: { id: string; order_number: string }[];
  receipt: GoodsReceiptDraft;
  receiptId: string;
  rowErrors: Record<string, string>;
  scanCode: string;
  scanFeedback: { tone: "error" | "success"; value: string } | null;
  search: string;
  selectedItemsCount: number;
  selectedPoId: string;
  sessionLocationIds: string[];
  stepLinks: { step1: string; step3: string };
  supplierName: string;
  warehouseName: string;
  onAddLocation: (name: string, code: string) => Promise<void>;
  onAddLocationSession: (locationId: string) => void;
  onBack: () => void;
  onGlobalLocationChange: (locationId: string) => void;
  onImportPo: () => void;
  onItemField: (productId: string, field: keyof ItemFormRow, value: string) => void;
  onPoIdChange: (v: string) => void;
  onRemoveLocationSession: (locationId: string) => void;
  onSave: (nextHref: string) => void;
  onScanChange: (v: string) => void;
  onScanSubmit: () => void;
  onSearchChange: (v: string) => void;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-violet-100 text-violet-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export function ReceiveStep2({
  dictionary,
  filteredProducts,
  globalLocationId,
  isPending,
  isView,
  allLocationsCount,
  itemRows,
  locale,
  locations,
  locationsQueryError,
  locationsQueryIsError,
  locationsQueryIsLoading,
  products,
  purchaseOrders,
  receipt,
  receiptId,
  rowErrors,
  scanCode,
  scanFeedback,
  search,
  selectedItemsCount,
  selectedPoId,
  sessionLocationIds,
  stepLinks,
  supplierName,
  warehouseName,
  onAddLocation: _onAddLocation,
  onAddLocationSession,
  onBack,
  onGlobalLocationChange,
  onImportPo,
  onItemField,
  onPoIdChange,
  onRemoveLocationSession,
  onSave,
  onScanChange,
  onScanSubmit,
  onSearchChange,
}: ReceiveStep2Props) {
  const [locationOverrideId, setLocationOverrideId] = useState<string | null>(null);
  const [showLocPicker, setShowLocPicker] = useState(false);

  const selectedRows = Object.entries(itemRows).filter(([, row]) => Number(row.quantity) > 0);
  const subtotal = selectedRows.reduce((s, [, r]) => s + Number(r.quantity || 0) * Number(r.unitPrice || 0), 0);
  const totalDiscount = selectedRows.reduce((s, [, r]) => s + Number(r.discountValue || 0), 0);
  const netAmount = subtotal - totalDiscount;

  const availableToAdd = locations.filter((l) => !sessionLocationIds.includes(l.id));

  // ── View mode ──────────────────────────────────────────────────────────────
  if (isView) {
    return (
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Package className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">{dictionary.step2Title}</h2>
        </div>
        {receipt.items.length ? (
          <div className="overflow-x-auto rounded-2xl border border-violet-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelProduct}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelLocation}</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">{dictionary.labelQuantity}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelUnitPrice}</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id} className="border-b border-violet-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        <MapPin className="h-3 w-3" />
                        {item.location_name ?? item.location_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
            {dictionary.emptyProducts}
          </div>
        )}
      </section>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  // Items belonging to the active location tab
  const activeTabRows = selectedRows.filter(([, row]) => row.locationId === globalLocationId);
  const activeTabSubtotal = activeTabRows.reduce((s, [, r]) => s + Number(r.quantity || 0) * Number(r.unitPrice || 0), 0);
  const activeTabDiscount = activeTabRows.reduce((s, [, r]) => s + Number(r.discountValue || 0), 0);
  const activeTabNet = activeTabSubtotal - activeTabDiscount;

  const activeLocObj = locations.find((l) => l.id === globalLocationId);

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      {/* Receipt summary bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-violet-100 px-6 py-3">
        <span className="font-mono text-sm font-bold text-slate-900">{receipt.document_no}</span>
        <span className="text-sm text-slate-600">{warehouseName}</span>
        {receipt.supplier_id && <span className="text-sm text-slate-500">{supplierName}</span>}
        <span className="text-sm text-slate-500">{formatDateTimeLabel(receipt.received_at)}</span>
        <StatusBadge status={receipt.status} />
        <Link
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
          href={`/${locale}/warehouse/receive/${receiptId}/step-1`}
        >
          {dictionary.actionEditDraft}
        </Link>
      </div>

      <div className="px-6 pt-5 pb-0">
        <div className="mb-5 flex items-center gap-3">
          <Package className="h-5 w-5 text-violet-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{dictionary.step2Title}</h2>
            <p className="text-sm text-slate-500">{dictionary.helperStep2}</p>
          </div>
        </div>

        {/* ── Location tabs ── */}
        {locationsQueryIsLoading ? (
          <div className="flex items-end gap-1 border-b border-violet-200 pb-0">
            <div className="h-9 w-28 animate-pulse rounded-t-xl bg-violet-100" />
            <div className="h-9 w-20 animate-pulse rounded-t-xl bg-violet-50" />
          </div>
        ) : locationsQueryIsError ? (
          <p className="mb-4 text-sm text-rose-600">{locationsQueryError instanceof Error ? locationsQueryError.message : dictionary.stateLoadingLocations}</p>
        ) : locations.length === 0 ? (
          <p className="mb-4 text-sm text-amber-700">{allLocationsCount > 0 ? dictionary.validationWarehouseOnlySalePoints : dictionary.validationWarehouseWithoutLocations}</p>
        ) : (
          <div className="flex items-end gap-1 border-b border-violet-200">
            {sessionLocationIds.map((locId) => {
              const loc = locations.find((l) => l.id === locId);
              if (!loc) return null;
              const isActive = locId === globalLocationId;
              const tabItemCount = selectedRows.filter(([, r]) => r.locationId === locId).length;
              return (
                <div
                  key={locId}
                  className={`group relative flex items-center gap-2 rounded-t-xl border border-b-0 px-3.5 py-2.5 text-sm font-medium transition-colors
                    ${isActive
                      ? "border-violet-200 bg-white text-violet-700 z-10 -mb-px"
                      : "border-transparent bg-violet-50/70 text-slate-500 hover:bg-violet-100/70 hover:text-slate-700 cursor-pointer"
                    }`}
                >
                  <button
                    className="flex items-center gap-2 outline-none"
                    disabled={isActive}
                    onClick={() => onGlobalLocationChange(locId)}
                    type="button"
                  >
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-violet-500" : "text-slate-400"}`} />
                    <span>{loc.name}{loc.code ? ` · ${loc.code}` : ""}</span>
                    {tabItemCount > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${isActive ? "bg-violet-100 text-violet-700" : "bg-slate-200/80 text-slate-500"}`}>
                        {tabItemCount}
                      </span>
                    )}
                  </button>
                  {sessionLocationIds.length > 1 && (
                    <button
                      className={`ml-0.5 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100 ${isActive ? "hover:bg-violet-100 text-violet-400 hover:text-violet-700" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"}`}
                      onClick={(e) => { e.stopPropagation(); onRemoveLocationSession(locId); }}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* + add location tab */}
            {availableToAdd.length > 0 && (
              <div className="relative mb-1 ml-1">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-dashed border-violet-300 bg-white text-violet-400 transition hover:border-violet-500 hover:bg-violet-50 hover:text-violet-600"
                  onClick={() => setShowLocPicker((v) => !v)}
                  title={dictionary.addLocationLabel}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showLocPicker && (
                  <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-violet-200 bg-white shadow-lg">
                    {availableToAdd.map((loc) => (
                      <button
                        key={loc.id}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50 first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => { onAddLocationSession(loc.id); setShowLocPicker(false); }}
                        type="button"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="font-medium">{loc.name}</span>
                        {loc.code && <span className="ml-auto font-mono text-xs text-slate-400">{loc.code}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tab content ── */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── LEFT: Items for active location ── */}
          <div className="flex flex-col gap-4">
            {activeLocObj && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 text-violet-400" />
                <span>สินค้าที่เพิ่มจะบันทึกที่ <strong className="text-violet-700">{activeLocObj.name}</strong></span>
              </div>
            )}

            {activeTabRows.length > 0 ? (
              <div>
                <div className="space-y-2">
                  {activeTabRows.map(([productId, row], rowIndex) => {
                    const product = products.find((p) => p.id === productId);
                    if (!product) return null;
                    const qty = Number(row.quantity || 0);
                    const price = Number(row.unitPrice || 0);
                    const discount = Number(row.discountValue || 0);
                    const lineTotal = qty * price - discount;
                    const isOverrideOpen = locationOverrideId === productId;

                    return (
                      <div
                        key={productId}
                        className={`rounded-2xl border px-4 py-3 ${rowErrors[productId] ? "border-rose-200 bg-rose-50/40" : "border-violet-100 bg-white"}`}
                      >
                        {/* Row 1: index · name · qty stepper · delete */}
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                            {rowIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">{product.name}</p>
                            <p className="truncate text-xs text-slate-500">{product.sku || "—"}{product.product_unit_name ? ` · ${product.product_unit_name}` : ""}</p>
                          </div>
                          {/* Qty stepper */}
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 text-violet-700 transition hover:bg-violet-50 disabled:opacity-40"
                              disabled={qty <= 1}
                              onClick={() => onItemField(productId, "quantity", String(qty - 1))}
                              type="button"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              className="w-14 rounded-lg border border-violet-200 bg-white py-1.5 text-center text-sm font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              min="1"
                              onChange={(e) => onItemField(productId, "quantity", e.target.value)}
                              type="number"
                              value={row.quantity}
                            />
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 text-violet-700 transition hover:bg-violet-50"
                              onClick={() => onItemField(productId, "quantity", String(qty + 1))}
                              type="button"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                            onClick={() => onItemField(productId, "quantity", "0")}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Row 2: prices + move location */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 pl-9">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{dictionary.labelUnitPrice}</span>
                            <input
                              className="w-24 rounded-lg border border-violet-200 bg-white px-2 py-1 text-right text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              min="0"
                              onChange={(e) => onItemField(productId, "unitPrice", e.target.value)}
                              step="0.01"
                              type="number"
                              value={row.unitPrice}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{dictionary.labelDiscount}</span>
                            <input
                              className="w-20 rounded-lg border border-violet-200 bg-white px-2 py-1 text-right text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              min="0"
                              onChange={(e) => onItemField(productId, "discountValue", e.target.value)}
                              step="0.01"
                              type="number"
                              value={row.discountValue}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{dictionary.labelLineTotal}</span>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(lineTotal)}</span>
                          </div>
                          {sessionLocationIds.length > 1 && (
                            <button
                              className="ml-auto inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600 transition hover:border-violet-300 hover:bg-violet-100"
                              onClick={() => setLocationOverrideId(isOverrideOpen ? null : productId)}
                              type="button"
                            >
                              <MapPin className="h-3 w-3" />
                              ย้าย location
                            </button>
                          )}
                          {isOverrideOpen && (
                            <select
                              autoFocus
                              className="rounded-xl border border-violet-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              onChange={(e) => { onItemField(productId, "locationId", e.target.value); setLocationOverrideId(null); }}
                              value={row.locationId}
                            >
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.name}{loc.code ? ` (${loc.code})` : ""}</option>
                              ))}
                            </select>
                          )}
                          {rowErrors[productId] && <p className="w-full text-xs text-rose-600">{rowErrors[productId]}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals for active tab */}
                <div className="mt-3 flex flex-wrap justify-end gap-5 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-3 text-sm">
                  <span className="text-slate-600">{dictionary.labelSubtotal}: <strong className="text-slate-900">{formatCurrency(activeTabSubtotal)}</strong></span>
                  <span className="text-slate-600">{dictionary.labelDiscount}: <strong className="text-slate-900">{formatCurrency(activeTabDiscount)}</strong></span>
                  <span className="text-slate-600">{dictionary.labelNetAmount}: <strong className="text-slate-900">{formatCurrency(activeTabNet)}</strong></span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-4 py-12 text-center text-sm text-slate-400">
                <MapPin className="mx-auto mb-2 h-6 w-6 text-violet-200" />
                {activeLocObj ? `ยังไม่มีสินค้าที่บันทึกที่ ${activeLocObj.name}` : dictionary.emptyProducts}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                onClick={onBack}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                {dictionary.actionBack}
              </button>
              <div className="flex items-center gap-3">
                {selectedItemsCount > 0 && (
                  <span className="text-xs text-slate-500">
                    รวมทั้งหมด <strong className="text-slate-800">{selectedItemsCount}</strong> รายการ · {formatCurrency(subtotal)}
                  </span>
                )}
                <button
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  disabled={isPending}
                  onClick={() => onSave(stepLinks.step3)}
                  type="button"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isPending ? dictionary.actionSaving : dictionary.actionSaveAndContinue}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Product browse (sticky) ── */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{dictionary.labelAllProducts}</h3>

              {/* Search + Scan */}
              <div className="mb-3 flex flex-col gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={dictionary.placeholderSearchProducts}
                    value={search}
                  />
                </div>
                <input
                  className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => onScanChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScanSubmit(); } }}
                  placeholder={dictionary.placeholderScanCode}
                  value={scanCode}
                />
              </div>

              {/* PO import */}
              {purchaseOrders.length > 0 && (
                <div className="mb-3 flex gap-2">
                  <select
                    className="flex-1 rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onChange={(e) => onPoIdChange(e.target.value)}
                    value={selectedPoId}
                  >
                    <option value="">Import from PO</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>{po.order_number}</option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={onImportPo}
                    type="button"
                  >
                    Import
                  </button>
                </div>
              )}

              {/* Scan feedback */}
              {scanFeedback && (
                <div className={`mb-3 rounded-2xl border px-3 py-2 text-sm ${scanFeedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {scanFeedback.value}
                </div>
              )}

              {/* Product list */}
              {filteredProducts.length ? (
                <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-0.5">
                  {filteredProducts.map((product) => {
                    const currentQty = Number(itemRows[product.id]?.quantity || 0);
                    const isSelected = currentQty > 0;
                    // Show which tab this product is in
                    const productLocId = itemRows[product.id]?.locationId;
                    const productLoc = isSelected ? locations.find((l) => l.id === productLocId) : null;
                    const isInActiveTab = productLocId === globalLocationId;

                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${isSelected ? "border-violet-200 bg-white" : "border-transparent bg-white hover:border-violet-100"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sku || "—"}{product.product_unit_name ? ` · ${product.product_unit_name}` : ""}</p>
                          {isSelected && productLoc && !isInActiveTab && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <MapPin className="h-2.5 w-2.5" />
                              {productLoc.name}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isSelected && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isInActiveTab ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>×{currentQty}</span>
                          )}
                          {isSelected ? (
                            <>
                              <button
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50"
                                onClick={() => onItemField(product.id, "quantity", String(currentQty - 1))}
                                type="button"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50"
                                onClick={() => onItemField(product.id, "quantity", String(currentQty + 1))}
                                type="button"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-white font-bold text-violet-600 hover:bg-violet-50"
                              onClick={() => onItemField(product.id, "quantity", "1")}
                              type="button"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  {dictionary.emptyProducts}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
