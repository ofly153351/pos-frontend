"use client";

import { ArrowLeft, Loader2, Package, Search } from "lucide-react";

import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { Product } from "@/types/product";
import type { Location } from "@/services/locations";
import type { ReceiveDictionary, ItemFormRow } from "./receive-shared";
import { formatCurrency, formatNumber } from "./receive-shared";

export type ReceiveStep2Props = {
  dictionary: ReceiveDictionary;
  filteredLocations: Location[];
  filteredProducts: Product[];
  isPending: boolean;
  isView: boolean;
  itemRows: Record<string, ItemFormRow>;
  locations: Location[];
  locationsQueryError: unknown;
  locationsQueryIsError: boolean;
  locationsQueryIsLoading: boolean;
  products: Product[];
  purchaseOrders: { id: string; order_number: string }[];
  receipt: GoodsReceiptDraft;
  rowErrors: Record<string, string>;
  scanCode: string;
  scanFeedback: { tone: "error" | "success"; value: string } | null;
  search: string;
  selectedFloor: string;
  selectedItemsCount: number;
  selectedPoId: string;
  selectedZone: string;
  stepLinks: { step1: string; step3: string };
  onBack: () => void;
  onFloorChange: (v: string) => void;
  onImportPo: () => void;
  onItemField: (productId: string, field: keyof ItemFormRow, value: string) => void;
  onPoIdChange: (v: string) => void;
  onSave: (nextHref: string) => void;
  onScanChange: (v: string) => void;
  onScanSubmit: () => void;
  onSearchChange: (v: string) => void;
  onZoneChange: (v: string) => void;
};

