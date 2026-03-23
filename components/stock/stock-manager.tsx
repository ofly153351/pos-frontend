"use client";

import { useEffect, useState, useTransition } from "react";

import { CatalogSetupSection } from "@/components/stock/catalog-setup-section";
import { ProductFormModal } from "@/components/stock/product-form-modal";
import { ProductTypeModal } from "@/components/stock/product-type-modal";
import { ProductUnitModal } from "@/components/stock/product-unit-modal";
import { StockLevelsSection } from "@/components/stock/stock-levels-section";
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

export function StockManager({
  dictionary,
  initialSection = "stock-levels",
}: StockManagerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [error, setError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [unitError, setUnitError] = useState("");

  const [isPending, startTransition] = useTransition();
  const [isTypePending, startTypeTransition] = useTransition();
  const [isUnitPending, startUnitTransition] = useTransition();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

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
        <section className="rounded-2xl bg-white p-6 shadow-sm" id="categories">
          <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
          <p className="mt-3 text-sm text-slate-500">{dictionary.loading}</p>
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

  const lowStockCount = filteredProducts.filter((product) => {
    return Number(product.effective_price ?? 0) > 0 && (product.sku ?? "").length > 0;
  }).length;
  const isCategoriesView = initialSection === "categories";
  const catalogKeyword = catalogSearch.trim().toLowerCase();
  const filteredCatalogTypes = productTypes.filter((productType) => {
    if (!catalogKeyword) return true;
    return (
      productType.name.toLowerCase().includes(catalogKeyword) ||
      (productType.description ?? "").toLowerCase().includes(catalogKeyword)
    );
  });
  const filteredCatalogUnits = productUnits.filter((unit) => {
    if (!catalogKeyword) return true;
    return (
      unit.name.toLowerCase().includes(catalogKeyword) ||
      (unit.description ?? "").toLowerCase().includes(catalogKeyword)
    );
  });

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
      {isCategoriesView ? (
        <CatalogSetupSection
          catalogSearch={catalogSearch}
          isCategoriesView={isCategoriesView}
          managementDictionary={managementDictionary}
          onDeleteType={handleDeleteType}
          onDeleteUnit={handleDeleteUnit}
          onEditType={openEditTypeModal}
          onEditUnit={openEditUnitModal}
          onOpenCreateTypeModal={openCreateTypeModal}
          onOpenCreateUnitModal={openCreateUnitModal}
          onSearchChange={setCatalogSearch}
          onToggleType={handleToggleType}
          onToggleUnit={handleToggleUnit}
          productTypes={filteredCatalogTypes}
          productUnits={filteredCatalogUnits}
          searchPlaceholder={dictionary.searchPlaceholder}
          typeError={typeError}
          unitError={unitError}
          unitsDictionary={unitsDictionary}
        />
      ) : null}

      {!isCategoriesView ? (
        <StockLevelsSection
          dictionary={dictionary}
          emptyState={dictionary.emptyState}
          error={error}
          filteredProducts={filteredProducts}
          isPending={isPending}
          loadingLabel={dictionary.loading}
          lowStockCount={lowStockCount}
          managementDictionary={managementDictionary}
          onDelete={handleDelete}
          onEdit={openEditModal}
          onOpenCreateModal={openCreateModal}
          onSearchChange={setSearch}
          productTypesCount={productTypes.length}
          search={search}
        />
      ) : null}

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
