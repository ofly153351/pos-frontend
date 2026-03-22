"use client";

import { useEffect, useState, useTransition } from "react";

import { ProductFormModal } from "@/components/stock/product-form-modal";
import { ProductTypeModal } from "@/components/stock/product-type-modal";
import { ProductUnitModal } from "@/components/stock/product-unit-modal";
import { ProductsTable } from "@/components/stock/products-table";
import {
  initialProductFormState,
  type ProductFormLabels,
  type StockManagerProps,
} from "@/components/stock/types";
import {
  createProduct,
  createProductType,
  createProductUnit,
  deleteProduct,
  deleteProductType,
  deleteProductUnit,
  listProductTypes,
  listProductUnits,
  listProducts,
  updateProduct,
  updateProductType,
  updateProductUnit,
} from "@/services/products";
import type {
  Product,
  ProductInput,
  ProductType,
  ProductUnit,
} from "@/types/product";

export function StockManager({ dictionary }: StockManagerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [unitError, setUnitError] = useState("");

  const [isPending, startTransition] = useTransition();
  const [isTypePending, startTypeTransition] = useTransition();
  const [isUnitPending, startUnitTransition] = useTransition();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [formState, setFormState] = useState<ProductInput>(initialProductFormState);

  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [typeIsActive, setTypeIsActive] = useState(true);

  const [unitName, setUnitName] = useState("");
  const [unitDescription, setUnitDescription] = useState("");
  const [unitIsActive, setUnitIsActive] = useState(true);

  const unitsDictionary = dictionary.units ?? {
    activateLabel: dictionary.form.unitTypeLabel,
    codeLabel: dictionary.form.unitPiece,
    createButton: dictionary.form.createType,
    deactivateLabel: dictionary.form.unitTypeLabel,
    deleteLabel: dictionary.table.actions,
    descriptionLabel: dictionary.form.unitTypeLabel,
    empty: dictionary.form.unitTypeLabel,
    helper: dictionary.form.unitTypeLabel,
    nameLabel: dictionary.form.unitTypeLabel,
    requiredError: dictionary.form.unitTypeLabel,
    title: dictionary.form.unitTypeLabel,
  };

  const managementDictionary = dictionary.management ?? {
    activeLabel: dictionary.form.activeLabel,
    createTypeButton: dictionary.form.createType,
    createTypeTitle: dictionary.form.createType,
    createUnitButton: unitsDictionary.createButton,
    createUnitTitle: unitsDictionary.title,
    descriptionLabel: unitsDictionary.descriptionLabel,
    editLabel: dictionary.table.editAction,
    expandLabel: dictionary.table.editAction,
    collapseLabel: dictionary.form.cancel,
    editTypeTitle: dictionary.form.save,
    editUnitTitle: dictionary.form.save,
    helper: unitsDictionary.helper,
    inactiveLabel: dictionary.table.actions,
    saveTypeButton: dictionary.form.save,
    saveUnitButton: dictionary.form.save,
    title: dictionary.form.categoryLabel,
    typeEmpty: dictionary.emptyState,
    typeNameLabel: dictionary.form.productTypeNameLabel,
    typeRequiredError: dictionary.form.productTypeNameLabel,
    typeSlugLabel: dictionary.form.productTypeSlugLabel,
    typeTitle: dictionary.form.categoryLabel,
    typesCountLabel: dictionary.stats.categoriesLabel,
    unitEmpty: unitsDictionary.empty,
    unitTitle: unitsDictionary.title,
    unitsCountLabel: unitsDictionary.title,
  };

  const formLabels: ProductFormLabels = {
    ...dictionary.form,
    activeHint: dictionary.form.activeHint || dictionary.form.activeLabel,
    amountLabel: dictionary.form.amountLabel || dictionary.form.pricingSection || dictionary.form.basePriceLabel,
    basePriceHint: dictionary.form.basePriceHint || dictionary.form.basePriceLabel,
    categoryHint: dictionary.form.categoryHint || dictionary.form.categoryLabel,
    detailsSection: dictionary.form.detailsSection || dictionary.form.nameLabel,
    detailsSectionHint: dictionary.form.detailsSectionHint || dictionary.form.nameHint || dictionary.form.titleCreate,
    imageHint: dictionary.form.imageHint || dictionary.form.imageLabel,
    nameHint: dictionary.form.nameHint || dictionary.form.nameLabel,
    optionalLabel: dictionary.form.optionalLabel || "-",
    pricingSection: dictionary.form.pricingSection || dictionary.form.amountLabel || dictionary.form.basePriceLabel,
    pricingSectionHint: dictionary.form.pricingSectionHint || dictionary.form.basePriceHint || dictionary.form.basePriceLabel,
    quantityHint: dictionary.form.quantityHint || dictionary.form.quantityLabel,
    requiredLabel: dictionary.form.requiredLabel || "*",
    setupSection: dictionary.form.setupSection || dictionary.form.categoryLabel,
    setupSectionHint: dictionary.form.setupSectionHint || dictionary.form.categoryHint || dictionary.form.categoryLabel,
    skuHint: dictionary.form.skuHint || dictionary.form.skuLabel,
    specialPriceHint: dictionary.form.specialPriceHint || dictionary.form.specialPriceLabel,
    unitTypeHint: dictionary.form.unitTypeHint || dictionary.form.unitTypeLabel,
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [productResponse, typeResponse, unitResponse] = await Promise.all([
          listProducts(),
          listProductTypes(),
          listProductUnits(),
        ]);

        setProducts(productResponse.data ?? []);
        setProductTypes(typeResponse.data ?? []);
        setProductUnits(unitResponse.data ?? []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }, []);

  if (!hasMounted) {
    return (
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-xl border-b-2 border-blue-200 bg-white p-6" />
          <div className="rounded-xl border-b-2 border-rose-200 bg-white p-6" />
          <div className="rounded-xl border-b-2 border-amber-200 bg-white p-6" />
          <div className="rounded-xl bg-blue-700 p-6" />
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {managementDictionary.helper}
              </p>
              <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
            </div>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{dictionary.loading}</p>
        </section>
      </div>
    );
  }

  const filteredProducts = products.filter((product) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(keyword) ||
      (product.sku ?? "").toLowerCase().includes(keyword)
    );
  });

  const totalAssetValue = filteredProducts.reduce((sum, product) => {
    return sum + Number(product.effective_price ?? product.base_price ?? 0);
  }, 0);

  const lowStockCount = filteredProducts.filter((product) => {
    return Number(product.effective_price ?? 0) > 0 && (product.sku ?? "").length > 0;
  }).length;

  const activeUnits = productUnits.filter((unit) => unit.is_active);
  const unitOptions =
    activeUnits.length > 0
      ? activeUnits
      : [
          {
            code: "piece",
            description: unitsDictionary.descriptionLabel,
            id: "unit-piece",
            is_active: true,
            name: dictionary.form.unitPiece,
          },
          {
            code: "pair",
            description: unitsDictionary.descriptionLabel,
            id: "unit-pair",
            is_active: true,
            name: dictionary.form.unitPair,
          },
        ];

  async function reloadData() {
    const [productResponse, typeResponse, unitResponse] = await Promise.all([
      listProducts(),
      listProductTypes(),
      listProductUnits(),
    ]);

    setProducts(productResponse.data ?? []);
    setProductTypes(typeResponse.data ?? []);
    setProductUnits(unitResponse.data ?? []);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setFormState(initialProductFormState);
  }

  function resetTypeForm() {
    setEditingTypeId(null);
    setTypeName("");
    setTypeDescription("");
    setTypeIsActive(true);
    setTypeError("");
  }

  function resetUnitForm() {
    setEditingUnitId(null);
    setUnitName("");
    setUnitDescription("");
    setUnitIsActive(true);
    setUnitError("");
  }

  function openCreateModal() {
    resetProductForm();
    setIsProductModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProductId(product.id);
    setFormState({
      base_price: String(product.base_price ?? ""),
      is_active: product.is_active,
      name: product.name,
      product_type_id: product.product_type_id ?? "",
      quantity: String(product.quantity ?? 0),
      sku: product.sku ?? "",
      special_price: product.special_price ? String(product.special_price) : "",
      unit_type: product.unit_type,
    });
    setIsProductModalOpen(true);
  }

  function closeProductModal() {
    setIsProductModalOpen(false);
    resetProductForm();
  }

  function openCreateTypeModal() {
    resetTypeForm();
    setIsTypeModalOpen(true);
  }

  function openEditTypeModal(productType: ProductType) {
    setEditingTypeId(productType.id);
    setTypeName(productType.name);
    setTypeDescription(productType.description ?? "");
    setTypeIsActive(productType.is_active);
    setTypeError("");
    setIsTypeModalOpen(true);
  }

  function closeTypeModal() {
    setIsTypeModalOpen(false);
    resetTypeForm();
  }

  function openCreateUnitModal() {
    resetUnitForm();
    setIsUnitModalOpen(true);
  }

  function openEditUnitModal(unit: ProductUnit) {
    setEditingUnitId(unit.id);
    setUnitName(unit.name);
    setUnitDescription(unit.description ?? "");
    setUnitIsActive(unit.is_active);
    setUnitError("");
    setIsUnitModalOpen(true);
  }

  function closeUnitModal() {
    setIsUnitModalOpen(false);
    resetUnitForm();
  }

  async function handleSaveType() {
    setTypeError("");

    if (!typeName.trim()) {
      setTypeError(managementDictionary.typeRequiredError);
      return;
    }

    startTypeTransition(async () => {
      try {
        const payload = {
          description: typeDescription.trim() || undefined,
          is_active: typeIsActive,
          name: typeName.trim(),
        };

        if (editingTypeId) {
          await updateProductType(editingTypeId, payload);
        } else {
          await createProductType(payload);
        }

        await reloadData();
        closeTypeModal();
      } catch (nextError) {
        setTypeError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleToggleType(productType: ProductType) {
    setTypeError("");

    startTypeTransition(async () => {
      try {
        await updateProductType(productType.id, {
          description: productType.description ?? undefined,
          is_active: !productType.is_active,
          name: productType.name,
        });

        await reloadData();
      } catch (nextError) {
        setTypeError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleDeleteType(productTypeId: string) {
    setTypeError("");

    startTypeTransition(async () => {
      try {
        await deleteProductType(productTypeId);
        await reloadData();
      } catch (nextError) {
        setTypeError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleSaveUnit() {
    setUnitError("");

    if (!unitName.trim()) {
      setUnitError(unitsDictionary.requiredError);
      return;
    }

    startUnitTransition(async () => {
      try {
        const payload = {
          description: unitDescription.trim() || undefined,
          is_active: unitIsActive,
          name: unitName.trim(),
        };

        if (editingUnitId) {
          await updateProductUnit(editingUnitId, payload);
        } else {
          await createProductUnit(payload);
        }

        await reloadData();
        closeUnitModal();
      } catch (nextError) {
        setUnitError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleToggleUnit(unit: ProductUnit) {
    setUnitError("");

    startUnitTransition(async () => {
      try {
        await updateProductUnit(unit.id, {
          description: unit.description ?? undefined,
          is_active: !unit.is_active,
          name: unit.name,
        });

        await reloadData();
      } catch (nextError) {
        setUnitError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleDeleteUnit(unitId: string) {
    setUnitError("");

    startUnitTransition(async () => {
      try {
        await deleteProductUnit(unitId);
        await reloadData();
      } catch (nextError) {
        setUnitError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        if (editingProductId) {
          await updateProduct(editingProductId, formState);
        } else {
          await createProduct(formState);
        }

        await reloadData();
        closeProductModal();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleDelete(productId: string) {
    setError("");

    startTransition(async () => {
      try {
        await deleteProduct(productId);
        await reloadData();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border-b-2 border-blue-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.stats.totalProductsLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">
            {filteredProducts.length}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-rose-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.stats.lowStockLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-rose-600">
            {lowStockCount}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-amber-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.stats.categoriesLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {productTypes.length}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-blue-700 p-6 text-white shadow-xl">
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              {dictionary.quickAction.label}
            </span>
            <h3 className="mt-1 text-xl font-bold">{dictionary.quickAction.title}</h3>
            <button
              className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/30"
              onClick={openCreateModal}
              type="button"
            >
              {dictionary.quickAction.button}
            </button>
          </div>
          <div className="absolute -bottom-8 -right-4 text-8xl font-black text-white/10">
            ST
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              aria-expanded={isCatalogExpanded}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => setIsCatalogExpanded((current) => !current)}
              type="button"
            >
              <span>
                {isCatalogExpanded
                  ? managementDictionary.collapseLabel
                  : managementDictionary.expandLabel}
              </span>
              <svg
                aria-hidden="true"
                className={`h-4 w-4 transition-transform ${isCatalogExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={openCreateTypeModal}
              type="button"
            >
              {managementDictionary.createTypeButton}
            </button>
            <button
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              onClick={openCreateUnitModal}
              type="button"
            >
              {managementDictionary.createUnitButton}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {managementDictionary.typeTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {managementDictionary.typesCountLabel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                  {productTypes.length}
                </span>
              </div>
            </div>

            {isCatalogExpanded ? productTypes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {productTypes.map((productType) => (
                  <div
                    key={productType.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {productType.name}
                        </p>
                        {productType.description ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {productType.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          productType.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {productType.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => openEditTypeModal(productType)}
                        type="button"
                      >
                        {managementDictionary.editLabel}
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => handleToggleType(productType)}
                        type="button"
                      >
                        {productType.is_active
                          ? unitsDictionary.deactivateLabel
                          : unitsDictionary.activateLabel}
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => handleDeleteType(productType.id)}
                        type="button"
                      >
                        {unitsDictionary.deleteLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{managementDictionary.typeEmpty}</p>
            ) : null}

            {isCatalogExpanded && typeError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {typeError}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {managementDictionary.unitTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {managementDictionary.unitsCountLabel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                  {productUnits.length}
                </span>
              </div>
            </div>

            {isCatalogExpanded ? productUnits.length > 0 ? (
              <div className="mt-4 space-y-3">
                {productUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {unit.name}
                        </p>
                        {unit.description ? (
                          <p className="mt-2 text-xs text-slate-500">{unit.description}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          unit.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {unit.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => openEditUnitModal(unit)}
                        type="button"
                      >
                        {managementDictionary.editLabel}
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => handleToggleUnit(unit)}
                        type="button"
                      >
                        {unit.is_active
                          ? unitsDictionary.deactivateLabel
                          : unitsDictionary.activateLabel}
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => handleDeleteUnit(unit.id)}
                        type="button"
                      >
                        {unitsDictionary.deleteLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{managementDictionary.unitEmpty}</p>
            ) : null}

            {isCatalogExpanded && unitError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {unitError}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">
              {dictionary.filters.categoryLabel}
            </label>
            <div className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700">
              {productTypes.length}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">
              {dictionary.filters.statusLabel}
            </label>
            <div className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700">
              {isPending ? dictionary.loading : filteredProducts.length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="rounded-lg border-none bg-white px-4 py-2 text-sm text-slate-700 outline-none ring-0 focus:ring-2 focus:ring-blue-500/20"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dictionary.searchPlaceholder}
            value={search}
          />
          <button
            className="rounded-lg p-2 text-slate-400 transition hover:text-blue-600"
            type="button"
          >
            {dictionary.filters.gridView}
          </button>
          <button
            className="rounded-lg bg-white p-2 text-blue-700 shadow-sm"
            type="button"
          >
            {dictionary.filters.listView}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ProductsTable
        emptyState={dictionary.emptyState}
        isPending={isPending}
        loadingLabel={dictionary.loading}
        managementDictionary={managementDictionary}
        onDelete={handleDelete}
        onEdit={openEditModal}
        products={filteredProducts}
        tableDictionary={dictionary.table}
      />

      <div className="flex justify-end pt-2">
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-slate-200 p-8">
          <span className="relative z-10 text-sm font-bold uppercase tracking-widest text-slate-500">
            {dictionary.assetValue.label}
          </span>
          <p className="relative z-10 mt-2 text-4xl font-extrabold tracking-tight text-blue-700">
            {totalAssetValue.toFixed(2)}
          </p>
        </div>
      </div>

      <ProductTypeModal
        cancelLabel={dictionary.form.cancel}
        description={typeDescription}
        error={typeError}
        isActive={typeIsActive}
        isEditing={Boolean(editingTypeId)}
        isOpen={isTypeModalOpen}
        isPending={isTypePending}
        managementDictionary={managementDictionary}
        name={typeName}
        onActiveChange={setTypeIsActive}
        onClose={closeTypeModal}
        onDescriptionChange={setTypeDescription}
        onNameChange={setTypeName}
        onSubmit={handleSaveType}
      />

      <ProductUnitModal
        activeLabel={dictionary.form.activeLabel}
        cancelLabel={dictionary.form.cancel}
        description={unitDescription}
        error={unitError}
        isActive={unitIsActive}
        isEditing={Boolean(editingUnitId)}
        isOpen={isUnitModalOpen}
        isPending={isUnitPending}
        name={unitName}
        onActiveChange={setUnitIsActive}
        onClose={closeUnitModal}
        onDescriptionChange={setUnitDescription}
        onNameChange={setUnitName}
        onSubmit={handleSaveUnit}
        submitLabel={
          editingUnitId ? managementDictionary.saveUnitButton : managementDictionary.createUnitButton
        }
        title={
          editingUnitId ? managementDictionary.editUnitTitle : managementDictionary.createUnitTitle
        }
        unitsDictionary={unitsDictionary}
      />

      <ProductFormModal
        closeLabel={formLabels.cancel}
        formLabels={formLabels}
        formState={formState}
        isEditing={Boolean(editingProductId)}
        isOpen={isProductModalOpen}
        isPending={isPending}
        managementDictionary={managementDictionary}
        onClose={closeProductModal}
        onFormStateChange={setFormState}
        onSubmit={handleSubmit}
        productTypes={productTypes}
        quickActionLabel={dictionary.quickAction.label}
        unitOptions={unitOptions}
      />
    </div>
  );
}
