"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Search } from "lucide-react";

import { createPurchaseOrder, type CreatePOItemInput } from "@/services/purchases";
import { listSuppliers, listSupplierProducts, type Supplier, type SupplierProduct } from "@/services/suppliers";

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
    [key: string]: string;
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

export function PurchaseForm({ dictionary, onClose, onSuccess }: PurchaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryFn: async () => {
      const response = await listSuppliers();
      return response.data ?? [];
    },
    queryKey: ["suppliers"],
  });

  const { data: supplierProducts = [] } = useQuery<SupplierProduct[]>({
    queryFn: async () => {
      if (!supplierId) return [];
      const response = await listSupplierProducts(supplierId);
      return response.data ?? [];
    },
    queryKey: ["supplier-products", supplierId],
    enabled: !!supplierId,
  });

  const filteredProducts = supplierProducts.filter(
    (p) =>
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.product_sku ?? "").toLowerCase().includes(productSearch.toLowerCase()),
  );

  function addProductToItems(item: SupplierProduct) {
    // Check if already added
    if (items.find((i) => i.product_id === item.product_id)) return;
    setItems([
      ...items,
      {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: 1,
        unit_cost: item.supplier_price ?? 0,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function updateItem(productId: string, field: keyof LineItem, value: number | string) {
    setItems(
      items.map((item) => {
        if (item.product_id !== productId) return item;
        const parsed = typeof value === "string" ? parseFloat(value) : value;
        return { ...item, [field]: Number.isNaN(parsed) ? 0 : parsed };
      }),
    );
  }

  function removeItem(productId: string) {
    setItems(items.filter((item) => item.product_id !== productId));
  }

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  async function handleSave() {
    setError("");

    if (items.length === 0) {
      setError(dictionary.addItem + " is required");
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        setError(`${dictionary.quantity} must be > 0`);
        return;
      }
    }

    const payload: {
      supplier_id?: string;
      notes?: string;
      items: CreatePOItemInput[];
    } = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
    };

    if (supplierId) payload.supplier_id = supplierId;
    if (notes.trim()) payload.notes = notes.trim();

    startTransition(async () => {
      try {
        await createPurchaseOrder(payload);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.15)]">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-900">{dictionary.createOrder}</h4>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="space-y-4">
            {/* Supplier selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {dictionary.selectSupplier}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setShowProductDropdown(true);
                  setProductSearch("");
                }}
                value={supplierId}
              >
                <option value="">-- {dictionary.selectSupplier} --</option>
                {suppliers
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Product search + add */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {dictionary.selectProduct}
              </label>
              {!supplierId ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-sm text-slate-400">
                  {dictionary.selectSupplierFirst}
                </p>
              ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder={dictionary.selectProduct}
                  type="text"
                  value={productSearch}
                />
                {showProductDropdown ? (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500">No products found</p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-violet-700 hover:bg-violet-50 transition-colors"
                          key={p.product_id}
                          onMouseDown={() => addProductToItems(p)}
                          type="button"
                        >
                          <span>{p.product_name}</span>
                          <span className="text-xs text-slate-400">{p.product_sku || ""}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              )}
            </div>

            {/* Items table */}
            {items.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-semibold uppercase text-slate-500">
                      <th className="px-4 py-2">{dictionary.product}</th>
                      <th className="px-4 py-2 w-24">{dictionary.quantity}</th>
                      <th className="px-4 py-2 w-28">{dictionary.unitCost}</th>
                      <th className="px-4 py-2 w-28 text-right">{dictionary.totalCost}</th>
                      <th className="px-4 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.product_id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{item.product_name}</td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-violet-400 focus:outline-none"
                            min={1}
                            onChange={(e) => updateItem(item.product_id, "quantity", e.target.value)}
                            type="number"
                            value={item.quantity}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-violet-400 focus:outline-none"
                            min={0}
                            onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)}
                            step="0.01"
                            type="number"
                            value={item.unit_cost}
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900">
                          {new Intl.NumberFormat("th-TH", {
                            currency: "THB",
                            minimumFractionDigits: 2,
                            style: "currency",
                          }).format(item.quantity * item.unit_cost)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => removeItem(item.product_id)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-4 py-2 text-sm font-semibold text-slate-700" colSpan={3}>
                        {dictionary.totalCost}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-slate-900">
                        {new Intl.NumberFormat("th-TH", {
                          currency: "THB",
                          minimumFractionDigits: 2,
                          style: "currency",
                        }).format(totalCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                {dictionary.selectProduct}
              </p>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {dictionary.note}
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(e) => setNotes(e.target.value)}
                placeholder={dictionary.note}
                rows={2}
                value={notes}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={onClose}
              type="button"
            >
              {dictionary.cancel}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              disabled={isPending}
              onClick={handleSave}
              type="button"
            >
              {isPending ? dictionary.saving : dictionary.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