export function ReceiveStep2({
  dictionary,
  filteredLocations,
  filteredProducts,
  isPending,
  isView,
  itemRows,
  locations,
  locationsQueryError,
  locationsQueryIsError,
  locationsQueryIsLoading,
  products,
  purchaseOrders,
  receipt,
  rowErrors,
  scanCode,
  scanFeedback,
  search,
  selectedFloor,
  selectedItemsCount,
  selectedPoId,
  selectedZone,
  stepLinks,
  onBack,
  onFloorChange,
  onImportPo,
  onItemField,
  onPoIdChange,
  onSave,
  onScanChange,
  onScanSubmit,
  onSearchChange,
  onZoneChange,
}: ReceiveStep2Props) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Package className="h-5 w-5 text-violet-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{dictionary.step2Title}</h2>
          <p className="text-sm text-slate-500">{dictionary.helperStep2}</p>
        </div>
      </div>

      {isView ? (
        receipt.items.length ? (
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
                    <td className="px-4 py-3 text-slate-600">{item.location_name ?? item.location_id}</td>
                    <td className="px-4 py-3 text-center text-slate-900">{formatNumber(item.quantity)}</td>
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
        )
      ) : (
        <>
          {/* Selected items table */}
          {selectedItemsCount > 0 ? (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{dictionary.labelItems}</h3>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {selectedItemsCount}
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-violet-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50/60">
                      <th className="px-4 py-3 text-left font-semibold text-slate-500">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelProduct}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">{dictionary.labelQuantity}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelLocation}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelUnitPrice}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelDiscount}</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelLineTotal}</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(itemRows)
                      .filter(([, row]) => Number(row.quantity) > 0)
                      .map(([productId, row], rowIndex) => {
                        const product = products.find((p) => p.id === productId);
                        if (!product) return null;
                        const qty = Number(row.quantity || 0);
                        const price = Number(row.unitPrice || 0);
                        const discount = Number(row.discountValue || 0);
                        const lineTotal = qty * price - discount;

                        return (
                          <tr key={productId} className="border-b border-violet-50 last:border-0 hover:bg-violet-50/30">
                            <td className="px-4 py-3 text-slate-400">{rowIndex + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{product.name}</p>
                              <p className="text-xs text-slate-500">
                                {product.sku || "-"} · {product.product_unit_name || ""}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className="w-20 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-center outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min="0"
                                onChange={(e) => onItemField(productId, "quantity", e.target.value)}
                                step="1"
                                type="number"
                                value={row.quantity}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className={`w-40 rounded-xl border bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                                  rowErrors[productId] ? "border-rose-300" : "border-violet-200"
                                }`}
                                onChange={(e) => onItemField(productId, "locationId", e.target.value)}
                                value={row.locationId}
                              >
                                <option value="">{dictionary.placeholderLocation}</option>
                                {filteredLocations.map((loc) => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                              {rowErrors[productId] ? (
                                <p className="mt-1 text-xs text-rose-600">{rowErrors[productId]}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className="w-24 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-right outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min="0"
                                onChange={(e) => onItemField(productId, "unitPrice", e.target.value)}
                                step="0.01"
                                type="number"
                                value={row.unitPrice}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className="w-20 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-right outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min="0"
                                onChange={(e) => onItemField(productId, "discountValue", e.target.value)}
                                step="0.01"
                                type="number"
                                value={row.discountValue}
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => onItemField(productId, "quantity", "0")}
                                title={dictionary.actionCancel}
                                type="button"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Running totals */}
              <div className="mt-2 flex flex-wrap justify-end gap-5 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-3 text-sm">
                <span className="text-slate-600">
                  {dictionary.labelSubtotal}:{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(
                      Object.values(itemRows).reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unitPrice || 0), 0),
                    )}
                  </strong>
                </span>
                <span className="text-slate-600">
                  {dictionary.labelDiscount}:{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(Object.values(itemRows).reduce((s, r) => s + Number(r.discountValue || 0), 0))}
                  </strong>
                </span>
                <span className="text-slate-600">
                  {dictionary.labelNetAmount}:{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(
                      Object.values(itemRows).reduce(
                        (s, r) => s + Number(r.quantity || 0) * Number(r.unitPrice || 0) - Number(r.discountValue || 0),
                        0,
                      ),
                    )}
                  </strong>
                </span>
              </div>
            </div>
          ) : null}

          {/* Add products section */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">{dictionary.labelAllProducts}</h3>

            {/* Toolbar */}
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 pr-4 pl-11 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={dictionary.placeholderSearchProducts}
                  value={search}
                />
              </div>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => { onScanChange(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScanSubmit(); } }}
                placeholder={dictionary.placeholderScanCode}
                value={scanCode}
              />
              <div className="flex gap-2">
                <select
                  className="rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => onZoneChange(e.target.value)}
                  value={selectedZone}
                >
                  <option value="">Zone</option>
                  {[...new Set(locations.map((l) => l.zone_name).filter(Boolean) as string[])].map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => onFloorChange(e.target.value)}
                  value={selectedFloor}
                >
                  <option value="">Floor</option>
                  {[...new Set(
                    locations
                      .filter((l) => !selectedZone || l.zone_name === selectedZone)
                      .map((l) => l.floor_name)
                      .filter(Boolean) as string[]
                  )].map((floor) => (
                    <option key={floor} value={floor}>{floor}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PO import */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                className="min-w-[200px] rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => onPoIdChange(e.target.value)}
                value={selectedPoId}
              >
                <option value="">Import items from PO</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.order_number}</option>
                ))}
              </select>
              <button
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                onClick={onImportPo}
                type="button"
              >
                Import PO
              </button>
            </div>

            {scanFeedback ? (
              <div
                className={`mb-3 rounded-2xl border px-4 py-3 text-sm ${
                  scanFeedback.tone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {scanFeedback.value}
              </div>
            ) : null}

            {locationsQueryIsError ? (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {locationsQueryError instanceof Error ? locationsQueryError.message : dictionary.stateLoadingLocations}
              </div>
            ) : !locations.length && locationsQueryIsLoading ? (
              <div className="mb-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                {dictionary.stateLoadingLocations}
              </div>
            ) : !locations.length ? (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {dictionary.validationWarehouseWithoutLocations}
              </div>
            ) : null}

            {/* Product browse list */}
            {filteredProducts.length ? (
              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {filteredProducts.map((product) => {
                  const currentQty = Number(itemRows[product.id]?.quantity || 0);
                  const isSelected = currentQty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-2.5 transition-colors ${
                        isSelected ? "border-violet-200 bg-white" : "border-transparent bg-white hover:border-violet-100"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          {product.sku || "-"} · {product.product_unit_name || ""}
                          {product.brand_name ? ` · ${product.brand_name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                            ×{currentQty}
                          </span>
                        ) : null}
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-white text-sm font-bold text-violet-600 hover:bg-violet-50"
                          onClick={() => onItemField(product.id, "quantity", String(currentQty + 1))}
                          type="button"
                        >
                          +
                        </button>
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              {dictionary.actionBack}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
              disabled={isPending}
              onClick={() => onSave(stepLinks.step3)}
              type="button"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? dictionary.actionSaving : dictionary.actionSaveAndContinue}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
