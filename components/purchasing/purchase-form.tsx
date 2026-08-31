"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Package, Plus, Search, ShoppingCart, X } from "lucide-react";

import { createPurchaseOrder, type CreatePOItemInput } from "@/services/purchases";
import { listSuppliers, listSupplierProducts, type Supplier, type SupplierProduct } from "@/services/suppliers";
import { toast } from "@/components/ui/toast";
import { EntityCombobox } from "@/components/ui/entity-combobox";
import { ScanButton } from "@/components/shared/scan-button";

type PurchaseFormProps = {
  dictionary: {
    createOrder: string;
    editOrder: string;
    selectSupplier: string;
    selectSupplierFirst: string;
    noSupplierMatch: string;
    selectProduct: string;
    searchPlaceholder?: string;
    addItem: string;
    product: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    note: string;
    save: string;
    saving: string;
    cancel: string;
    requestFailed: string;
    noProducts?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
};

type LineItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 0, style: "currency",
  }).format(amount);
}

export function PurchaseForm({ dictionary: d, onClose, onSuccess }: PurchaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const scanFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerClose() { setIsClosing(true); }
  function handleAnimationEnd() { if (isClosing) onClose(); }

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") triggerClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryFn: async () => (await listSuppliers()).data ?? [],
    queryKey: ["suppliers"],
  });

  const { data: supplierProducts = [] } = useQuery<SupplierProduct[]>({
    queryFn: async () => supplierId ? (await listSupplierProducts(supplierId)).data ?? [] : [],
    queryKey: ["supplier-products", supplierId],
    enabled: !!supplierId,
  });

  const filteredProducts = (() => {
    const kw = productSearch.trim().toLowerCase();
    const list = kw
      ? supplierProducts.filter((p) =>
          p.product_name.toLowerCase().includes(kw) ||
          (p.product_sku ?? "").toLowerCase().includes(kw) ||
          (p.supplier_sku ?? "").toLowerCase().includes(kw) ||
          (p.barcode ?? "").toLowerCase().includes(kw),
        )
      : [...supplierProducts];
    return list.sort((a, b) => a.product_name.localeCompare(b.product_name, "th"));
  })();

  function showScanFeedback(ok: boolean, msg: string) {
    if (scanFeedbackTimer.current) clearTimeout(scanFeedbackTimer.current);
    setScanFeedback({ ok, msg });
    scanFeedbackTimer.current = setTimeout(() => setScanFeedback(null), 3000);
  }

  function handleScanResult(barcode: string) {
    const match = supplierProducts.find(
      (p) => (p.barcode ?? "").toLowerCase() === barcode.toLowerCase() ||
              p.product_sku.toLowerCase() === barcode.toLowerCase(),
    );
    if (match) {
      addProductToItems(match);
      showScanFeedback(true, `เพิ่ม "${match.product_name}" แล้ว`);
    } else {
      showScanFeedback(false, `ไม่พบสินค้าบาร์โค้ด ${barcode} ในรายการผู้จัดจำหน่ายนี้`);
    }
  }

  function handleSearchEnter() {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return;
    const exactMatch = supplierProducts.find(
      (p) =>
        (p.barcode ?? "").toLowerCase() === kw ||
        p.product_sku.toLowerCase() === kw ||
        p.supplier_sku.toLowerCase() === kw,
    );
    const target = exactMatch ?? (filteredProducts.length === 1 ? filteredProducts[0] : null);
    if (target) {
      addProductToItems(target);
      setProductSearch("");
      setShowProductDropdown(false);
      showScanFeedback(true, `เพิ่ม "${target.product_name}" แล้ว`);
    } else if (filteredProducts.length === 0) {
      showScanFeedback(false, `ไม่พบสินค้า "${productSearch.trim()}"`);
    }
  }

  function addProductToItems(item: SupplierProduct) {
    if (items.find((i) => i.product_id === item.product_id)) return;
    setItems([...items, {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: 1,
      unit_cost: item.supplier_price ?? 0,
    }]);
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function updateItem(productId: string, field: "quantity" | "unit_cost", value: string) {
    const parsed = parseFloat(value);
    setItems(items.map((item) =>
      item.product_id !== productId ? item : { ...item, [field]: Number.isNaN(parsed) ? 0 : parsed },
    ));
  }

  function stepQuantity(productId: string, delta: number) {
    setItems(items.map((item) =>
      item.product_id !== productId ? item : { ...item, quantity: Math.max(1, item.quantity + delta) },
    ));
  }

  function removeItem(productId: string) {
    setItems(items.filter((item) => item.product_id !== productId));
  }

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  async function handleSave() {
    setError("");
    if (items.length === 0) { setError(d.addItem + " is required"); return; }
    for (const item of items) {
      if (item.quantity <= 0) { setError(`${d.quantity} must be > 0`); return; }
    }
    const payload: { supplier_id?: string; notes?: string; items: CreatePOItemInput[] } = {
      items: items.map(({ product_id, quantity, unit_cost }) => ({ product_id, quantity, unit_cost })),
    };
    if (supplierId) payload.supplier_id = supplierId;
    if (notes.trim()) payload.notes = notes.trim();

    startTransition(async () => {
      try {
        await createPurchaseOrder(payload);
        toast.success(d.createOrder);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : d.requestFailed);
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 ${isClosing ? "fade-out" : "smooth-fade"}`}
        onClick={triggerClose}
      />

      {/* Container: full-screen on mobile, centered on desktop */}
      <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4">
        <div
          className={`flex h-full flex-col overflow-hidden bg-white md:h-auto md:max-h-[90vh] md:w-full md:max-w-2xl md:rounded-2xl md:shadow-[0_24px_60px_rgba(124,58,237,0.18)] ${isClosing ? "fade-out" : "smooth-fade-up"}`}
          onAnimationEnd={handleAnimationEnd}
        >
          {/* Accent bar */}
          <div className="h-1 shrink-0 bg-violet-600" />

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-4 py-4 md:gap-4 md:px-6 md:py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-200/60 md:h-12 md:w-12">
              <ShoppingCart className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold text-slate-900 md:text-lg">{d.createOrder}</h4>
              <p className="text-xs text-slate-500">{selectedSupplier ? selectedSupplier.name : d.selectSupplier}</p>
            </div>
            <button
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              onClick={triggerClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-sm text-red-600 error-slide-in">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Supplier */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.selectSupplier}
                </label>
                <EntityCombobox
                  items={suppliers.filter((s) => s.is_active).map((s) => ({
                    id: s.id,
                    label: s.name,
                    subtitle: [s.contact_person, s.phone].filter(Boolean).join(" · ") || undefined,
                    keywords: [s.name, s.phone ?? "", s.contact_person ?? ""],
                  }))}
                  value={supplierId}
                  onChange={(id) => { setSupplierId(id); setProductSearch(""); }}
                  labels={{
                    placeholder: `— ${d.selectSupplier} —`,
                    noResults: d.noSupplierMatch ?? d.selectSupplier,
                  }}
                />
              </div>

              {/* Product search */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.selectProduct}
                </label>
                {!supplierId ? (
                  <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-4 text-center text-sm text-slate-400">
                    {d.selectSupplierFirst}
                  </div>
                ) : (
                  <div className="relative" ref={productSearchRef}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                          onFocus={() => setShowProductDropdown(true)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchEnter(); } }}
                          placeholder={d.searchPlaceholder ?? "ค้นหาชื่อสินค้า, รหัส SKU หรือบาร์โค้ด"}
                          type="text"
                          value={productSearch}
                        />
                        {productSearch && (
                          <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => { setProductSearch(""); setShowProductDropdown(false); }}
                            type="button"
                            aria-label="ล้างการค้นหา"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <ScanButton
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 transition-colors hover:bg-violet-50 hover:border-violet-300 disabled:opacity-40"
                        disabled={!supplierId}
                        onScan={handleScanResult}
                      />
                    </div>

                    {/* Scan feedback banner */}
                    {scanFeedback && (
                      <div className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${scanFeedback.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        <span>{scanFeedback.ok ? "✓" : "✗"}</span>
                        {scanFeedback.msg}
                      </div>
                    )}

                    {supplierProducts.length > 0 && !showProductDropdown && !scanFeedback && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {supplierProducts.length} สินค้า — คลิกเพื่อเลือก หรือสแกนบาร์โค้ดในช่องด้านบน
                      </p>
                    )}

                    {showProductDropdown && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-violet-100 bg-white shadow-[0_8px_24px_rgba(124,58,237,0.12)]">
                        {filteredProducts.length === 0 ? (
                          <p className="p-4 text-center text-sm text-slate-400">{d.noProducts ?? "ไม่พบสินค้า"}</p>
                        ) : filteredProducts.map((p) => {
                          const alreadyAdded = !!items.find((i) => i.product_id === p.product_id);
                          return (
                            <button
                              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${alreadyAdded ? "cursor-default bg-violet-50/60 opacity-60" : "hover:bg-violet-50"}`}
                              disabled={alreadyAdded}
                              key={p.product_id}
                              onClick={() => addProductToItems(p)}
                              type="button"
                            >
                              <div className="min-w-0 text-left">
                                <p className="truncate font-medium text-slate-800">{p.product_name}</p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {p.product_sku}{p.supplier_sku ? ` · ${p.supplier_sku}` : ""}
                                  {p.barcode ? ` · ${p.barcode}` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                {alreadyAdded ? (
                                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">เพิ่มแล้ว</span>
                                ) : (
                                  <span className="nums text-xs font-semibold text-violet-700">{formatTHB(p.supplier_price)}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Line items */}
              {items.length > 0 ? (
                <>
                  {/* ── Desktop table ── */}
                  <div className="hidden overflow-hidden rounded-xl border border-violet-100 md:block">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-violet-100 bg-violet-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-2.5">{d.product}</th>
                          <th className="w-24 px-4 py-2.5">{d.quantity}</th>
                          <th className="w-28 px-4 py-2.5">{d.unitCost}</th>
                          <th className="w-32 px-4 py-2.5 text-right">{d.totalCost}</th>
                          <th className="w-10 px-2 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {items.map((item) => (
                          <tr key={item.product_id}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                                  <Package className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-medium text-slate-800">{item.product_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-center text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min={1}
                                onChange={(e) => updateItem(item.product_id, "quantity", e.target.value)}
                                type="number"
                                value={item.quantity}
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-right nums text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min={0}
                                onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)}
                                step="0.01"
                                type="number"
                                value={item.unit_cost}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right nums text-sm font-semibold text-slate-800">
                              {formatTHB(item.quantity * item.unit_cost)}
                            </td>
                            <td className="px-2 py-2.5">
                              <button
                                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                onClick={() => removeItem(item.product_id)}
                                type="button"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Desktop total row */}
                    <div className="flex items-center justify-between border-t border-violet-100 bg-violet-50/40 px-4 py-3">
                      <span className="text-sm font-semibold text-slate-600">{d.totalCost}</span>
                      <span className="nums text-xl font-bold text-violet-700">{formatTHB(totalCost)}</span>
                    </div>
                  </div>

                  {/* ── Mobile item cards ── */}
                  <div className="space-y-2 md:hidden">
                    {items.map((item) => (
                      <div key={item.product_id} className="rounded-xl border border-violet-100 p-3">
                        {/* Product name + delete */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                              <Package className="h-3.5 w-3.5" />
                            </div>
                            <span className="truncate text-sm font-medium text-slate-800">{item.product_name}</span>
                          </div>
                          <button
                            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            onClick={() => removeItem(item.product_id)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Controls row: stepper + unit cost + line total */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          {/* +/- stepper */}
                          <div className="flex items-center gap-1.5">
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 transition-colors hover:bg-violet-200"
                              onClick={() => stepQuantity(item.product_id, -1)}
                              type="button"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 transition-colors hover:bg-violet-200"
                              onClick={() => stepQuantity(item.product_id, 1)}
                              type="button"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Unit cost input */}
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <span>×</span>
                            <input
                              className="w-24 rounded-lg border border-violet-200 px-2 py-1.5 text-right nums text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              min={0}
                              onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)}
                              step="0.01"
                              type="number"
                              value={item.unit_cost}
                            />
                          </div>

                          {/* Line total */}
                          <span className="shrink-0 nums text-sm font-bold text-slate-800">
                            {formatTHB(item.quantity * item.unit_cost)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/30 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                    <Package className="h-6 w-6 text-violet-400" />
                  </div>
                  <p className="text-sm text-slate-400">{d.selectProduct}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.note}
                </label>
                <textarea
                  className="w-full resize-none rounded-xl border border-violet-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={d.note}
                  rows={2}
                  value={notes}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-gradient-to-r from-violet-50/40 to-white px-4 py-4 md:px-6">
            {/* Mobile total summary */}
            {items.length > 0 && (
              <div className="mb-3 flex items-center justify-between md:hidden">
                <span className="text-sm font-semibold text-slate-600">{d.totalCost}</span>
                <span className="nums text-xl font-bold text-violet-700">{formatTHB(totalCost)}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                className="flex-1 rounded-xl border border-violet-200 bg-white py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
                onClick={triggerClose}
                type="button"
              >
                {d.cancel}
              </button>
              <button
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/60 transition-all hover:bg-violet-700 hover:shadow-lg disabled:opacity-60"
                disabled={isPending || items.length === 0}
                onClick={handleSave}
                type="button"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{d.saving}</>
                ) : (
                  <><Plus className="h-4 w-4" />{d.save}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
