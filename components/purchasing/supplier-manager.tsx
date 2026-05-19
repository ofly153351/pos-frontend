"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import {
  addSupplierProduct,
  createSupplier,
  createSupplierProduct,
  deleteSupplier,
  listSupplierProducts,
  listSuppliers,
  removeSupplierProduct,
  updateSupplier,
  updateSupplierProduct,
  type Supplier,
  type SupplierProduct,
} from "@/services/suppliers";
import { listProducts } from "@/services/products";
import type { Product } from "@/types/product";

type SupplierManagerProps = {
  dictionary: {
    title: string;
    createSupplier: string;
    editSupplier: string;
    supplierName: string;
    supplierPhone: string;
    contactPerson: string;
    address: string;
    taxId: string;
    note: string;
    supplierIsActive: string;
    save: string;
    saving: string;
    cancel: string;
    deleteConfirm: string;
    deleteLabel: string;
    successCreated: string;
    successUpdated: string;
    successDeleted: string;
    loading: string;
    emptySuppliers: string;
    requestFailed: string;
    tableActions: string;
    supplierProducts: string;
    addProduct: string;
    editProduct: string;
    removeProduct: string;
    noProducts: string;
    searchProduct: string;
    supplierSKU: string;
    supplierPrice: string;
    productName: string;
    productSKU: string;
    confirmRemoveProduct: string;
    productRemoved: string;
    productAdded: string;
    productUpdated: string;
    selectExistingProduct: string;
    createNewProduct: string;
    productNameRequired: string;
    basePrice: string;
  };
};

type SupplierFormData = {
  name: string;
  phone: string;
  address: string;
  tax_id: string;
  contact_person: string;
  note: string;
  is_active: boolean;
};

const initialFormData: SupplierFormData = {
  name: "",
  phone: "",
  address: "",
  tax_id: "",
  contact_person: "",
  note: "",
  is_active: true,
};

