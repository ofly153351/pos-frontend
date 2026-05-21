"use client";

import { ProductsTable } from "@/components/stock/products-table";
import { createProduct } from "@/services/products";
import { useRef, useState } from "react";
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
  lowStockCount: number;
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
  productTypesCount: number;
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
  lowStockCount,
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
  productTypesCount,
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
  const importFileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border-b-2 border-violet-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.stats.totalProductsLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-violet-700">
            {paginationTotalItems}
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
            {productTypesCount}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-violet-700 p-6 text-white shadow-xl">
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              {dictionary.quickAction.label}
            </span>
            <h3 className="mt-1 text-xl font-bold">
              {dictionary.quickAction.title}
            </h3>
            <button
              className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/30"
              onClick={onOpenCreateModal}
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

      <section
        className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-4"
        id="stock-levels"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label
              className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500"
              htmlFor="stock-product-type-filter"
            >
              {dictionary.filters.categoryLabel}
            </label>
            <select
              className="min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300"
              id="stock-product-type-filter"
              onChange={(event) =>
                onProductTypeFilterChange(event.target.value)
              }
              value={productTypeFilter}
            >
              <option value="">{dictionary.filters.allCategories}</option>
              {productTypes.map((productType) => (
                <option key={productType.id} value={productType.id}>
                  {productType.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label
              className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500"
              htmlFor="stock-product-unit-filter"
            >
              {dictionary.filters.typeLabel}
            </label>
            <select
              className="min-w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300"
              id="stock-product-unit-filter"
              onChange={(event) =>
                onProductUnitFilterChange(event.target.value)
              }
              value={productUnitFilter}
            >
              <option value="">{dictionary.filters.allTypes}</option>
              {productUnits.map((productUnit) => (
                <option key={productUnit.id} value={productUnit.id}>
                  {productUnit.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label
              className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500"
              htmlFor="stock-brand-filter"
            >
              {dictionary.filters.brandLabel}
            </label>
            <select
              className="min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300"
              id="stock-brand-filter"
              onChange={(event) =>
                onProductBrandFilterChange(event.target.value)
              }
              value={productBrandFilter}
            >
              <option value="">{dictionary.filters.allBrands}</option>
              {productBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label
              className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500"
              htmlFor="stock-status-filter"
            >
              {dictionary.filters.statusLabel}
            </label>
            <select
              className="min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300"
              id="stock-status-filter"
              onChange={(event) =>
                onStockStatusFilterChange(
                  event.target.value as ProductStockStatus,
                )
              }
              value={stockStatusFilter}
            >
              <option value="all">{dictionary.filters.allStatuses}</option>
              <option value="active">{dictionary.filters.activeStatus}</option>
              <option value="inactive">
                {dictionary.filters.inactiveStatus}
              </option>
              <option value="low_stock">
                {dictionary.filters.lowStockStatus}
              </option>
              <option value="out_of_stock">
                {dictionary.filters.outOfStockStatus}
              </option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              className="text-xs font-semibold text-slate-500"
              htmlFor="stock-page-size"
            >
              {dictionary.pagination.perPage}
            </label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300"
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
          <input
            className="rounded-lg border-none bg-white px-4 py-2 text-sm text-slate-700 outline-none ring-0 focus:ring-2 focus:ring-violet-500/20"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={dictionary.searchPlaceholder}
            value={search}
          />
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
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
          const headers = [
            "Name", "SKU", "Category", "Cost Price", "Selling Price", "Stock",
            "Min Stock", "Max Stock", "Unit", "Active",
          ];
          const rows = selectedProducts.map((p) => [
            `"${(p.name ?? "").replace(/"/g, '""')}"`,
            `"${(p.sku ?? "").replace(/"/g, '""')}"`,
            `"${(p.product_type_name ?? "").replace(/"/g, '""')}"`,
            p.cost_price ?? 0,
            p.effective_price ?? 0,
            p.total_stock ?? 0,
            p.min_stock ?? 0,
            p.max_stock ?? "",
            `"${(p.product_unit_name ?? "").replace(/"/g, '""')}"`,
            p.is_active ? "Yes" : "No",
          ]);
          const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
          const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">{dictionary.table.importLabel}</h3>
            <p className="mt-2 text-sm text-slate-500">
              ดาวน์โหลด Template แล้วกรอกข้อมูลสินค้าที่ต้องการนำเข้า
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  const template = [
                    "Name,SKU,Price,Stock,Min Stock,Max Stock,Active",
                    "ตัวอย่างสินค้า,BRC-001,100.00,50,10,100,Yes",
                    "ตัวอย่างสินค้า 2,BRC-002,200.00,30,5,60,Yes",
                  ].join("\n");
                  const blob = new Blob(["\ufeff" + template], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "product-import-template.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                </svg>
                ดาวน์โหลด Template
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                onClick={() => importFileRef.current?.click()}
                type="button"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                อัปโหลดไฟล์ CSV
              </button>
            </div>

            <input
              accept=".csv"
              className="hidden"
              ref={importFileRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";

                const text = await file.text();
                const lines = text.split("\n").filter(Boolean);
                const [headerLine, ...dataLines] = lines;
                const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
                const nameIdx = headers.indexOf("name");
                const skuIdx = headers.indexOf("sku");
                const priceIdx = headers.indexOf("price");
                const stockIdx = headers.indexOf("stock");
                const minStockIdx = headers.indexOf("min stock");
                const maxStockIdx = headers.indexOf("max stock");
                const activeIdx = headers.indexOf("active");

                let successCount = 0;
                let errorCount = 0;

                for (const line of dataLines) {
                  const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
                  try {
                    await createProduct({
                      name: cols[nameIdx] || "",
                      base_price: cols[priceIdx] || "0",
                      sku: skuIdx >= 0 ? cols[skuIdx] || "" : "",
                      min_stock: minStockIdx >= 0 ? cols[minStockIdx] || "0" : "0",
                      max_stock: maxStockIdx >= 0 ? cols[maxStockIdx] || "" : "",
                      is_active: activeIdx >= 0 ? cols[activeIdx]?.toLowerCase() === "yes" : true,
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
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={() => setIsImportModalOpen(false)}
              type="button"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {paginationTotalPages > 1 ? (
        <section className="my-4 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  page === paginationCurrentPage
                    ? "bg-violet-700 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                key={page}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
