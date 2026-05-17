"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  Package,
  Plus,
  Search,
  Settings2,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
  Pencil,
  AlertTriangle,
} from "lucide-react";

import {
  addWarehouseProduct,
  createStandaloneWarehouseProduct,
  createWarehouse,
  deleteWarehouse,
  listWarehouseProducts,
  listWarehouses,
  removeWarehouseProduct,
  updateWarehouse,
  updateWarehouseProductQuantity,
} from "@/services/warehouses";
import { listProducts } from "@/services/products";
import type {
  AddWarehouseProductInput,
  CreateStandaloneWarehouseProductInput,
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
  addStandaloneLabel: string;
  fromStockLabel: string;
  newProductLabel: string;
  standaloneNameLabel: string;
  standaloneSkuLabel: string;
  standaloneBarcodeLabel: string;
  standalonePriceLabel: string;
  standaloneUnitLabel: string;
  standaloneTypeLabel: string;
  standaloneNameRequired: string;
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

type StandaloneFormState = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  unit_name: string;
  type_name: string;
  quantity: string;
};

const initialFormState: WarehouseFormState = {
  name: "",
  code: "",
  address: "",
  phone: "",
  contact_name: "",
  is_active: true,
};

const initialStandaloneForm: StandaloneFormState = {
  name: "",
  sku: "",
  barcode: "",
  price: "",
  unit_name: "",
  type_name: "",
  quantity: "1",
};

