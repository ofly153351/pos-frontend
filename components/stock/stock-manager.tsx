"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { CatalogSetupSection } from "@/components/stock/catalog-setup-section";
import { ProductBrandModal } from "@/components/stock/product-brand-modal";
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
  createProductBrand,
  createProductType,
  createProductUnit,
  deleteProduct,
  deleteProductBrand,
  deleteProductType,
  deleteProductUnit,
  listProductBrands,
  listProductTypes,
  listProductUnits,
  listProducts,
  updateProduct,
  updateProductBrand,
  updateProductType,
  updateProductUnit,
} from "@/services/products";
import type {
  ProductBrand,
  Product,
  ProductInput,
  ProductType,
  ProductUnit,
} from "@/types/product";

type ProductStockStatus = "all" | "active" | "inactive" | "low_stock" | "out_of_stock";

const LOW_STOCK_THRESHOLD = 10;

function isLowStockProduct(product: Product) {
  const stock = product.total_stock ?? 0;
  if (stock <= 0) return false;
  if (product.max_stock != null && stock < product.max_stock / 2) return true;
  if (product.min_stock != null && product.min_stock > 0 && stock <= product.min_stock) return true;
  return (product.min_stock == null || product.min_stock === 0) && product.max_stock == null && stock > 0 && stock <= 10;
}

