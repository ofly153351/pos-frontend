"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CatalogSetupSection } from "@/components/stock/catalog-setup-section";
import { ProductFormDrawer } from "@/components/stock/product-form-modal";
import { StockAdjustModal } from "@/components/stock/stock-adjust-modal";
import { StockLevelsSection } from "@/components/stock/stock-levels-section";
import {
  initialProductFormState,
  type CategoriesDictionary,
  type ProductFormLabels,
  type StockManagerProps,
} from "@/components/stock/types";
import {
  createProduct,
  deleteProduct,
  listProductBrands,
  listProductTypes,
  listProductUnits,
  listProducts,
  updateProduct,
} from "@/services/products";
import { adjustStock } from "@/services/stock-movements";
import { addSupplierProduct, listSuppliers, type Supplier } from "@/services/suppliers";
import { ApiError } from "@/services/api";
import { friendlyMessage } from "@/lib/form-errors";
import { toast } from "@/components/ui/toast";
import type { Product, ProductBrand, ProductInput, ProductType, ProductUnit } from "@/types/product";

type ProductStockStatus = "all" | "active" | "inactive" | "low_stock" | "out_of_stock";

function isLowStockProduct(product: Product) {
  const stock = product.total_stock ?? 0;
  if (stock <= 0) return false;
  return product.min_stock != null && stock <= product.min_stock;
}

const DEFAULT_CATEGORIES_DICT: CategoriesDictionary = {
  addBrand: "+ Add Brand",
  addType: "+ Add Category",
  addUnit: "+ Add Unit",
  colActions: "Actions",
  colLastModified: "Last Modified",
  colNameBrand: "Brand Name",
  colNameType: "Category Name",
  colNameUnit: "Unit Name",
  colOrder: "Order",
  colProductCount: "Products",
  colStatus: "Status",
  countItems: "items",
  deleteCancel: "Cancel",
  deleteConfirm: "Delete",
  deleteMessage: "Are you sure you want to delete",
  deleteTitle: "Confirm Delete",
  deleteWarning: "This has {count} products. Deleting will unassign them all.",
  emptyAdd: "Click + to add the first item",
  emptyTitle: "No data yet",
  importBrowse: "Browse",
  importCancel: "Cancel",
  importColDesc: "Description",
  importColName: "Name",
  importColStatus: "Status",
  importConfirm: "Import",
  importDropText: "Drag CSV file here or",
  importPreviewTitle: "Data Preview",
  importTitle: "Import Data",
  legendActive: "Active",
  legendDelete: "Delete",
  legendDrag: "Drag to reorder",
  legendEdit: "Edit",
  legendInactive: "Inactive",
  of: "of",
  overviewActive: "Active",
  overviewInactive: "Inactive",
  overviewTitle: "Category Overview",
  overviewTotal: "Total Categories",
  overviewTotalProducts: "Total Products",
  perPage: "/ page",
  popularTitle: "Popular Categories",
  popularViewAll: "View all",
  searchBrands: "Search brands...",
  searchTypes: "Search categories...",
  searchUnits: "Search units...",
  showing: "Showing",
  statusActive: "Active",
  statusAll: "All Status",
  statusInactive: "Inactive",
  tabBrands: "Product Brands",
  tabTypes: "Product Categories",
  tabUnits: "Product Units",
  toolsExport: "Export",
  toolsExportDesc: "Export data as CSV file",
  toolsImport: "Import",
  toolsImportDesc: "Import data from CSV file",
  toolsSort: "Sort Categories",
  toolsSortDesc: "Drag and drop to reorder",
  toolsTitle: "Management Tools",
};