export function WarehouseSection({ dictionary }: WarehouseSectionProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarehouseFormState>(initialFormState);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selected warehouse
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  // Add product panel
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addMode, setAddMode] = useState<"stock" | "standalone">("stock");
  const [productSearch, setProductSearch] = useState("");
  const [addingProductIds, setAddingProductIds] = useState<Set<string>>(new Set());
  const [addProductQuantity, setAddProductQuantity] = useState(1);
  const [addError, setAddError] = useState("");

  // Standalone form
  const [standaloneForm, setStandaloneForm] = useState<StandaloneFormState>(initialStandaloneForm);
  const [isStandaloneSaving, setIsStandaloneSaving] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline edit quantity
  const [editingQty, setEditingQty] = useState<{[key: string]: boolean}>({});
  const [editingQtyValues, setEditingQtyValues] = useState<{[key: string]: string}>({});

  const startQtyEdit = useCallback((wp: WarehouseProduct) => {
    setEditingQty((prev) => ({ ...prev, [wp.product_id]: true }));
    setEditingQtyValues((prev) => ({ ...prev, [wp.product_id]: String(wp.quantity) }));
  }, []);

  const cancelQtyEdit = useCallback((productId: string) => {
    setEditingQty((prev) => ({ ...prev, [productId]: false }));
    setEditingQtyValues((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const confirmQtyEdit = useCallback(
    async (productId: string) => {
      if (!selectedWarehouseId) return;
      const value = editingQtyValues[productId];
      const quantity = parseInt(value ?? "", 10);
      if (isNaN(quantity) || quantity < 0) return;

      try {
        await updateWarehouseProductQuantity(selectedWarehouseId, productId, quantity);
        await queryClient.invalidateQueries({ queryKey: ["warehouse-products", selectedWarehouseId] });
        cancelQtyEdit(productId);
      } catch {
        // Error handled silently
      }
    },
    [selectedWarehouseId, editingQtyValues, queryClient, cancelQtyEdit],
  );

  // Manage warehouses modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });

  const warehouses = warehousesData?.data ?? [];

  // Auto-select first warehouse
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // Fetch products in selected warehouse
  const { data: warehouseProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ["warehouse-products", selectedWarehouseId],
    queryFn: () => listWarehouseProducts(selectedWarehouseId),
    enabled: !!selectedWarehouseId,
  });

  // Fetch all store products for adding
  const { data: allProductsData } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => listProducts({ limit: 200 }),
    enabled: showAddProduct && addMode === "stock",
  });

  const warehouseProducts = warehouseProductsData?.data ?? [];
  const allProducts: Product[] = allProductsData?.data
    ? Array.isArray(allProductsData.data)
      ? allProductsData.data
      : (allProductsData.data as any)?.items ?? []
    : [];

  const productIdsInWarehouse = new Set(warehouseProducts.map((wp) => wp.product_id));
  const excludeIds = useMemo(
    () => new Set([...productIdsInWarehouse, ...addingProductIds]),
    [productIdsInWarehouse, addingProductIds],
  );
  const availableProducts = allProducts.filter((p) => !excludeIds.has(p.id));
  const filteredAvailable = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())),
  );

  const totalUnits = warehouseProducts.reduce((sum, wp) => sum + wp.quantity, 0);

  const isFormValid = form.name.trim().length > 0;

  // Reset add product panel
  const resetAddPanel = useCallback(() => {
    setShowAddProduct(false);
    setAddMode("stock");
    setProductSearch("");
    setAddingProductIds(new Set());
    setAddError("");
    setStandaloneForm(initialStandaloneForm);
    setIsStandaloneSaving(false);
  }, []);

  // Warehouse CRUD
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
          if (selectedWarehouseId === id) {
            setSelectedWarehouseId("");
          }
          setDeleteConfirmId(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : dictionary.nameRequired);
        }
      });
    },
    [queryClient, dictionary.nameRequired, selectedWarehouseId],
  );

  const isStandaloneFormValid = standaloneForm.name.trim().length > 0;

  const handleStandaloneSave = useCallback(async () => {
    if (!selectedWarehouse || !isStandaloneFormValid) {
      setAddError(dictionary.standaloneNameRequired);
      return;
    }

    setIsStandaloneSaving(true);
    setAddError("");

    try {
      const input: CreateStandaloneWarehouseProductInput = {
        name: standaloneForm.name.trim(),
        sku: standaloneForm.sku.trim() || undefined,
        barcode: standaloneForm.barcode.trim() || undefined,
        price: standaloneForm.price ? parseFloat(standaloneForm.price) || 0 : 0,
        unit_name: standaloneForm.unit_name.trim() || undefined,
        type_name: standaloneForm.type_name.trim() || undefined,
        quantity: Math.max(0, parseInt(standaloneForm.quantity || "1", 10) || 0),
      };
      await createStandaloneWarehouseProduct(selectedWarehouse.id, input);
      await queryClient.invalidateQueries({
        queryKey: ["warehouse-products", selectedWarehouse.id],
      });
      setStandaloneForm(initialStandaloneForm);
    } catch (err: any) {
      setAddError(err?.message || "Failed to add product");
    } finally {
      setIsStandaloneSaving(false);
    }
  }, [selectedWarehouse, standaloneForm, isStandaloneFormValid, queryClient, dictionary.standaloneNameRequired]);

  const handleAddProduct = useCallback(
    async (productId: string) => {
      if (!selectedWarehouse || addingProductIds.has(productId)) return;

      setAddError("");
      setAddingProductIds((prev) => new Set(prev).add(productId));

      try {
        const input: AddWarehouseProductInput = { product_id: productId, quantity: addProductQuantity };
        await addWarehouseProduct(selectedWarehouse.id, input);
        await queryClient.invalidateQueries({
          queryKey: ["warehouse-products", selectedWarehouse.id],
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
    [selectedWarehouse, addingProductIds, addProductQuantity, queryClient],
  );

  const handleRemoveProduct = useCallback(
    async (productId: string) => {
      if (!selectedWarehouseId) return;
      try {
        await removeWarehouseProduct(selectedWarehouseId, productId);
        // Optimistically remove from cache immediately
        queryClient.setQueryData<{ data: WarehouseProduct[] }>(
          ["warehouse-products", selectedWarehouseId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.filter((wp) => wp.product_id !== productId),
            };
          },
        );
        await queryClient.refetchQueries({
          queryKey: ["warehouse-products", selectedWarehouseId],
        });
      } catch {
        // Error handled silently - refetch to reconcile
        await queryClient.refetchQueries({
          queryKey: ["warehouse-products", selectedWarehouseId],
        });
      }
    },
    [selectedWarehouseId, queryClient],
  );

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border-b-2 border-blue-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.title}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">
            {warehouses.length}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-amber-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.productsLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {warehouseProducts.length}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-emerald-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Units
          </span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">
            {totalUnits}
          </p>
        </div>
      </section>

      {/* Warehouse Selector + Actions */}
      <section className="rounded-xl bg-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WarehouseIcon className="h-5 w-5 text-slate-500" />
            {warehousesLoading ? (
              <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
            ) : (
              <div className="relative">
                <select
                  className="min-w-[220px] appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => {
                    setSelectedWarehouseId(e.target.value);
                    resetAddPanel();
                  }}
                  value={selectedWarehouseId}
                >
                  {warehouses.length === 0 && (
                    <option value="">{dictionary.empty}</option>
                  )}
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.code ? ` (${w.code})` : ""}{!w.is_active ? ` — ${dictionary.inactiveLabel}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={!selectedWarehouse}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setIsManageModalOpen(true)}
              type="button"
            >
              <Settings2 className="h-3.5 w-3.5" />
              จัดการ
            </button>
          </div>
        </div>

        {/* Add Product Panel */}
        {showAddProduct && selectedWarehouse && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            {/* Mode Tabs */}
            <div className="mb-4 flex gap-2">
              <button
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  addMode === "stock"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setAddMode("stock")}
                type="button"
              >
                {dictionary.fromStockLabel}
              </button>
              <button
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  addMode === "standalone"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setAddMode("standalone")}
                type="button"
              >
                {dictionary.newProductLabel}
              </button>
            </div>

            {addMode === "stock" ? (
              <>
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
                  <button
                    className="ml-auto rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-slate-600"
                    onClick={resetAddPanel}
                    type="button"
                  >
                    {dictionary.cancel}
                  </button>
                </div>
                {addError && (
                  <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    {addError}
                  </div>
                )}
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {filteredAvailable.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">
                      {dictionary.noProductsLabel}
                    </p>
                  ) : (
                    filteredAvailable.map((product) => (
                      <button
                        key={product.id}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:bg-blue-50"
                        onClick={() => handleAddProduct(product.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {product.image_url ? (
                              <img
                                alt={product.name}
                                className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                                src={product.image_url}
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                                {product.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="block truncate font-medium text-slate-700">
                              {product.name}
                            </span>
                            {product.sku && (
                              <span className="block truncate text-xs text-slate-400">
                                {product.sku}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-blue-600">
                          {addingProductIds.has(product.id) ? (
                            <svg aria-hidden="true" className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                            </svg>
                          ) : (
                            dictionary.addLabel
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Standalone product form */
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Name (required) */}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneNameLabel}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-700">required</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={dictionary.standaloneNameLabel}
                      value={standaloneForm.name}
                    />
                  </label>

                  {/* SKU */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneSkuLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, sku: e.target.value }))}
                      placeholder={dictionary.standaloneSkuLabel}
                      value={standaloneForm.sku}
                    />
                  </label>

                  {/* Barcode */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneBarcodeLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, barcode: e.target.value }))}
                      placeholder={dictionary.standaloneBarcodeLabel}
                      value={standaloneForm.barcode}
                    />
                  </label>

                  {/* Price */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standalonePriceLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      min={0}
                      step="0.01"
                      value={standaloneForm.price}
                    />
                  </label>

                  {/* Unit */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneUnitLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, unit_name: e.target.value }))}
                      placeholder={dictionary.standaloneUnitLabel}
                      value={standaloneForm.unit_name}
                    />
                  </label>

                  {/* Category/Type */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneTypeLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, type_name: e.target.value }))}
                      placeholder={dictionary.standaloneTypeLabel}
                      value={standaloneForm.type_name}
                    />
                  </label>

                  {/* Quantity */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>จำนวน</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      min={0}
                      type="number"
                      value={standaloneForm.quantity}
                    />
                  </label>
                </div>

                {addError && (
                  <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    {addError}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-slate-600"
                    onClick={resetAddPanel}
                    type="button"
                  >
                    {dictionary.cancel}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800 disabled:bg-blue-400"
                    disabled={!isStandaloneFormValid || isStandaloneSaving}
                    onClick={handleStandaloneSave}
                    type="button"
                  >
                    {isStandaloneSaving ? (
                      <>
                        <svg aria-hidden="true" className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                        </svg>
                        <span>{dictionary.saveButton}</span>
                      </>
                    ) : (
                      dictionary.addStandaloneLabel
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Products Table */}
      {!selectedWarehouse ? (
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
      ) : productsLoading ? (
        <div className="rounded-2xl bg-white p-12 text-center">
          <span className="inline-flex items-center gap-3 text-sm text-slate-500">
            <svg aria-hidden="true" className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            <span className="animate-pulse">{dictionary.helper}...</span>
          </span>
        </div>
      ) : warehouseProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16">
          <Boxes className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{dictionary.noProductsInWarehouseLabel}</p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800"
            onClick={() => {
              setShowAddProduct(true);
              setProductSearch("");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.addProductLabel}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
                <th className="w-[5%] px-4 py-4 text-center font-bold"></th>
                <th className="w-[10%] px-6 py-4 text-center font-bold">รูป</th>
                <th className="w-[25%] px-6 py-4 font-bold">รายละเอียดสินค้า</th>
                <th className="w-[13%] px-6 py-4 font-bold">บาร์โค้ด</th>
                <th className="w-[14%] px-6 py-4 font-bold">หมวดหมู่</th>
                <th className="w-[10%] px-6 py-4 font-bold">ราคา</th>
                <th className="w-[8%] px-2 py-4 font-bold">สต็อก</th>
                <th className="w-[15%] px-6 py-4 text-right font-bold">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseProducts.map((wp, index) => (
                <tr
                  key={wp.id}
                  className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
                >
                  <td className="px-4 py-4 text-center">
                    <input
                      aria-label={`Select ${wp.product_name}`}
                      checked={selectedIds.has(wp.product_id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(wp.product_id)) {
                          next.delete(wp.product_id);
                        } else {
                          next.add(wp.product_id);
                        }
                        setSelectedIds(next);
                      }}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {wp.image_url ? (
                      <img
                        alt={wp.product_name}
                        className="mx-auto h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                        loading="lazy"
                        src={wp.image_url}
                      />
                    ) : (
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                        {(wp.product_name || wp.standalone_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex min-w-0 flex-col">
                      <span
                        className="overflow-hidden break-all text-sm font-bold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                        title={wp.product_name || wp.standalone_name}
                      >
                        {wp.product_name || wp.standalone_name || "-"}
                      </span>
                      {(wp.product_sku || wp.standalone_sku) ? (
                        <span className="mt-0.5 truncate text-xs text-slate-400" title={wp.product_sku || wp.standalone_sku}>
                          {wp.product_sku || wp.standalone_sku}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <span className="block truncate font-mono" title={wp.product_barcode || wp.standalone_barcode || "-"}>
                      {wp.product_barcode || wp.standalone_barcode || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="block truncate rounded px-2 py-1 text-[11px] font-bold uppercase text-blue-800"
                      title={wp.product_type_name || wp.standalone_type_name || "-"}
                    >
                      {wp.product_type_name || wp.standalone_type_name || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-700">
                    {(wp.product_price || wp.standalone_price || 0) > 0
                      ? `฿${((wp.product_price || wp.standalone_price) || 0).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex flex-col">
                      {editingQty[wp.product_id] ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            className="w-16 rounded-lg border border-blue-400 px-2 py-1 text-sm font-semibold text-center outline-none ring-2 ring-blue-100 transition-all duration-200"
                            min={0}
                            onChange={(e) =>
                              setEditingQtyValues((prev) => ({ ...prev, [wp.product_id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmQtyEdit(wp.product_id);
                              if (e.key === "Escape") cancelQtyEdit(wp.product_id);
                            }}
                            type="number"
                            value={editingQtyValues[wp.product_id] ?? String(wp.quantity)}
                          />
                        </div>
                      ) : (
                        <>
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                              (wp.product_quantity ?? wp.quantity) <= 0
                                ? "text-rose-700"
                                : wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock
                                  ? "text-amber-700"
                                  : "text-slate-900"
                            }`}
                          >
                            {(wp.product_quantity ?? wp.quantity) <= 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                <X className="h-3.5 w-3.5" />
                                หมด
                              </span>
                            ) : (
                              <>
                                {wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock ? (
                                  <AlertTriangle
                                    aria-label="สต็อกต่ำ"
                                    className="h-4 w-4 text-amber-500"
                                  />
                                ) : null}
                                <span>
                                  {wp.product_max_stock != null
                                    ? `${wp.quantity} / ${wp.product_max_stock}`
                                    : wp.quantity}
                                  {wp.product_unit_name || wp.standalone_unit_name ? ` ${wp.product_unit_name || wp.standalone_unit_name}` : ""}
                                </span>
                              </>
                            )}
                          </span>
                          {(wp.product_min_stock != null && wp.product_min_stock > 0) || wp.product_max_stock != null ? (
                            <span
                              className={`mt-0.5 text-[11px] ${
                                (wp.product_quantity ?? wp.quantity) <= 0
                                  ? "text-rose-400"
                                  : wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock
                                    ? "text-amber-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {wp.product_min_stock != null && wp.product_min_stock > 0 ? `Min ${wp.product_min_stock}` : ""}
                              {wp.product_min_stock != null && wp.product_min_stock > 0 && wp.product_max_stock != null ? " / " : ""}
                              {wp.product_max_stock != null ? `Max ${wp.product_max_stock}` : ""}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingQty[wp.product_id] ? (
                        <>
                          <button
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                            onClick={() => confirmQtyEdit(wp.product_id)}
                            type="button"
                          >
                            บันทึก
                          </button>
                          <button
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                            onClick={() => cancelQtyEdit(wp.product_id)}
                            type="button"
                          >
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => startQtyEdit(wp)}
                            title="แก้ไขจำนวน"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                            onClick={() => handleRemoveProduct(wp.product_id)}
                            title={dictionary.deleteLabel}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45"
          onClick={() => { setIsModalOpen(false); resetForm(); }}
        >
          <div
            className="h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                {editingId ? dictionary.editTitle : dictionary.createTitle}
              </p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                {editingId ? dictionary.editTitle : dictionary.createTitle}
              </h2>
            </div>

            <div className="h-[calc(90vh-108px)] overflow-y-auto p-6">
              <div className="flex items-center justify-end">
                <button
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  type="button"
                >
                  {dictionary.cancel}
                </button>
              </div>

              <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900">{dictionary.nameLabel}</h3>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.nameLabel}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">required</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder={dictionary.nameLabel}
                          value={form.name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.codeLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                          placeholder={dictionary.codeLabel}
                          value={form.code}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.phoneLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder={dictionary.phoneLabel}
                          value={form.phone}
                        />
                      </label>
                    </div>
                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.contactNameLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                          placeholder={dictionary.contactNameLabel}
                          value={form.contact_name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.addressLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                          placeholder={dictionary.addressLabel}
                          rows={3}
                          value={form.address}
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <span className="text-sm font-medium text-slate-700">{dictionary.activeLabel}</span>
                    <button
                      aria-checked={form.is_active}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        form.is_active ? "bg-blue-700" : "bg-slate-300"
                      }`}
                      onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                      role="switch"
                      type="button"
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        form.is_active ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </label>
                </section>

                {error && (
                  <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4">
                  <p className="max-w-xl text-sm text-slate-500">{editingId ? dictionary.editTitle : dictionary.createTitle}</p>
                  <div className="flex justify-end gap-3">
                    <button
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => { setIsModalOpen(false); resetForm(); }}
                      type="button"
                    >
                      {dictionary.cancel}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
                      disabled={!isFormValid || isPending}
                      type="submit"
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
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Warehouses Modal */}
      {isManageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45"
          onClick={() => setIsManageModalOpen(false)}
        >
          <div
            className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                  {dictionary.title}
                </p>
                <h3 className="mt-1 text-xl font-bold">{dictionary.title}</h3>
                <p className="mt-0.5 text-sm text-white/80">{warehouses.length} {dictionary.productsLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/30"
                  onClick={openCreateModal}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {dictionary.createButton}
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/20"
                  onClick={() => setIsManageModalOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <WarehouseIcon className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">{dictionary.empty}</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
                      <th className="w-[28%] rounded-l-lg px-4 py-3 font-bold">{dictionary.nameLabel}</th>
                      <th className="w-[16%] px-4 py-3 font-bold">{dictionary.codeLabel}</th>
                      <th className="w-[18%] px-4 py-3 font-bold">{dictionary.phoneLabel}</th>
                      <th className="w-[20%] px-4 py-3 font-bold">{dictionary.contactNameLabel}</th>
                      <th className="w-[8%] px-4 py-3 text-center font-bold">Status</th>
                      <th className="w-[10%] rounded-r-lg px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warehouses.map((warehouse, wi) => (
                      <tr key={warehouse.id} className={`${wi % 2 === 1 ? "bg-slate-50/50" : "bg-white"} transition hover:bg-slate-50`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <WarehouseIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate text-sm font-medium text-slate-900">{warehouse.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{warehouse.code ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{warehouse.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{warehouse.contact_name ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            warehouse.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}>
                            {warehouse.is_active ? dictionary.activeLabel : dictionary.inactiveLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => { setIsManageModalOpen(false); openEditModal(warehouse); }}
                              title={dictionary.editLabel}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {deleteConfirmId === warehouse.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  className="inline-flex h-6 items-center rounded-lg bg-red-600 px-2 text-[10px] font-semibold text-white transition hover:bg-red-700"
                                  onClick={() => handleDelete(warehouse.id)}
                                  type="button"
                                >
                                  {dictionary.deleteConfirm}
                                </button>
                                <button
                                  className="inline-flex h-6 items-center rounded-lg bg-slate-100 px-2 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200"
                                  onClick={() => setDeleteConfirmId(null)}
                                  type="button"
                                >
                                  {dictionary.cancel}
                                </button>
                              </div>
                            ) : (
                              <button
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