export function SupplierManager({ dictionary }: SupplierManagerProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [productMode, setProductMode] = useState<"existing" | "create">("existing");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  // Supplier products state
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [productFormData, setProductFormData] = useState({
    product_id: "",
    supplier_sku: "",
    supplier_price: 0,
    product_name: "",
    sku: "",
    barcode: "",
    base_price: 0,
  });
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (isModalOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isModalOpen]);

  // Close product search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    if (showProductDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProductDropdown]);

  const {
    data: suppliers = [],
    error: queryError,
  } = useQuery<Supplier[]>({
    queryFn: async () => {
      const response = await listSuppliers();
      return response.data ?? [];
    },
    queryKey: ["suppliers"],
  });

  // Fetch supplier products when expanded
  const {
    data: supplierProducts = [],
  } = useQuery<SupplierProduct[]>({
    queryFn: async () => {
      if (!expandedSupplierId) return [];
      const response = await listSupplierProducts(expandedSupplierId);
      return response.data ?? [];
    },
    queryKey: ["supplier-products", expandedSupplierId],
    enabled: !!expandedSupplierId,
  });

  // Fetch products for the add product search
  const {
    data: allProductsData,
  } = useQuery({
    queryFn: async () => {
      const response = await listProducts({ limit: 200 });
      return response.data;
    },
    queryKey: ["products-for-supplier"],
    enabled: isProductModalOpen,
  });

  const allProducts = allProductsData?.items ?? [];
  const filteredProducts = allProducts.filter((p: Product) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase()),
  );

  const resolvedError = error || (queryError instanceof Error ? queryError.message : "");

  function openCreateModal() {
    setEditingId(null);
    setFormData(initialFormData);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      tax_id: supplier.tax_id ?? "",
      contact_person: supplier.contact_person ?? "",
      note: supplier.note ?? "",
      is_active: supplier.is_active,
    });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
    setError("");
  }

  async function handleSave() {
    setError("");

    if (!formData.name.trim()) {
      setError(dictionary.supplierName + " is required");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateSupplier(editingId, formData);
        } else {
          await createSupplier(formData);
        }
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : dictionary.requestFailed);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm(dictionary.deleteConfirm)) return;

    try {
      await deleteSupplier(id);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (expandedSupplierId === id) setExpandedSupplierId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : dictionary.requestFailed);
    }
  }

  // ---- Supplier Products handlers ----

  function toggleExpandSupplier(supplierId: string) {
    setExpandedSupplierId((prev) => (prev === supplierId ? null : supplierId));
  }

  function openAddProductModal() {
    setEditingProduct(null);
    setProductMode("existing");
    setProductFormData({ product_id: "", supplier_sku: "", supplier_price: 0, product_name: "", sku: "", barcode: "", base_price: 0 });
    setProductSearch("");
    setError("");
    setIsProductModalOpen(true);
  }

  function openEditProductModal(product: SupplierProduct) {
    setEditingProduct(product);
    setProductFormData({
      product_id: product.product_id,
      supplier_sku: product.supplier_sku,
      supplier_price: product.supplier_price,
      product_name: product.product_name,
      sku: "",
      barcode: "",
      base_price: 0,
    });
    setError("");
    setIsProductModalOpen(true);
  }

  function closeProductModal() {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductFormData({ product_id: "", supplier_sku: "", supplier_price: 0, product_name: "", sku: "", barcode: "", base_price: 0 });
    setProductSearch("");
    setShowProductDropdown(false);
    setError("");
  }

  function selectProduct(product: Product) {
    setProductFormData((prev) => ({
      ...prev,
      product_id: product.id,
      product_name: product.name,
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  }

  async function handleSaveProduct() {
    setError("");

    if (!editingProduct && productMode === "existing" && !productFormData.product_id) {
      setError(dictionary.searchProduct + " is required");
      return;
    }
    if (!editingProduct && productMode === "create" && !productFormData.product_name.trim()) {
      setError(dictionary.productNameRequired);
      return;
    }

    startTransition(async () => {
      try {
        const supplierId = expandedSupplierId;
        if (!supplierId) return;

        if (editingProduct) {
          await updateSupplierProduct(supplierId, editingProduct.product_id, {
            supplier_sku: productFormData.supplier_sku,
            supplier_price: productFormData.supplier_price,
          });
        } else if (productMode === "create") {
          await createSupplierProduct(supplierId, {
            name: productFormData.product_name,
            sku: productFormData.sku || undefined,
            barcode: productFormData.barcode || undefined,
            base_price: productFormData.base_price || undefined,
            supplier_sku: productFormData.supplier_sku,
            supplier_price: productFormData.supplier_price,
          });
        } else {
          await addSupplierProduct(supplierId, {
            product_id: productFormData.product_id,
            supplier_sku: productFormData.supplier_sku,
            supplier_price: productFormData.supplier_price,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["supplier-products", supplierId] });
        closeProductModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : dictionary.requestFailed);
      }
    });
  }

  async function handleRemoveProduct(product: SupplierProduct) {
    if (!window.confirm(dictionary.confirmRemoveProduct)) return;
    if (!expandedSupplierId) return;

    try {
      await removeSupplierProduct(expandedSupplierId, product.product_id);
      queryClient.invalidateQueries({ queryKey: ["supplier-products", expandedSupplierId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : dictionary.requestFailed);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">{dictionary.title}</h3>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            onClick={openCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.createSupplier}
          </button>
        </div>

        {resolvedError ? (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{resolvedError}</p>
        ) : null}

        {suppliers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{dictionary.emptySuppliers}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3 pr-2 w-8"></th>
                  <th className="pb-3 pr-4">{dictionary.supplierName}</th>
                  <th className="pb-3 pr-4">{dictionary.supplierPhone}</th>
                  <th className="pb-3 pr-4">{dictionary.contactPerson}</th>
                  <th className="pb-3 pr-4">{dictionary.taxId}</th>
                  <th className="pb-3 pr-4">{dictionary.supplierIsActive}</th>
                  <th className="pb-3 text-right">{dictionary.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const isExpanded = expandedSupplierId === supplier.id;
                  return (
                    <tr key={supplier.id} className="border-b border-slate-100 text-slate-700">
                      <td className="py-3 pr-2">
                        <button
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          onClick={() => toggleExpandSupplier(supplier.id)}
                          title={dictionary.supplierProducts}
                          type="button"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-medium">{supplier.name}</td>
                      <td className="py-3 pr-4">{supplier.phone || "-"}</td>
                      <td className="py-3 pr-4">{supplier.contact_person || "-"}</td>
                      <td className="py-3 pr-4">{supplier.tax_id || "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          supplier.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {supplier.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => openEditModal(supplier)}
                            title={dictionary.editSupplier}
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => handleDelete(supplier.id)}
                            title={dictionary.deleteLabel}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded supplier products section */}
            {expandedSupplierId && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700">
                    {dictionary.supplierProducts}
                  </h4>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                    onClick={openAddProductModal}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {dictionary.addProduct}
                  </button>
                </div>

                {supplierProducts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">{dictionary.noProducts}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-300 text-xs font-semibold uppercase text-slate-500">
                          <th className="pb-2 pr-3">{dictionary.productName}</th>
                          <th className="pb-2 pr-3">{dictionary.productSKU}</th>
                          <th className="pb-2 pr-3">{dictionary.supplierSKU}</th>
                          <th className="pb-2 pr-3">{dictionary.supplierPrice}</th>
                          <th className="pb-2 text-right">{dictionary.tableActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierProducts.map((sp) => (
                          <tr key={sp.id} className="border-b border-slate-200 text-slate-600">
                            <td className="py-2 pr-3 font-medium text-slate-700">{sp.product_name}</td>
                            <td className="py-2 pr-3">{sp.product_sku || "-"}</td>
                            <td className="py-2 pr-3">{sp.supplier_sku || "-"}</td>
                            <td className="py-2 pr-3">
                              {sp.supplier_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  className="rounded-md p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  onClick={() => openEditProductModal(sp)}
                                  title={dictionary.editProduct}
                                  type="button"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  onClick={() => handleRemoveProduct(sp)}
                                  title={dictionary.removeProduct}
                                  type="button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Supplier CRUD Modal */}
      {isModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.15)]">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-900">
                  {editingId ? dictionary.editSupplier : dictionary.createSupplier}
                </h4>
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  onClick={closeModal}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error ? (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {dictionary.supplierName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={dictionary.supplierName}
                    type="text"
                    value={formData.name}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.supplierPhone}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={dictionary.supplierPhone}
                      type="text"
                      value={formData.phone}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.contactPerson}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder={dictionary.contactPerson}
                      type="text"
                      value={formData.contact_person}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {dictionary.address}
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={dictionary.address}
                    rows={2}
                    value={formData.address}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.taxId}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder={dictionary.taxId}
                      type="text"
                      value={formData.tax_id}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.note}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder={dictionary.note}
                      type="text"
                      value={formData.note}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    checked={formData.is_active}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    id="is-active"
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    type="checkbox"
                  />
                  <label className="text-sm font-medium text-slate-700" htmlFor="is-active">
                    {dictionary.supplierIsActive}
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  onClick={closeModal}
                  type="button"
                >
                  {dictionary.cancel}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
      ) : null}

      {/* Supplier Product Add/Edit Modal */}
      {isProductModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeProductModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.15)]">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-900">
                  {editingProduct ? dictionary.editProduct : dictionary.addProduct}
                </h4>
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  onClick={closeProductModal}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error ? (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
              ) : null}

              <div className="space-y-4">
                {/* Tab toggle — only for add mode, not edit */}
                {!editingProduct && (
                  <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        productMode === "existing"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => setProductMode("existing")}
                      type="button"
                    >
                      {dictionary.selectExistingProduct}
                    </button>
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        productMode === "create"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => setProductMode("create")}
                      type="button"
                    >
                      {dictionary.createNewProduct}
                    </button>
                  </div>
                )}

                {/* Existing product — search combobox */}
                {!editingProduct && productMode === "existing" && (
                  <div ref={productSearchRef} className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.searchProduct} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-xl border border-slate-200 px-9 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (!e.target.value) {
                            setProductFormData((prev) => ({ ...prev, product_id: "", product_name: "" }));
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder={dictionary.searchProduct}
                        type="text"
                        value={productSearch}
                      />
                    </div>
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredProducts.map((product: Product) => (
                          <button
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                            key={product.id}
                            onClick={() => selectProduct(product)}
                            type="button"
                          >
                            <span className="font-medium text-slate-700">{product.name}</span>
                            {product.sku && (
                              <span className="text-xs text-slate-400">({product.sku})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {productFormData.product_id && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ {productFormData.product_name}
                      </p>
                    )}
                  </div>
                )}

                {/* Create new product form */}
                {!editingProduct && productMode === "create" && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {dictionary.productName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        onChange={(e) =>
                          setProductFormData({ ...productFormData, product_name: e.target.value, product_id: "new" })
                        }
                        placeholder={dictionary.productName}
                        type="text"
                        value={productFormData.product_name}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          SKU
                        </label>
                        <input
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, sku: e.target.value })
                          }
                          placeholder="SKU"
                          type="text"
                          value={productFormData.sku}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {dictionary.basePrice}
                        </label>
                        <input
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          min={0}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, base_price: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={productFormData.base_price}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Barcode
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        onChange={(e) =>
                          setProductFormData({ ...productFormData, barcode: e.target.value })
                        }
                        placeholder="Barcode"
                        type="text"
                          value={productFormData.barcode}
                      />
                    </div>
                  </div>
                )}

                {/* Show selected product name when editing */}
                {editingProduct && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.productName}
                    </label>
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                      {productFormData.product_name}
                    </p>
                  </div>
                )}

                {/* Supplier SKU */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.supplierSKU}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, supplier_sku: e.target.value })
                      }
                      placeholder={dictionary.supplierSKU}
                      type="text"
                      value={productFormData.supplier_sku}
                    />
                  </div>

                  {/* Supplier Price */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {dictionary.supplierPrice}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      min={0}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          supplier_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={productFormData.supplier_price}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  onClick={closeProductModal}
                  type="button"
                >
                  {dictionary.cancel}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={isPending}
                  onClick={handleSaveProduct}
                  type="button"
                >
                  {isPending ? dictionary.saving : dictionary.save}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