export function StockManager({
  dictionary,
  initialSection = "stock-levels",
  allowStockActions = false,
}: StockManagerProps) {
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
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [selectedProductUnitId, setSelectedProductUnitId] = useState("");
  const [selectedProductBrandId, setSelectedProductBrandId] = useState("");
  const [selectedStockStatus, setSelectedStockStatus] = useState<ProductStockStatus>("all");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductInput>(initialProductFormState);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const unitsDictionary = dictionary.units ?? {
    activateLabel: dictionary.form.activeLabel,
    codeLabel: dictionary.form.unitPiece,
    createButton: dictionary.form.createType,
    deactivateLabel: dictionary.form.activeLabel,
    deleteLabel: dictionary.table.actions,
    descriptionLabel: dictionary.form.descriptionLabel,
    empty: dictionary.emptyState,
    helper: dictionary.form.unitTypeLabel,
    nameLabel: dictionary.form.nameLabel,
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

  const categoriesDictionary = dictionary.categories ?? DEFAULT_CATEGORIES_DICT;

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

    requiredLabel: dictionary.form.requiredLabel || "*",
    setupSection: dictionary.form.setupSection || dictionary.form.categoryLabel,
    setupSectionHint: dictionary.form.setupSectionHint || dictionary.form.categoryHint || dictionary.form.categoryLabel,
    skuHint: dictionary.form.skuHint || dictionary.form.skuLabel,
    barcodeHint: dictionary.form.barcodeHint || dictionary.form.barcodeLabel,
    barcodeLabel: dictionary.form.barcodeLabel || "Barcode",
    specialPriceHint: dictionary.form.specialPriceHint || dictionary.form.specialPriceLabel,
    initialStockLabel: dictionary.form.initialStockLabel || dictionary.form.quantityLabel || "Initial stock",
    initialStockHint: dictionary.form.initialStockHint || dictionary.form.quantityHint || dictionary.form.quantityLabel || "Initial stock",
    supplierLabel: dictionary.form.supplierLabel || "Supplier",
    supplierHint: dictionary.form.supplierHint || dictionary.form.supplierLabel || "Supplier",
    supplierPlaceholder: dictionary.form.supplierPlaceholder || "— Select —",
    supplierEmptyLabel: dictionary.form.supplierEmptyLabel || "No suppliers available",
    unitTypeHint: dictionary.form.unitTypeHint || dictionary.form.unitTypeLabel,
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setHasMounted(true); }, []);

  const { data: productBrands = [] } = useQuery<ProductBrand[]>({
    enabled: hasMounted,
    queryFn: async () => { const r = await listProductBrands(); return r.data ?? []; },
    queryKey: ["stock", "product-brands"],
  });

  const { data: productTypes = [] } = useQuery<ProductType[]>({
    enabled: hasMounted,
    queryFn: async () => { const r = await listProductTypes(); return r.data ?? []; },
    queryKey: ["stock", "product-types"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    enabled: hasMounted,
    queryFn: async () => { const r = await listSuppliers(); return r.data ?? []; },
    queryKey: ["stock", "suppliers"],
  });

  const sortedSupplierOptions = useMemo(
    () =>
      [...suppliers]
        .sort((a, b) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          return a.name.localeCompare(b.name, "th");
        })
        .map((supplier) => ({ id: supplier.id, name: supplier.name })),
    [suppliers],
  );

  const { data: productUnits = [] } = useQuery<ProductUnit[]>({
    enabled: hasMounted,
    queryFn: async () => { const r = await listProductUnits(); return r.data ?? []; },
    queryKey: ["stock", "product-units"],
  });

  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">("created_at");
  const isSearching = search.trim().length > 0;

  const productsQuery = useQuery({
    enabled: hasMounted,
    placeholderData: (prev) => prev, // keep old data while fetching new page/sort — prevents products=[] flash
    queryFn: async () => {
      const response = isSearching
        ? await listProducts({ limit: 9999, page: 1, sort_by: sortBy })
        : await listProducts({ limit: productPageSize, page: productPage, sort_by: sortBy });
      return response.data;
    },
    queryKey: ["stock", "products", isSearching ? "search" : productPage, isSearching ? "all" : productPageSize, sortBy],
  });

  useEffect(() => {
    if (!productsQuery.data) return;
    const nextTotalPages = Math.max(productsQuery.data.total_pages ?? 1, 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (productPage > nextTotalPages) setProductPage(nextTotalPages);
  }, [productsQuery.data, productPage]);

  const products = productsQuery.data?.items ?? [];
  const productTotal = productsQuery.data?.total ?? 0;
  const productTotalPages = Math.max(productsQuery.data?.total_pages ?? 1, 1);
  const isProductsFetching = productsQuery.isFetching;
  const productsQueryError = productsQuery.error;

  if (!hasMounted) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm" id="categories">
          <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
          <p className="mt-3 inline-flex items-center gap-3 text-sm text-slate-500">
            <svg aria-hidden="true" className="h-5 w-5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
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
    if (selectedProductTypeId && product.product_type_id !== selectedProductTypeId) return false;
    const productUnitId = product.product_unit_id ?? product.unit_id;
    if (selectedProductUnitId && productUnitId !== selectedProductUnitId) return false;
    if (selectedProductBrandId && product.brand_id !== selectedProductBrandId) return false;
    if (selectedStockStatus === "active" && !product.is_active) return false;
    if (selectedStockStatus === "inactive" && product.is_active) return false;
    if (selectedStockStatus === "low_stock" && !isLowStockProduct(product)) return false;
    if (selectedStockStatus === "out_of_stock" && (product.total_stock ?? 0) !== 0) return false;
    if (keyword) return product.name.toLowerCase().includes(keyword) || (product.sku ?? "").toLowerCase().includes(keyword);
    return true;
  });

  const isCategoriesView = initialSection === "categories";

