"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  WarehouseIcon,
  X,
} from "lucide-react";

import {
  addWarehouseProduct,
  createWarehouse,
  deleteWarehouse,
  listWarehouseProducts,
  listWarehouses,
  removeWarehouseProduct,
  updateWarehouse,
} from "@/services/warehouses";
import { listProducts } from "@/services/products";
import type {
  AddWarehouseProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseProduct,
} from "@/types/warehouse";
import type { Product } from "@/types/product";

type WarehouseSectionDictionary = {
  title: string;
  helper: string;
  empty: string;
  nameLabel: string;
  codeLabel: string;
  addressLabel: string;
  phoneLabel: string;
  contactNameLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  createButton: string;
  editLabel: string;
  deleteLabel: string;
  createTitle: string;
  editTitle: string;
  saveButton: string;
  cancel: string;
  nameRequired: string;
  deleteConfirm: string;
  deleteConfirmTitle: string;
  productsLabel: string;
  addProductLabel: string;
  searchProductLabel: string;
  noProductsLabel: string;
  addLabel: string;
  noProductsInWarehouseLabel: string;
};

type WarehouseSectionProps = {
  dictionary: WarehouseSectionDictionary;
};

type WarehouseFormState = {
  name: string;
  code: string;
  address: string;
  phone: string;
  contact_name: string;
  is_active: boolean;
};

const initialFormState: WarehouseFormState = {
  name: "",
  code: "",
  address: "",
  phone: "",
  contact_name: "",
  is_active: true,
};

