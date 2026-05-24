"use client";

import * as XLSX from "xlsx";
import { ProductsTable } from "@/components/stock/products-table";
import { createProduct } from "@/services/products";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ManagementDictionary,
  StockManagerDictionary,
} from "@/components/stock/types";
import type { Product, ProductBrand, ProductType, ProductUnit } from "@/types/product";

type ProductStockStatus =
  | "all"
  | "active"
  | "inactive"
  | "low_stock"
  | "out_of_stock";

type StockLevelsSectionProps = {
  dictionary: StockManagerDictionary;
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
  onOpenCreateModal: () => void;
  onProductBrandFilterChange: (brandId: string) => void;
  onProductTypeFilterChange: (productTypeId: string) => void;
  onProductUnitFilterChange: (productUnitId: string) => void;
  onSearchChange: (value: string) => void;
  onStockStatusFilterChange: (status: ProductStockStatus) => void;
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
};

export function StockLevelsSection({
  dictionary,
  emptyState,
  error,
  filteredProducts,
  isPending,
  loadingLabel,
  managementDictionary,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onDeleteMany,
  onEdit,
  onOpenCreateModal,
  onProductBrandFilterChange,
  onProductTypeFilterChange,
  onProductUnitFilterChange,
  onSearchChange,
  onStockStatusFilterChange,
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
}: StockLevelsSectionProps) {
  const startPage = Math.max(paginationCurrentPage - 2, 1);
  const endPage = Math.min(startPage + 4, paginationTotalPages);
  const pageNumbers = Array.from(
    { length: Math.max(endPage - startPage + 1, 0) },
    (_, index) => startPage + index,
  );
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [draftProductTypeFilter, setDraftProductTypeFilter] = useState(productTypeFilter);
  const [draftProductUnitFilter, setDraftProductUnitFilter] = useState(productUnitFilter);
  const [draftProductBrandFilter, setDraftProductBrandFilter] = useState(productBrandFilter);
  const [draftStockStatusFilter, setDraftStockStatusFilter] = useState<ProductStockStatus>(stockStatusFilter);
  const [optionSearch, setOptionSearch] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

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
  }, [isFilterPanelOpen, productBrandFilter, productTypeFilter, productUnitFilter, stockStatusFilter]);

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
  ].filter(Boolean).length;

  function clearDraftFilters() {
    setDraftProductTypeFilter("");
    setDraftProductUnitFilter("");
    setDraftProductBrandFilter("");
    setDraftStockStatusFilter("all");
    setOptionSearch("");
  }

  function applyDraftFilters() {
    onProductTypeFilterChange(draftProductTypeFilter);
    onProductUnitFilterChange(draftProductUnitFilter);
    onProductBrandFilterChange(draftProductBrandFilter);
    onStockStatusFilterChange(draftStockStatusFilter);
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
                  className="rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 px-3.5 py-2.5 text-sm md:text-[15px] font-semibold text-white transition hover:from-violet-700 hover:to-pink-600"
                  onClick={applyDraftFilters}
                  type="button"
                >
                  {dictionary.filters.apply}
                </button>
              </div>
            </div>
          ) : null}
          </div>
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
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 px-4 py-2.5 text-sm md:text-[15px] font-semibold text-white transition hover:from-violet-700 hover:to-pink-600"
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

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ProductsTable
        emptyState={emptyState}
        isPending={isPending}
        loadingLabel={loadingLabel}
        managementDictionary={managementDictionary}
        onDelete={onDelete}
        onDeleteMany={onDeleteMany}
        onEdit={onEdit}
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
            "Max Stock": p.max_stock ?? "",
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

      {isImportModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 smooth-fade"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl smooth-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">{dictionary.table.importLabel}</h3>
            <p className="mt-2 text-sm text-slate-500">
              ดาวน์โหลด Template แล้วกรอกข้อมูลสินค้าที่ต้องการนำเข้า
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                onClick={() => {
                  const rows = [
                    { Name: 'ตัวอย่างสินค้า', SKU: 'BRC-001', Price: 100, Stock: 50, 'Min Stock': 10, 'Max Stock': 100, Active: 'Yes' },
                    { Name: 'ตัวอย่างสินค้า 2', SKU: 'BRC-002', Price: 200, Stock: 30, 'Min Stock': 5, 'Max Stock': 60, Active: 'Yes' },
                  ];
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Template');
                  XLSX.writeFile(wb, 'product-import-template.xlsx');
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                </svg>
                ดาวน์โหลด Template
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                onClick={() => importFileRef.current?.click()}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                อัปโหลดไฟล์ Excel
              </button>
            </div>

            <input
              accept=".xlsx,.xls"
              className="hidden"
              ref={importFileRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";

                const buffer = await file.arrayBuffer();
                const wb = XLSX.read(buffer, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const dataRows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

                let successCount = 0;
                let errorCount = 0;

                for (const row of dataRows) {
                  const get = (key: string) => String(row[key] ?? row[key.toLowerCase()] ?? "").trim();
                  try {
                    await createProduct({
                      name: get("Name") || "",
                      base_price: get("Price") || "0",
                      sku: get("SKU"),
                      min_stock: get("Min Stock") || "0",
                      max_stock: get("Max Stock"),
                      is_active: get("Active").toLowerCase() !== "no",
                      unit_id: productUnits[0]?.id ?? "",
                    });
                    successCount++;
                  } catch {
                    errorCount++;
                  }
                }

                setIsImportModalOpen(false);
                onPageChange(1);
                alert(`นำเข้า: ${successCount} รายการสำเร็จ${errorCount > 0 ? `, ${errorCount} รายการล้มเหลว` : ""}`);
              }}
              type="file"
            />

            <button
              className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={() => setIsImportModalOpen(false)}
              type="button"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

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
