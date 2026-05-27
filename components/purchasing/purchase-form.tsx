"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Package, Plus, Search, ShoppingCart, X } from "lucide-react";

import { createPurchaseOrder, type CreatePOItemInput } from "@/services/purchases";
import { listSuppliers, listSupplierProducts, type Supplier, type SupplierProduct } from "@/services/suppliers";
import { toast } from "@/components/ui/toast";

type PurchaseFormProps = {
  dictionary: {
    createOrder: string;
    editOrder: string;
    selectSupplier: string;
    selectSupplierFirst: string;
    selectProduct: string;
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
    currency: "THB", minimumFractionDigits: 2, style: "currency",
  }).format(amount);
}

function supplierInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") triggerClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerClose() { setIsClosing(true); }
  function handleAnimationEnd() { if (isClosing) onClose(); }

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryFn: async () => (await listSuppliers()).data ?? [],
    queryKey: ["suppliers"],
  });

  const { data: supplierProducts = [] } = useQuery<SupplierProduct[]>({
    queryFn: async () => supplierId ? (await listSupplierProducts(supplierId)).data ?? [] : [],
    queryKey: ["supplier-products", supplierId],
    enabled: !!supplierId,
  });

  const filteredProducts = supplierProducts.filter((p) =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.product_sku ?? "").toLowerCase().includes(productSearch.toLowerCase()),
  );

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
                <select
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => { setSupplierId(e.target.value); setProductSearch(""); }}
                  value={supplierId}
                >
                  <option value="">— {d.selectSupplier} —</option>
                  {suppliers.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
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
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder={d.selectProduct}
                      type="text"
                      value={productSearch}
                    />
                    {showProductDropdown && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-violet-100 bg-white shadow-[0_8px_24px_rgba(124,58,237,0.12)]">
                        {filteredProducts.length === 0 ? (
                          <p className="p-4 text-center text-sm text-slate-400">{d.noProducts ?? "No products found"}</p>
                        ) : filteredProducts.map((p) => (
                          <button
                            className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-violet-50"
                            key={p.product_id}
                            onMouseDown={() => addProductToItems(p)}
                            type="button"
                          >
                            <span className="font-medium text-slate-800">{p.product_name}</span>
                            <span className="font-mono text-xs text-slate-400">{p.product_sku}</span>
                          </button>
                        ))}
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
                                className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-right font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                min={0}
                                onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)}
                                step="0.01"
                                type="number"
                                value={item.unit_cost}
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-slate-800">
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
                      <span className="font-mono text-xl font-bold text-violet-700">{formatTHB(totalCost)}</span>
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
                              className="w-24 rounded-lg border border-violet-200 px-2 py-1.5 text-right font-mono text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              min={0}
                              onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)}
                              step="0.01"
                              type="number"
                              value={item.unit_cost}
                            />
                          </div>

                          {/* Line total */}
                          <span className="shrink-0 font-mono text-sm font-bold text-slate-800">
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
                <span className="font-mono text-xl font-bold text-violet-700">{formatTHB(totalCost)}</span>
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