export function WarehouseSection({ dictionary }: WarehouseSectionProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarehouseFormState>(initialFormState);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Product management state
  const [productsWarehouse, setProductsWarehouse] = useState<Warehouse | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [addingProductIds, setAddingProductIds] = useState<Set<string>>(new Set());
  const [addProductQuantity, setAddProductQuantity] = useState(1);
  const [addError, setAddError] = useState("");

  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });

  const warehouses = warehousesData?.data ?? [];
  const isFormValid = form.name.trim().length > 0;

  // Fetch products in selected warehouse
  const { data: warehouseProductsData, isLoading: productsLoadingrack } = useQuery({
    queryKey: ["warehouse-products", productsWarehouse?.id],
    queryFn: () => listWarehouseProducts(productsWarehouse!.id),
    enabled: !!productsWarehouse,
  });

  // Fetch all store products for adding
  const { data: allProductsData } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => listProducts({ limit: 200 }),
    enabled: showAddProduct,
  });

  const warehouseProducts = warehouseProductsData?.data ?? [];
  const allProducts: Product[] = allProductsData?.data
    ? Array.isArray(allProductsData.data)
      ? allProductsData.data
      : (allProductsData.data as any)?.items ?? []
    : [];

  const productIdsInWarehouse = new Set(warehouseProducts.map((wp) => wp.product_id));
  const excludeIds = new Set([...productIdsInWarehouse, ...addingProductIds]);
  const availableProducts = allProducts.filter((p) => !excludeIds.has(p.id));
  const filteredAvailable = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())),
  );

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setEditingId(null);
    setError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback(
    (warehouse: Warehouse) => {
      setForm({
        name: warehouse.name,
        code: warehouse.code ?? "",
        address: warehouse.address ?? "",
        phone: warehouse.phone ?? "",
        contact_name: warehouse.contact_name ?? "",
        is_active: warehouse.is_active,
      });
      setEditingId(warehouse.id);
      setError("");
      setIsModalOpen(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!isFormValid) {
      setError(dictionary.nameRequired);
      return;
    }

    startTransition(async () => {
      try {
        setError("");

        if (editingId) {
          const input: UpdateWarehouseInput = {
            name: form.name,
            code: form.code || undefined,
            address: form.address || undefined,
            phone: form.phone || undefined,
            contact_name: form.contact_name || undefined,
            is_active: form.is_active,
          };
          await updateWarehouse(editingId, input);
        } else {
          const input: CreateWarehouseInput = {
            name: form.name,
            code: form.code || undefined,
            address: form.address || undefined,
            phone: form.phone || undefined,
            contact_name: form.contact_name || undefined,
            is_active: form.is_active,
          };
          await createWarehouse(input);
        }

        await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
        setIsModalOpen(false);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : dictionary.nameRequired);
      }
    });
  }, [isFormValid, editingId, form, queryClient, resetForm, dictionary]);

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        try {
          await deleteWarehouse(id);
          await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
          setDeleteConfirmId(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : dictionary.nameRequired);
        }
      });
    },
    [queryClient, dictionary.nameRequired],
  );

  const handleAddProduct = useCallback(
    async (productId: string) => {
      if (!productsWarehouse || addingProductIds.has(productId)) {
        return;
      }

      setAddError("");
      setAddingProductIds((prev) => new Set(prev).add(productId));

      try {
        const input: AddWarehouseProductInput = { product_id: productId, quantity: addProductQuantity };
        await addWarehouseProduct(productsWarehouse.id, input);
        await queryClient.invalidateQueries({
          queryKey: ["warehouse-products", productsWarehouse.id],
        });
      } catch (err: any) {
        setAddError(err?.message || "Failed to add product");
        setAddingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [productsWarehouse, addingProductIds, addProductQuantity, queryClient],
  );

  const handleRemoveProduct = useCallback(
    async (warehouseId: string, productId: string) => {
      try {
        await removeWarehouseProduct(warehouseId, productId);
        await queryClient.invalidateQueries({
          queryKey: ["warehouse-products", warehouseId],
        });
      } catch {
        // Error handled silently
      }
    },
    [queryClient],
  );

  const openProductModal = useCallback((warehouse: Warehouse) => {
    setProductsWarehouse(warehouse);
    setShowAddProduct(false);
    setProductSearch("");
    setAddingProductIds(new Set());
    setAddError("");
  }, []);

  const closeProductModal = useCallback(() => {
    setProductsWarehouse(null);
    setShowAddProduct(false);
    setProductSearch("");
    setAddingProductIds(new Set());
    setAddError("");
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{dictionary.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{dictionary.helper}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800"
          onClick={openCreateModal}
          type="button"
        >
          <Plus className="h-4 w-4" />
          {dictionary.createButton}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">{dictionary.helper}...</div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16">
          <WarehouseIcon className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{dictionary.empty}</p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800"
            onClick={openCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.createButton}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 font-semibold text-slate-600">{dictionary.nameLabel}</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">{dictionary.codeLabel}</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">{dictionary.phoneLabel}</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">{dictionary.contactNameLabel}</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">{dictionary.addressLabel}</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse, wi) => (
                <tr
                  key={warehouse.id}
                  className="border-b border-slate-50 transition hover:bg-slate-50/50 smooth-fade-up"
                  style={{ animationDelay: `${wi * 40}ms` }}
                >
                  <td className="px-5 py-4 font-medium text-slate-900">{warehouse.name}</td>
                  <td className="px-5 py-4 text-slate-600">{warehouse.code ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{warehouse.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{warehouse.contact_name ?? "—"}</td>
                  <td className="max-w-48 truncate px-5 py-4 text-slate-600">
                    {warehouse.address ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        warehouse.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {warehouse.is_active
                        ? dictionary.activeLabel
                        : dictionary.inactiveLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => openProductModal(warehouse)}
                        title="Products"
                        type="button"
                      >
                        <Boxes className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => openEditModal(warehouse)}
                        title={dictionary.editLabel}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deleteConfirmId === warehouse.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            className="inline-flex h-7 items-center rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
                            onClick={() => handleDelete(warehouse.id)}
                            type="button"
                          >
                            {dictionary.deleteConfirm}
                          </button>
                          <button
                            className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                            onClick={() => setDeleteConfirmId(null)}
                            type="button"
                          >
                            {dictionary.cancel}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          onClick={() => setDeleteConfirmId(warehouse.id)}
                          title={dictionary.deleteLabel}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm smooth-fade">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl smooth-fade-up">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? dictionary.editTitle : dictionary.createTitle}
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.nameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={dictionary.nameLabel}
                  value={form.name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.codeLabel}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder={dictionary.codeLabel}
                  value={form.code}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.phoneLabel}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={dictionary.phoneLabel}
                  value={form.phone}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.contactNameLabel}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                  placeholder={dictionary.contactNameLabel}
                  value={form.contact_name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.addressLabel}
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={dictionary.addressLabel}
                  rows={3}
                  value={form.address}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  checked={form.is_active}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-200"
                  id="warehouse-is-active"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  type="checkbox"
                />
                <label className="text-sm font-medium text-slate-700" htmlFor="warehouse-is-active">
                  {dictionary.activeLabel}
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                type="button"
              >
                {dictionary.cancel}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800 disabled:opacity-50"
                disabled={!isFormValid || isPending}
                onClick={handleSave}
                type="button"
              >
                {isPending ? (
                  <>
                    <svg aria-hidden="true" className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                    <span>{dictionary.saveButton}</span>
                  </>
                ) : (
                  dictionary.saveButton
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Products Modal */}
      {productsWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm smooth-fade">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl smooth-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {productsWarehouse.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {warehouseProducts.length} {dictionary.productsLabel}
                  {warehouseProducts.reduce((sum, wp) => sum + wp.quantity, 0) > 0 && (
                    <> — {warehouseProducts.reduce((sum, wp) => sum + wp.quantity, 0)} units</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
                  onClick={() => {
                    setShowAddProduct(true);
                    setProductSearch("");
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {dictionary.addProductLabel}
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
                  onClick={closeProductModal}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add product panel */}
            {showAddProduct && (
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={dictionary.searchProductLabel}
                    value={productSearch}
                  />
                </div>
                <div className="mb-3 flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-600">จำนวน:</label>
                  <input
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-center outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    min={0}
                    onChange={(e) => setAddProductQuantity(Math.max(0, Number(e.target.value) || 0))}
                    type="number"
                    value={addProductQuantity}
                  />
                </div>
                {addError && (
                  <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {addError}
                  </div>
                )}
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filteredAvailable.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">
                      {dictionary.noProductsLabel}
                    </p>
                  ) : (
                    filteredAvailable.map((product) => (
                      <button
                        key={product.id}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:bg-blue-50 hover:translate-x-0.5"
                        onClick={() => handleAddProduct(product.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-700">{product.name}</span>
                          {product.sku && (
                            <span className="text-xs text-slate-400">{product.sku}</span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-blue-600">
                          {addingProductIds.has(product.id) ? "..." : dictionary.addLabel}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Products list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {productsLoadingrack ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  {dictionary.helper}...
                </div>
              ) : warehouseProducts.length > 0 ? (
                <div className="space-y-2">
                  {warehouseProducts.map((wp, index) => (
                    <div
                      key={wp.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm smooth-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{wp.product_name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {wp.product_sku && <span>SKU: {wp.product_sku}</span>}
                            {wp.product_price > 0 && (
                              <span>฿{wp.product_price.toLocaleString()}</span>
                            )}
                            <span className="font-semibold text-blue-600">x{wp.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleRemoveProduct(productsWarehouse.id, wp.product_id)}
                        title={dictionary.deleteLabel}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