export function StockManager({
  dictionary,
  initialSection = "stock-levels",
}: StockManagerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [productPageSize, setProductPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("stock-page-size");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([5, 10, 15, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 5;
  });
  const [hasMounted, setHasMounted] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [selectedProductUnitId, setSelectedProductUnitId] = useState("");
  const [selectedProductBrandId, setSelectedProductBrandId] = useState("");
  const [selectedStockStatus, setSelectedStockStatus] =
    useState<ProductStockStatus>("all");
  const [error, setError] = useState("");
  const [brandError, setBrandError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [unitError, setUnitError] = useState("");

  const [isBrandPending, startBrandTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [isTypePending, startTypeTransition] = useTransition();
  const [isUnitPending, startUnitTransition] = useTransition();

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [formState, setFormState] = useState<ProductInput>(initialProductFormState);

  const [brandName, setBrandName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandIsActive, setBrandIsActive] = useState(true);
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
    createBrandButton: unitsDictionary.createButton,
    createBrandTitle: unitsDictionary.title,
    createUnitButton: unitsDictionary.createButton,
    createUnitTitle: unitsDictionary.title,
    descriptionLabel: unitsDictionary.descriptionLabel,
    editLabel: dictionary.table.editAction,
    expandLabel: dictionary.table.editAction,
    collapseLabel: dictionary.form.cancel,
    editTypeTitle: dictionary.form.save,
    editUnitTitle: dictionary.form.save,
    editBrandTitle: dictionary.form.save,
    helper: unitsDictionary.helper,
    inactiveLabel: dictionary.table.actions,
    saveTypeButton: dictionary.form.save,
    saveUnitButton: dictionary.form.save,
    saveBrandButton: dictionary.form.save,
    title: dictionary.form.categoryLabel,
    typeEmpty: dictionary.emptyState,
    typeNameLabel: dictionary.form.productTypeNameLabel,
    brandNameLabel: dictionary.form.brandLabel,
    typeRequiredError: dictionary.form.productTypeNameLabel,
    typeSlugLabel: dictionary.form.productTypeSlugLabel,
    typeTitle: dictionary.form.categoryLabel,
    typesCountLabel: dictionary.stats.categoriesLabel,
    brandTitle: dictionary.form.brandLabel,
    brandsCountLabel: dictionary.form.brandLabel,
    brandEmpty: dictionary.emptyState,
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
    minStockHint: dictionary.form.minStockHint || dictionary.form.minStockLabel,
    minStockLabel: dictionary.form.minStockLabel || "Min stock",
    maxStockHint: dictionary.form.maxStockHint || dictionary.form.maxStockLabel,
    maxStockLabel: dictionary.form.maxStockLabel || "Max stock",
    requiredLabel: dictionary.form.requiredLabel || "*",
    setupSection: dictionary.form.setupSection || dictionary.form.categoryLabel,
    setupSectionHint: dictionary.form.setupSectionHint || dictionary.form.categoryHint || dictionary.form.categoryLabel,
    skuHint: dictionary.form.skuHint || dictionary.form.skuLabel,
    barcodeHint: dictionary.form.barcodeHint || dictionary.form.barcodeLabel,
    barcodeLabel: dictionary.form.barcodeLabel || "Barcode",
    specialPriceHint: dictionary.form.specialPriceHint || dictionary.form.specialPriceLabel,
    unitTypeHint: dictionary.form.unitTypeHint || dictionary.form.unitTypeLabel,
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const {
    data: productBrands = [],
    error: productBrandsQueryError,
  } = useQuery<ProductBrand[]>({
    enabled: hasMounted,
    queryFn: async () => {
      const response = await listProductBrands();
      return response.data ?? [];
    },
    queryKey: ["stock", "product-brands"],
  });

  const {
    data: productTypes = [],
    error: productTypesQueryError,
  } = useQuery<ProductType[]>({
    enabled: hasMounted,
    queryFn: async () => {
      const response = await listProductTypes();
      return response.data ?? [];
    },
    queryKey: ["stock", "product-types"],
  });

  const {
    data: productUnits = [],
    error: productUnitsQueryError,
  } = useQuery<ProductUnit[]>({
    enabled: hasMounted,
    queryFn: async () => {
      const response = await listProductUnits();
      return response.data ?? [];
    },
    queryKey: ["stock", "product-units"],
  });

  const productsQuery = useQuery({
    enabled: hasMounted,
    queryFn: async () => {
      const response = await listProducts({
        limit: productPageSize,
        page: productPage,
      });
      return response.data;
    },
    queryKey: ["stock", "products", productPage, productPageSize],
  });

  // Correct page if it exceeds total pages after data changes
  useEffect(() => {
    if (!productsQuery.data) return;
    const nextTotalPages = Math.max(productsQuery.data.total_pages ?? 1, 1);
    if (productPage > nextTotalPages) {
      setProductPage(nextTotalPages);
    }
  }, [productsQuery.data, productPage]);

  const products = productsQuery.data?.items ?? [];
  const productTotal = productsQuery.data?.total ?? 0;
  const productTotalPages = Math.max(
    productsQuery.data?.total_pages ?? 1,
    1,
  );
  const isProductsFetching = productsQuery.isFetching;
  const productsQueryError = productsQuery.error;

  if (!hasMounted) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm" id="categories">
          <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
          <p className="mt-3 inline-flex items-center gap-3 text-sm text-slate-500">
            <svg aria-hidden="true" className="h-5 w-5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            <span className="animate-pulse">{dictionary.loading}</span>
          </p>
        </section>
      </div>
    );
  }

  const filteredProducts = products.filter((product) => {
    const keyword = search.trim().toLowerCase();

    if (
      selectedProductTypeId &&
      product.product_type_id !== selectedProductTypeId
    ) {
      return false;
    }

    const productUnitId = product.product_unit_id ?? product.unit_id;
    if (selectedProductUnitId && productUnitId !== selectedProductUnitId) {
      return false;
    }

    if (
      selectedProductBrandId &&
      product.brand_id !== selectedProductBrandId
    ) {
      return false;
    }

    if (selectedStockStatus === "active" && !product.is_active) {
      return false;
    }

    if (selectedStockStatus === "inactive" && product.is_active) {
      return false;
    }

    if (selectedStockStatus === "low_stock" && !isLowStockProduct(product)) {
      return false;
    }

    if (selectedStockStatus === "out_of_stock" && (product.total_stock ?? 0) > 0) {
      return false;
    }

    if (keyword) {
      return (
        product.name.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword)
      );
    }

    return true;
  });

  const lowStockCount = filteredProducts.filter((product) => {
    return isLowStockProduct(product);
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
  const filteredCatalogBrands = productBrands.filter((brand) => {
    if (!catalogKeyword) return true;
    return (
      brand.name.toLowerCase().includes(catalogKeyword) ||
      (brand.description ?? "").toLowerCase().includes(catalogKeyword)
    );
  });

  const resolvedBrandError =
    brandError ||
    (productBrandsQueryError instanceof Error ? productBrandsQueryError.message : "");
  const resolvedTypeError =
    typeError ||
    (productTypesQueryError instanceof Error ? productTypesQueryError.message : "");
  const resolvedUnitError =
    unitError ||
    (productUnitsQueryError instanceof Error ? productUnitsQueryError.message : "");
  const unitOptions = productUnits;

  async function reloadProductsPage() {
    await queryClient.invalidateQueries({
      queryKey: ["stock", "products"],
    });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setFormState(initialProductFormState);
  }
  function resetBrandForm() {
    setEditingBrandId(null);
    setBrandName("");
    setBrandDescription("");
    setBrandIsActive(true);
    setBrandError("");
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
    setEditingProductId(null);
    setFormState({
      ...initialProductFormState,
      brand_id: productBrands[0]?.id ?? "",
      unit_id: productUnits[0]?.id ?? "",
    });
    setIsProductModalOpen(true);
  }

  function openEditModal(product: Product) {
    const legacyUnitId =
      product.unit_type
        ? productUnits.find((unit) => unit.code === product.unit_type)?.id
        : undefined;

    setEditingProductId(product.id);
    setFormState({
      base_price: String(product.base_price ?? ""),
      brand_id: product.brand_id ?? "",
      is_active: product.is_active,
      name: product.name,
      product_type_id: product.product_type_id ?? "",
      min_stock: product.min_stock != null ? String(product.min_stock) : "",
      max_stock: product.max_stock != null ? String(product.max_stock) : "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      special_price: product.special_price ? String(product.special_price) : "",
      unit_id: product.product_unit_id ?? product.unit_id ?? legacyUnitId ?? "",
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
  function openCreateBrandModal() {
    resetBrandForm();
    setIsBrandModalOpen(true);
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
  function openEditBrandModal(brand: ProductBrand) {
    setEditingBrandId(brand.id);
    setBrandName(brand.name);
    setBrandDescription(brand.description ?? "");
    setBrandIsActive(brand.is_active);
    setBrandError("");
    setIsBrandModalOpen(true);
  }
  function closeBrandModal() {
    setIsBrandModalOpen(false);
    resetBrandForm();
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

        await queryClient.invalidateQueries({ queryKey: ["stock", "product-types"] });
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

        await queryClient.invalidateQueries({ queryKey: ["stock", "product-types"] });
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
        await queryClient.invalidateQueries({ queryKey: ["stock", "product-types"] });
        router.refresh();
      } catch (nextError) {
        setTypeError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }
  async function handleSaveBrand() {
    setBrandError("");
    if (!brandName.trim()) {
      setBrandError(unitsDictionary.requiredError);
      return;
    }
    startBrandTransition(async () => {
      try {
        const payload = {
          description: brandDescription.trim() || undefined,
          is_active: brandIsActive,
          name: brandName.trim(),
        };
        if (editingBrandId) {
          await updateProductBrand(editingBrandId, payload);
        } else {
          await createProductBrand(payload);
        }
        await queryClient.invalidateQueries({ queryKey: ["stock", "product-brands"] });
        closeBrandModal();
      } catch (nextError) {
        setBrandError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }
  async function handleToggleBrand(brand: ProductBrand) {
    setBrandError("");
    startBrandTransition(async () => {
      try {
        await updateProductBrand(brand.id, {
          description: brand.description ?? undefined,
          is_active: !brand.is_active,
          name: brand.name,
        });
        await queryClient.invalidateQueries({ queryKey: ["stock", "product-brands"] });
      } catch (nextError) {
        setBrandError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }
  async function handleDeleteBrand(brandId: string) {
    setBrandError("");
    startBrandTransition(async () => {
      try {
        await deleteProductBrand(brandId);
        await queryClient.invalidateQueries({ queryKey: ["stock", "product-brands"] });
        router.refresh();
      } catch (nextError) {
        setBrandError(nextError instanceof Error ? nextError.message : "Request failed");
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

        await queryClient.invalidateQueries({ queryKey: ["stock", "product-units"] });
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

        await queryClient.invalidateQueries({ queryKey: ["stock", "product-units"] });
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
        await queryClient.invalidateQueries({ queryKey: ["stock", "product-units"] });
        router.refresh();
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

        await reloadProductsPage();
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
        await reloadProductsPage();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleDeleteMany(productIds: string[]) {
    setError("");

    startTransition(async () => {
      try {
        await Promise.all(productIds.map((id) => deleteProduct(id)));
        await reloadProductsPage();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  return (
    <div>
      {isCategoriesView ? (
        <CatalogSetupSection
          brandError={resolvedBrandError}
          catalogSearch={catalogSearch}
          isCategoriesView={isCategoriesView}
          managementDictionary={managementDictionary}
          onDeleteBrand={handleDeleteBrand}
          onDeleteType={handleDeleteType}
          onDeleteUnit={handleDeleteUnit}
          onEditBrand={openEditBrandModal}
          onEditType={openEditTypeModal}
          onEditUnit={openEditUnitModal}
          onOpenCreateBrandModal={openCreateBrandModal}
          onOpenCreateTypeModal={openCreateTypeModal}
          onOpenCreateUnitModal={openCreateUnitModal}
          onSearchChange={setCatalogSearch}
          onToggleBrand={handleToggleBrand}
          onToggleType={handleToggleType}
          onToggleUnit={handleToggleUnit}
          productBrands={filteredCatalogBrands}
          productTypes={filteredCatalogTypes}
          productUnits={filteredCatalogUnits}
          searchPlaceholder={dictionary.searchPlaceholder}
          typeError={resolvedTypeError}
          unitError={resolvedUnitError}
          unitsDictionary={unitsDictionary}
        />
      ) : null}

      {!isCategoriesView ? (
        <StockLevelsSection
          dictionary={dictionary}
          emptyState={dictionary.emptyState}
          error={error || (productsQueryError instanceof Error ? productsQueryError.message : "")}
          filteredProducts={filteredProducts}
          isPending={isPending || isProductsFetching}
          loadingLabel={dictionary.loading}
          lowStockCount={lowStockCount}
          managementDictionary={managementDictionary}
          onPageChange={setProductPage}
          onPageSizeChange={(size) => {
            setProductPageSize(size);
            setProductPage(1);
            localStorage.setItem("stock-page-size", String(size));
          }}
          onDelete={handleDelete}
          onDeleteMany={handleDeleteMany}
          onEdit={openEditModal}
          onOpenCreateModal={openCreateModal}
          onProductTypeFilterChange={(value) => {
            setSelectedProductTypeId(value);
            setProductPage(1);
          }}
          onProductUnitFilterChange={(value) => {
            setSelectedProductUnitId(value);
            setProductPage(1);
          }}
          onProductBrandFilterChange={(value) => {
            setSelectedProductBrandId(value);
            setProductPage(1);
          }}
          onSearchChange={(value) => {
            setSearch(value);
            setProductPage(1);
          }}
          onStockStatusFilterChange={(value) => {
            setSelectedStockStatus(value);
            setProductPage(1);
          }}
          paginationCurrentPage={productPage}
          paginationPageSize={productPageSize}
          paginationTotalItems={productTotal}
          paginationTotalPages={productTotalPages}
          productTypesCount={productTypes.length}
          productTypeFilter={selectedProductTypeId}
          productTypes={productTypes}
          productUnitFilter={selectedProductUnitId}
          productUnits={productUnits}
          productBrandFilter={selectedProductBrandId}
          productBrands={productBrands}
          search={search}
          stockStatusFilter={selectedStockStatus}
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
      <ProductBrandModal
        activeLabel={dictionary.form.activeLabel}
        cancelLabel={dictionary.form.cancel}
        description={brandDescription}
        error={brandError}
        isActive={brandIsActive}
        isOpen={isBrandModalOpen}
        isPending={isBrandPending}
        name={brandName}
        onActiveChange={setBrandIsActive}
        onClose={closeBrandModal}
        onDescriptionChange={setBrandDescription}
        onNameChange={setBrandName}
        onSubmit={handleSaveBrand}
        submitLabel={
          editingBrandId ? managementDictionary.saveBrandButton : managementDictionary.createBrandButton
        }
        title={
          editingBrandId ? managementDictionary.editBrandTitle : managementDictionary.createBrandTitle
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
        productBrands={productBrands}
        productTypes={productTypes}
        quickActionLabel={dictionary.quickAction.label}
        unitOptions={unitOptions}
      />
    </div>
  );
}
