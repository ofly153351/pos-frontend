"use client";

import * as XLSX from "xlsx";
import { LayoutGrid, List } from "lucide-react";
import { ProductsTable } from "@/components/stock/products-table";
import { ScanButton } from "@/components/shared/scan-button";
import { ProductCardGrid } from "@/components/stock/product-card-grid";
import { BarcodeModal, type BarcodeModalLabels } from "@/components/stock/barcode-modal";
import { BarcodeBatchModal } from "@/components/stock/barcode-batch-modal";
import { ProductDetailView } from "@/components/stock/product-detail-view";
import { ImportProductModal } from "@/components/stock/import-product-modal";
import { createProduct } from "@/services/products";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ManagementDictionary,
  StockManagerDictionary,
} from "@/components/stock/types";
import type { Product, ProductBrand, ProductType, ProductUnit } from "@/types/product";
import type { Location } from "@/services/locations";

type ProductStockStatus =
  | "all"
  | "active"
  | "inactive"
  | "low_stock"
  | "out_of_stock";

type StockLevelsSectionProps = {
  dictionary: StockManagerDictionary;
  /** Stock mode (Inventory page): show stock-mutating actions and force table view.
   * Default false = Product master-data list (read-only stock, card/table toggle). */
  allowStockActions?: boolean;
  /** When set, auto-opens the ProductDetailView for the product with this ID once products load. */
  initialDetailProductId?: string;
  emptyState: string;
  error: string;
  filteredProducts: Product[];
  isPending: boolean;
  loadingLabel: string;
  managementDictionary: ManagementDictionary;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete: (productId: string) => void;
  onDeleteMany: (productIds: string[]) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onOpenCreateModal: () => void;
  onProductBrandFilterChange: (brandId: string) => void;
  onProductTypeFilterChange: (productTypeId: string) => void;
  onProductUnitFilterChange: (productUnitId: string) => void;
  onSearchChange: (value: string) => void;
  onStockStatusFilterChange: (status: ProductStockStatus) => void;
  sortBy: "created_at" | "updated_at";
  onSortChange: (sort: "created_at" | "updated_at") => void;
  paginationCurrentPage: number;
  paginationPageSize: number;
  paginationTotalItems: number;
  paginationTotalPages: number;
  productBrandFilter: string;
  productBrands: ProductBrand[];
  productTypeFilter: string;
  productTypes: ProductType[];
  productUnitFilter: string;
  productUnits: ProductUnit[];
  search: string;
  stockStatusFilter: ProductStockStatus;
  statusCounts: { all: number; active: number; low_stock: number; out_of_stock: number; inactive: number };
  locations: Location[];
  locationFilter: string;
  noLocationFilter: boolean;
  onLocationFilterChange: (id: string) => void;
  onNoLocationFilterChange: (v: boolean) => void;
  summaryStats: { total: number; ready: number; low: number; out: number; value: number };
  onBulkEnable: (ids: string[]) => void;
  onBulkDisable: (ids: string[]) => void;
  onBulkCategoryChange: (ids: string[], categoryId: string) => void;
};