function resetProductForm() {
    setEditingProductId(null);
    setFormState(initialProductFormState);
  }

  function openCreateModal() {
    setEditingProductId(null);
    setFormState({ ...initialProductFormState, brand_id: productBrands[0]?.id ?? "", initial_stock: "", supplier_id: "", unit_id: productUnits[0]?.id ?? "" });
    setIsProductModalOpen(true);
  }

  function openEditModal(product: Product) {
    const legacyUnitId = product.unit_type
      ? productUnits.find((unit) => unit.code === product.unit_type)?.id
      : undefined;
    setEditingProductId(product.id);
    setFormState({
      base_price: String(product.base_price ?? ""),
      brand_id: product.brand_id ?? "",
      cost_price: product.cost_price != null ? String(product.cost_price) : "",
      is_active: product.is_active,
      name: product.name,
      product_code: product.product_code ?? "",
      description: product.description ?? "",
      storage_location: product.storage_location ?? "",
      default_location_id: product.default_location_id ?? "",
      product_type_id: product.product_type_id ?? "",
      min_stock: product.min_stock != null ? String(product.min_stock) : "",
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (editingProductId) {
          await updateProduct(editingProductId, formState);
          // Allow linking a supplier during edit too (e.g. it wasn't set on create).
          if (formState.supplier_id) {
            await addSupplierProduct(formState.supplier_id, {
              product_id: editingProductId,
              supplier_price: Number(formState.cost_price || 0),
              supplier_sku: formState.sku?.trim() || "",
            });
          }
        } else {
          const created = await createProduct(formState);
          if (formState.supplier_id) {
            await addSupplierProduct(formState.supplier_id, {
              product_id: created.data.id,
              supplier_price: Number(formState.cost_price || 0),
              supplier_sku: formState.sku?.trim() || "",
            });
          }
          const initialStock = Number(formState.initial_stock || 0);
          if (!Number.isNaN(initialStock) && initialStock > 0) {
            await adjustStock({
              productId: created.data.id,
              physicalQty: initialStock,
              note: formState.storage_location?.trim()
                ? `Initial stock on create • ${formState.storage_location.trim()}`
                : "Initial stock on create",
            });
          }
        }
        closeProductModal();
        queryClient.invalidateQueries({ queryKey: ["stock", "products"] });
      } catch (nextError) {
        const msg = friendlyMessage(nextError);
        setError(msg);
        // Also show inline field errors if available
        if (nextError instanceof ApiError && nextError.fields?.length) {
          const first = nextError.fields[0];
          setError(`${first.field}: ${first.message}`);
        }
      }
    });
  }

  async function handleDelete(productId: string) {
    setError("");
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        queryClient.invalidateQueries({ queryKey: ["stock", "products"] });
        toast.success("ลบสินค้าสำเร็จ");
      } catch (nextError) {
        toast.error(friendlyMessage(nextError));
      }
    });
  }

  async function handleDeleteMany(productIds: string[]) {
    setError("");
    startTransition(async () => {
      try {
        await Promise.all(productIds.map((id) => deleteProduct(id)));
        queryClient.invalidateQueries({ queryKey: ["stock", "products"] });
        toast.success("ลบสินค้าสำเร็จ");
      } catch (nextError) {
        toast.error(friendlyMessage(nextError));
      }
    });
  }

  if (isProductModalOpen) {
    return (
      <div className="w-full xl:px-2 2xl:px-4">
        <ProductFormDrawer
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
          supplierOptions={sortedSupplierOptions}
          unitOptions={productUnits}
        />
      </div>
    );
  }

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {isCategoriesView ? (
        <CatalogSetupSection
          activeLabel={dictionary.form.activeLabel}
          cancelLabel={dictionary.form.cancel}
          categoriesDictionary={categoriesDictionary}
          managementDictionary={managementDictionary}
          totalProducts={productTotal}
          unitsDictionary={unitsDictionary}
        />
      ) : null}

      {!isCategoriesView ? (
        <StockLevelsSection
          dictionary={dictionary}
          allowStockActions={allowStockActions}
          emptyState={dictionary.emptyState}
          error={error || (productsQueryError instanceof Error ? productsQueryError.message : "")}
          filteredProducts={filteredProducts}
          isPending={isPending || isProductsFetching}
          loadingLabel={dictionary.loading}
          managementDictionary={managementDictionary}
          onPageChange={setProductPage}
          onPageSizeChange={(size) => {
            setProductPageSize(size);
            setProductPage(1);
            localStorage.setItem("stock-page-size", String(size));
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onDelete={handleDelete}
          onDeleteMany={handleDeleteMany}
          onEdit={openEditModal}
          onAdjustStock={(product) => setAdjustingProduct(product)}
          onOpenCreateModal={openCreateModal}
          onProductTypeFilterChange={(value) => { setSelectedProductTypeId(value); setProductPage(1); }}
          onProductUnitFilterChange={(value) => { setSelectedProductUnitId(value); setProductPage(1); }}
          onProductBrandFilterChange={(value) => { setSelectedProductBrandId(value); setProductPage(1); }}
          onSearchChange={(value) => { setSearch(value); setProductPage(1); }}
          onStockStatusFilterChange={(value) => { setSelectedStockStatus(value); setProductPage(1); }}
          paginationCurrentPage={productPage}
          paginationPageSize={productPageSize}
          paginationTotalItems={productTotal}
          paginationTotalPages={productTotalPages}
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

      <StockAdjustModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["stock", "products"] })}
      />
    </div>
  );
}