export function StockLevelsSection({
  dictionary,
  allowStockActions = false,
  initialDetailProductId,
  emptyState,
  error,
  filteredProducts,
  isPending,
  loadingLabel,
  locations,
  locationFilter,
  noLocationFilter,
  managementDictionary,
  onBulkEnable,
  onBulkDisable,
  onBulkCategoryChange,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onDeleteMany,
  onEdit,
  onAdjustStock,
  onLocationFilterChange,
  onNoLocationFilterChange,
  onOpenCreateModal,
  onProductBrandFilterChange,
  onProductTypeFilterChange,
  onProductUnitFilterChange,
  onSearchChange,
  onStockStatusFilterChange,
  sortBy,
  onSortChange,
  paginationCurrentPage,
  paginationPageSize,
  paginationTotalItems,
  paginationTotalPages,
  productBrandFilter,
  productBrands,
  productTypeFilter,
  productTypes,
  productUnitFilter,
  productUnits,
  search,
  stockStatusFilter,
  statusCounts,
  summaryStats,
}: StockLevelsSectionProps) {
  const startPage = Math.max(paginationCurrentPage - 2, 1);
  const endPage = Math.min(startPage + 4, paginationTotalPages);
  const pageNumbers = Array.from(
    { length: Math.max(endPage - startPage + 1, 0) },
    (_, index) => startPage + index,
  );
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [barcodingProduct, setBarcodingProduct] = useState<Product | null>(null);
  const [barcodeBatchProducts, setBarcodeBatchProducts] = useState<Product[] | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [draftProductTypeFilter, setDraftProductTypeFilter] = useState(productTypeFilter);
  const [draftProductUnitFilter, setDraftProductUnitFilter] = useState(productUnitFilter);
  const [draftProductBrandFilter, setDraftProductBrandFilter] = useState(productBrandFilter);
  const [draftStockStatusFilter, setDraftStockStatusFilter] = useState<ProductStockStatus>(stockStatusFilter);
  const [draftLocationFilter, setDraftLocationFilter] = useState(locationFilter);
  const [draftNoLocationFilter, setDraftNoLocationFilter] = useState(noLocationFilter);
  const [optionSearch, setOptionSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const importFileRef = useRef<HTMLInputElement>(null);

  // Auto-open detail view when navigated here with ?product=<id> (e.g. from inventory table).
  useEffect(() => {
    if (!initialDetailProductId || filteredProducts.length === 0) return;
    const target = filteredProducts.find((p) => p.id === initialDetailProductId);
    if (target) setDetailProduct(target);
  }, [initialDetailProductId, filteredProducts]);

  const barcodeLabels: BarcodeModalLabels = {
    title:               dictionary.table.barcodePreviewTitle,
    printLabel:          dictionary.table.barcodePrintLabel,
    downloadPng:         dictionary.table.barcodeDownloadPng,
    downloadPdf:         dictionary.table.barcodeDownloadPdf,
    exporting:           dictionary.table.barcodeExporting,
    copyCode:            dictionary.table.barcodeCopyCode,
    copied:              dictionary.table.barcodeCopied,
    noBarcodeLabel:      dictionary.table.noBarcodeLabel,
    invalidBarcodeLabel: dictionary.table.invalidBarcodeLabel,
    templateLabel:       dictionary.table.barcodeTemplateLabel,
    templateSmall:       dictionary.table.barcodeTemplateSmall,
    templateMedium:      dictionary.table.barcodeTemplateMedium,
    templateLarge:       dictionary.table.barcodeTemplateLarge,
    templateShelf:       dictionary.table.barcodeTemplateShelf,
    templateQr:          dictionary.table.barcodeTemplateQr,
    barcodeTypeLabel:    dictionary.table.barcodeTypeLabel,
    barcodeTypeCode128:  dictionary.table.barcodeTypeCode128,
    barcodeTypeEan13:    dictionary.table.barcodeTypeEan13,
    barcodeTypeEan8:     dictionary.table.barcodeTypeEan8,
    barcodeTypeUpca:     dictionary.table.barcodeTypeUpca,
    barcodeTypeQr:       dictionary.table.barcodeTypeQr,
    contentOptionsLabel: dictionary.table.barcodeContentOptions,
    showName:            dictionary.table.barcodeShowName,
    showSku:             dictionary.table.barcodeShowSku,
    showPrice:           dictionary.table.barcodeShowPrice,
    showBarcodeNumber:   dictionary.table.barcodeShowBarcodeNumber,
    showCategory:        dictionary.table.barcodeShowCategory,
    showBrand:           dictionary.table.barcodeShowBrand,
    showLocation:        dictionary.table.barcodeShowLocation,
    showStoreName:       dictionary.table.barcodeShowStoreName,
    showSalePrice:       dictionary.table.barcodeShowSalePrice,
    origPriceInput:      dictionary.table.barcodeOrigPriceInput,
    salePriceInput:      dictionary.table.barcodeSalePriceInput,
    quantityLabel:       dictionary.table.barcodeQuantityLabel,
    printerModeLabel:    dictionary.table.barcodePrinterModeLabel,
    printerLabel:        dictionary.table.barcodePrinterLabel,
    printerA4:           dictionary.table.barcodePrinterA4,
    printer58mm:         dictionary.table.barcodePrinter58mm,
    printer80mm:         dictionary.table.barcodePrinter80mm,
    a4LayoutLabel:       dictionary.table.barcodeA4LayoutLabel,
    previewLabel:        dictionary.table.barcodePreviewLabel,
    infoTemplate:        dictionary.table.barcodeInfoTemplate,
    infoSize:            dictionary.table.barcodeInfoSize,
    infoType:            dictionary.table.barcodeInfoType,
    infoMode:            dictionary.table.barcodeInfoMode,
    infoQuantity:        dictionary.table.barcodeInfoQuantity,
    infoPages:           dictionary.table.barcodeInfoPages,
    pagesUnit:           dictionary.table.barcodePagesUnit,
    labelsUnit:          dictionary.table.barcodeLabelsUnit,
    pagesWillPrint:      dictionary.table.barcodePagesWillPrint,
    sampleNote:          dictionary.table.barcodeSampleNote,
    labelPrinterNote:    dictionary.table.barcodeLabelPrinterNote,
    closeLabel:          dictionary.table.barcodeClose,
    batchTitle:          dictionary.table.barcodeBatchTitle,
    batchProducts:       dictionary.table.barcodeBatchProducts,
    batchQtyPerProduct:  dictionary.table.barcodeBatchQtyPerProduct,
    batchPrintAll:       dictionary.table.barcodeBatchPrintAll,
    batchTotalLabels:    dictionary.table.barcodeBatchTotalLabels,
  };
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Restore the chosen view for the current session (set after mount to avoid SSR mismatch).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pos-product-view");
      if (saved === "card" || saved === "table") setViewMode(saved);
    } catch {
      /* sessionStorage unavailable — keep default */
    }
  }, []);

  function changeViewMode(mode: "card" | "table") {
    setViewMode(mode);
    try {
      sessionStorage.setItem("pos-product-view", mode);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!isFilterPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFilterPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFilterPanelOpen]);

  useEffect(() => {
    if (!isFilterPanelOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!filterPanelRef.current) return;
      if (!filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isFilterPanelOpen]);

  useEffect(() => {
    if (isFilterPanelOpen) {
      setIsFilterPanelVisible(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsFilterPanelVisible(false);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [isFilterPanelOpen]);

  useEffect(() => {
    if (isFilterPanelOpen) return;
    setDraftProductTypeFilter(productTypeFilter);
    setDraftProductUnitFilter(productUnitFilter);
    setDraftProductBrandFilter(productBrandFilter);
    setDraftStockStatusFilter(stockStatusFilter);
    setDraftLocationFilter(locationFilter);
    setDraftNoLocationFilter(noLocationFilter);
  }, [isFilterPanelOpen, productBrandFilter, productTypeFilter, productUnitFilter, stockStatusFilter, locationFilter, noLocationFilter]);

  const normalizedOptionSearch = optionSearch.trim().toLowerCase();
  const visibleTypes = useMemo(
    () => productTypes.filter((type) => type.name.toLowerCase().includes(normalizedOptionSearch)),
    [productTypes, normalizedOptionSearch],
  );
  const visibleUnits = useMemo(
    () => productUnits.filter((unit) => unit.name.toLowerCase().includes(normalizedOptionSearch)),
    [productUnits, normalizedOptionSearch],
  );
  const visibleBrands = useMemo(
    () => productBrands.filter((brand) => brand.name.toLowerCase().includes(normalizedOptionSearch)),
    [productBrands, normalizedOptionSearch],
  );
  const stockStatusOptions: Array<{ label: string; value: ProductStockStatus }> = [
    { label: dictionary.filters.allStatuses, value: "all" },
    { label: dictionary.filters.activeStatus, value: "active" },
    { label: dictionary.filters.inactiveStatus, value: "inactive" },
    { label: dictionary.filters.lowStockStatus, value: "low_stock" },
    { label: dictionary.filters.outOfStockStatus, value: "out_of_stock" },
  ];
  const activeFilterCount = [
    productTypeFilter,
    productUnitFilter,
    productBrandFilter,
    stockStatusFilter !== "all" ? stockStatusFilter : "",
    search.trim(),
    locationFilter,
    noLocationFilter ? "1" : "",
  ].filter(Boolean).length;

  function clearDraftFilters() {
    setDraftProductTypeFilter("");
    setDraftProductUnitFilter("");
    setDraftProductBrandFilter("");
    setDraftStockStatusFilter("all");
    setDraftLocationFilter("");
    setDraftNoLocationFilter(false);
    setOptionSearch("");
  }

  function applyDraftFilters() {
    onProductTypeFilterChange(draftProductTypeFilter);
    onProductUnitFilterChange(draftProductUnitFilter);
    onProductBrandFilterChange(draftProductBrandFilter);
    onStockStatusFilterChange(draftStockStatusFilter);
    onLocationFilterChange(draftLocationFilter);
    onNoLocationFilterChange(draftNoLocationFilter);
    setIsFilterPanelOpen(false);
  }

  return (
    <>
      <section
        className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-4 md:p-5"
        id="stock-levels"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="sr-only" htmlFor="stock-search-toolbar">
              {dictionary.filters.searchLabel}
            </label>
            <input
              className="w-[min(92vw,360px)] rounded-lg border border-violet-200 bg-white px-3.5 py-2.5 text-sm md:text-[15px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              id="stock-search-toolbar"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={dictionary.searchPlaceholder}
              value={search}
            />
          </div>

          <ScanButton
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
            onScan={(code) => onSearchChange(code)}
            title={dictionary.scanWithCamera}
          />

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as "created_at" | "updated_at")}
            className="rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-violet-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="created_at">เพิ่มล่าสุด</option>
            <option value="updated_at">แก้ไขล่าสุด</option>
          </select>

          <div className="relative" ref={filterPanelRef}>
            <button
              aria-expanded={isFilterPanelOpen}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm md:text-[15px] font-semibold text-violet-700 transition hover:bg-violet-50"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6L14 13v6l-4 2v-8L3.2 4.6A1 1 0 0 1 3 4z" />
              </svg>
              {dictionary.filters.filterButton}
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs md:text-sm font-bold text-violet-700">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {isFilterPanelVisible ? (
              <div
                className={`absolute left-0 z-30 mt-2 w-[min(92vw,620px)] rounded-xl border border-violet-100 bg-white p-4 shadow-xl transition-all duration-200 ease-out ${
                  isFilterPanelOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm md:text-[15px] font-bold text-slate-800">{dictionary.filters.filterPanelTitle}</p>
                  <button
                    className="text-xs md:text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                    onClick={() => setIsFilterPanelOpen(false)}
                    type="button"
                  >
                    {dictionary.filters.cancel}
                  </button>
                </div>

              <div className="mb-3">
                <div>
                  <label className="mb-1 block text-xs md:text-sm font-semibold text-slate-500" htmlFor="stock-option-search">
                    {dictionary.filters.filterOptionsPlaceholder}
                  </label>
                  <input
                    className="w-full rounded-lg border border-violet-200 bg-white px-3.5 py-2.5 text-sm md:text-[15px] text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    id="stock-option-search"
                    onChange={(event) => setOptionSearch(event.target.value)}
                    placeholder={dictionary.filters.optionSearchPlaceholder}
                    value={optionSearch}
                  />
                </div>
              </div>

              <div className="grid max-h-72 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                <div className="rounded-lg border border-violet-100 p-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dictionary.filters.categoryLabel}</p>
                  <div className="space-y-1">
                    {visibleTypes.map((type) => (
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50" key={type.id}>
                        <input
                          checked={draftProductTypeFilter === type.id}
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                          onChange={() => setDraftProductTypeFilter((prev) => (prev === type.id ? "" : type.id))}
                          type="checkbox"
                        />
                        {type.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-violet-100 p-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dictionary.filters.typeLabel}</p>
                  <div className="space-y-1">
                    {visibleUnits.map((unit) => (
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50" key={unit.id}>
                        <input
                          checked={draftProductUnitFilter === unit.id}
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                          onChange={() => setDraftProductUnitFilter((prev) => (prev === unit.id ? "" : unit.id))}
                          type="checkbox"
                        />
                        {unit.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-violet-100 p-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dictionary.filters.brandLabel}</p>
                  <div className="space-y-1">
                    {visibleBrands.map((brand) => (
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50" key={brand.id}>
                        <input
                          checked={draftProductBrandFilter === brand.id}
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                          onChange={() => setDraftProductBrandFilter((prev) => (prev === brand.id ? "" : brand.id))}
                          type="checkbox"
                        />
                        {brand.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-violet-100 p-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dictionary.filters.statusLabel}</p>
                  <div className="space-y-1">
                    {stockStatusOptions.map((statusOption) => (
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50" key={statusOption.value}>
                        <input
                          checked={draftStockStatusFilter === statusOption.value}
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                          onChange={() =>
                            setDraftStockStatusFilter((prev) =>
                              prev === statusOption.value ? "all" : statusOption.value,
                            )
                          }
                          type="checkbox"
                        />
                        {statusOption.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Phase 2: Location filter */}
                {locations.length > 0 ? (
                  <div className="rounded-lg border border-violet-100 p-2">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dictionary.filters.locationLabel ?? "ตำแหน่งจัดเก็บ"}</p>
                    <div className="space-y-1">
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50">
                        <input
                          checked={draftLocationFilter === ""}
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                          onChange={() => { setDraftLocationFilter(""); setDraftNoLocationFilter(false); }}
                          type="radio"
                          name="locationFilter"
                        />
                        {dictionary.filters.allLocations ?? "ทุกตำแหน่ง"}
                      </label>
                      {locations.map((loc) => (
                        <label key={loc.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50">
                          <input
                            checked={draftLocationFilter === loc.id}
                            className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                            onChange={() => { setDraftLocationFilter(loc.id); setDraftNoLocationFilter(false); }}
                            type="radio"
                            name="locationFilter"
                          />
                          {loc.name}
                          {loc.zone_name ? <span className="text-xs text-slate-400">{loc.zone_name}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Phase 3: No location filter */}
                <div className="rounded-lg border border-violet-100 p-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">ตัวกรองพิเศษ</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-violet-50">
                    <input
                      checked={draftNoLocationFilter}
                      className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                      onChange={() => {
                        const next = !draftNoLocationFilter;
                        setDraftNoLocationFilter(next);
                        if (next) setDraftLocationFilter("");
                      }}
                      type="checkbox"
                    />
                    {dictionary.filters.noLocationLabel ?? "ไม่มีตำแหน่งจัดเก็บ"}
                  </label>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-violet-100 pt-3">
                <button
                  className="rounded-lg border border-violet-200 bg-white px-3.5 py-2.5 text-sm md:text-[15px] font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={clearDraftFilters}
                  type="button"
                >
                  {dictionary.filters.clearAll}
                </button>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm md:text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setIsFilterPanelOpen(false)}
                  type="button"
                >
                  {dictionary.filters.cancel}
                </button>
                <button
                  className="rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm md:text-[15px] font-semibold text-white transition hover:bg-violet-700"
                  onClick={applyDraftFilters}
                  type="button"
                >
                  {dictionary.filters.apply}
                </button>
              </div>
            </div>
          ) : null}
          </div>

          {/* View mode toggle (card / table) — product master-data list only */}
          {!allowStockActions ? (
          <div className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white p-1">
            <button
              aria-label={dictionary.table.cardView}
              title={dictionary.table.cardView}
              className={`rounded-md px-2.5 py-2 transition ${
                viewMode === "card" ? "bg-violet-600 text-white" : "text-violet-700 hover:bg-violet-50"
              }`}
              onClick={() => changeViewMode("card")}
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              aria-label={dictionary.table.tableView}
              title={dictionary.table.tableView}
              className={`rounded-md px-2.5 py-2 transition ${
                viewMode === "table" ? "bg-violet-600 text-white" : "text-violet-700 hover:bg-violet-50"
              }`}
              onClick={() => changeViewMode("table")}
              type="button"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              className="text-xs md:text-sm font-semibold text-slate-500"
              htmlFor="stock-page-size"
            >
              {dictionary.pagination.perPage}
            </label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm md:text-[15px] font-semibold text-slate-700 outline-none transition focus:border-violet-300"
              id="stock-page-size"
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              value={paginationPageSize}
            >
              {[5, 10, 15, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm md:text-[15px] font-semibold text-white transition hover:bg-violet-700"
            onClick={onOpenCreateModal}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {dictionary.quickAction.button}
          </button>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm md:text-[15px] font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={() => setIsImportModalOpen(true)}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {dictionary.table.importLabel}
          </button>
        </div>
      </section>

      {/* ── Phase 5: Summary bar ───────────────────────────────────────────── */}
      <div className="my-2 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm">
          <span className="font-semibold text-slate-500">{dictionary.table.summaryAll ?? "ทั้งหมด"}</span>
          <span className="font-bold text-slate-900">{summaryStats.total.toLocaleString()}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-sm">
          <span className="font-semibold text-emerald-600">{dictionary.table.summaryReady ?? "พร้อมขาย"}</span>
          <span className="font-bold text-emerald-700">{summaryStats.ready.toLocaleString()}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2 text-sm">
          <span className="font-semibold text-amber-600">{dictionary.table.summaryLow ?? "สต็อกต่ำ"}</span>
          <span className="font-bold text-amber-700">{summaryStats.low.toLocaleString()}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-sm">
          <span className="font-semibold text-rose-500">{dictionary.table.summaryOut ?? "สินค้าหมด"}</span>
          <span className="font-bold text-rose-700">{summaryStats.out.toLocaleString()}</span>
        </div>
        {summaryStats.value > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3.5 py-2 text-sm">
            <span className="font-semibold text-violet-600">{dictionary.table.summaryValue ?? "มูลค่าสต็อก"}</span>
            <span className="font-bold text-violet-700">
              {new Intl.NumberFormat("th-TH", { currency: "THB", maximumFractionDigits: 0, minimumFractionDigits: 0, style: "currency" }).format(summaryStats.value)}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Phase 1: Quick status chips + Phase 6: Quick view buttons ─────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all" as const, label: dictionary.filters.allStatuses, count: statusCounts.all },
            { value: "active" as const, label: dictionary.filters.readyToSellStatus ?? dictionary.filters.activeStatus, count: statusCounts.active },
            { value: "low_stock" as const, label: dictionary.filters.lowStockStatus, count: statusCounts.low_stock },
            { value: "out_of_stock" as const, label: dictionary.filters.outOfStockStatus, count: statusCounts.out_of_stock },
            { value: "inactive" as const, label: dictionary.filters.inactiveStatus, count: statusCounts.inactive },
          ] as const
        ).map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => onStockStatusFilterChange(chip.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              stockStatusFilter === chip.value
                ? "bg-violet-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            {chip.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${stockStatusFilter === chip.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {chip.count}
            </span>
          </button>
        ))}

        {/* Phase 6: No Location quick view */}
        <button
          type="button"
          onClick={() => {
            onNoLocationFilterChange(!noLocationFilter);
            if (!noLocationFilter) onLocationFilterChange("");
          }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            noLocationFilter
              ? "bg-violet-600 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
          }`}
        >
          {dictionary.filters.quickViewNoLocation ?? "ไม่มีตำแหน่ง"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {viewMode === "card" && !allowStockActions ? (
        <ProductCardGrid
          products={filteredProducts}
          isPending={isPending}
          emptyState={emptyState}
          labels={{
            sku: dictionary.table.sku,
            category: dictionary.table.category,
            brand: dictionary.filters.brandLabel,
            stock: dictionary.table.stock,
            stockReady: dictionary.table.stockReady,
            lowStock: dictionary.filters.lowStockStatus,
            outOfStock: dictionary.filters.outOfStockStatus,
            statusActive: dictionary.table.statusActive,
            statusInactive: dictionary.table.statusInactive,
            locationUnassigned: dictionary.table.locationUnassigned,
            viewAction: dictionary.table.viewAction,
            barcodeAction: dictionary.table.barcodeAction,
            editAction: dictionary.table.editAction,
            deleteAction: dictionary.table.deleteAction,
          }}
          onView={(product) => setDetailProduct(product)}
          onBarcode={(product) => setBarcodingProduct(product)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
      <ProductsTable
        emptyState={emptyState}
        isPending={isPending}
        loadingLabel={loadingLabel}
        managementDictionary={managementDictionary}
        onDelete={onDelete}
        onDeleteMany={onDeleteMany}
        onEdit={onEdit}
        onAdjustStock={onAdjustStock}
        onBarcode={(product) => setBarcodingProduct(product)}
        onBulkBarcode={(prods) => setBarcodeBatchProducts(prods)}
        onRowClick={(product) => setDetailProduct(product)}
        showStockActions={allowStockActions}
        onExport={(selectedIds) => {
          const selectedProducts = filteredProducts.filter((p) =>
            selectedIds.includes(p.id),
          );
          const rows = selectedProducts.map((p) => ({
            Name: p.name ?? "",
            SKU: p.sku ?? "",
            Category: p.product_type_name ?? "",
            "Cost Price": p.cost_price ?? 0,
            "Selling Price": p.base_price ?? 0,
            Stock: p.total_stock ?? 0,
            "Min Stock": p.min_stock ?? 0,
            Unit: p.product_unit_name ?? "",
            Active: p.is_active ? "Yes" : "No",
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Products");
          XLSX.writeFile(wb, `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
        }}
        lowStockLabel={dictionary.filters.lowStockStatus}
        outOfStockLabel={dictionary.filters.outOfStockStatus}
        products={filteredProducts}
        productTypes={productTypes}
        onBulkEnable={onBulkEnable}
        onBulkDisable={onBulkDisable}
        onBulkCategoryChange={onBulkCategoryChange}
        receiveDictionary={{
          receiveStockTitle: dictionary.receive?.receiveStockTitle ?? dictionary.form.titleCreate,
          receiveStock: dictionary.receive?.receiveStock ?? dictionary.table.importLabel,
          receiveStockConfirm: dictionary.receive?.receiveStockConfirm ?? dictionary.form.save,
          receiveStockSuccess: dictionary.receive?.receiveStockSuccess ?? dictionary.form.save,
          quantityToAdd: dictionary.receive?.quantityToAdd ?? dictionary.form.quantityLabel,
          productName: dictionary.receive?.productName ?? dictionary.form.nameLabel,
          currentStock: dictionary.receive?.currentStock ?? dictionary.stats.totalProductsLabel,
          note: dictionary.receive?.note,
          cancel: dictionary.receive?.cancel ?? dictionary.form.cancel,
          saving: dictionary.receive?.saving ?? dictionary.form.saving,
          historyTab: dictionary.receive?.historyTab,
          historyEmpty: dictionary.receive?.historyEmpty,
          historyProduct: dictionary.receive?.historyProduct,
          historyQty: dictionary.receive?.historyQty,
          historyDate: dictionary.receive?.historyDate,
          historyNote: dictionary.receive?.historyNote,
          historyOperator: dictionary.receive?.historyOperator,
          historyLoadError: dictionary.receive?.historyLoadError,
        }}
        tableDictionary={dictionary.table}
      />
      )}

      {isImportModalOpen ? (
        <ImportProductModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => { setIsImportModalOpen(false); onPageChange(1); }}
          importFileRef={importFileRef}
        />
      ) : null}

      <BarcodeModal
        product={barcodingProduct}
        onClose={() => setBarcodingProduct(null)}
        labels={barcodeLabels}
      />

      <BarcodeBatchModal
        products={barcodeBatchProducts}
        onClose={() => setBarcodeBatchProducts(null)}
        labels={barcodeLabels}
      />

      <ProductDetailView
        product={detailProduct}
        dictionary={dictionary}
        onClose={() => setDetailProduct(null)}
        onEdit={(product) => { setDetailProduct(null); onEdit(product); }}
        onDelete={onDelete}
        onBarcode={(product) => setBarcodingProduct(product)}
      />

      {paginationTotalPages > 1 ? (
        <section className="my-4 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm md:text-[15px] font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={paginationCurrentPage <= 1 || isPending}
              onClick={() =>
                onPageChange(Math.max(paginationCurrentPage - 1, 1))
              }
              type="button"
            >
              {dictionary.pagination.previous}
            </button>

            {pageNumbers.map((page) => (
              <button
                className={`rounded-lg px-3.5 py-2 text-sm md:text-[15px] font-semibold transition ${
                  page === paginationCurrentPage
                    ? "bg-violet-700 text-white"
                    : "border border-slate-200 text-violet-700 hover:bg-violet-50"
                }`}
                key={page}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm md:text-[15px] font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                paginationCurrentPage >= paginationTotalPages || isPending
              }
              onClick={() =>
                onPageChange(
                  Math.min(paginationCurrentPage + 1, paginationTotalPages),
                )
              }
              type="button"
            >
              {dictionary.pagination.next}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
