"use client";

import { ProductsTable } from "@/components/stock/products-table";
import type { ManagementDictionary, StockManagerDictionary } from "@/components/stock/types";
import type { Product } from "@/types/product";

type StockLevelsSectionProps = {
  dictionary: StockManagerDictionary;
  emptyState: string;
  error: string;
  filteredProducts: Product[];
  isPending: boolean;
  loadingLabel: string;
  lowStockCount: number;
  managementDictionary: ManagementDictionary;
  onDelete: (productId: string) => void;
  onEdit: (product: Product) => void;
  onOpenCreateModal: () => void;
  onSearchChange: (value: string) => void;
  productTypesCount: number;
  search: string;
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
  onDelete,
  onEdit,
  onOpenCreateModal,
  onSearchChange,
  productTypesCount,
  search,
}: StockLevelsSectionProps) {
  return (
    <>
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
          <p className="mt-2 text-3xl font-extrabold text-rose-600">{lowStockCount}</p>
        </div>
        <div className="rounded-xl border-b-2 border-amber-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.stats.categoriesLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{productTypesCount}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-blue-700 p-6 text-white shadow-xl">
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              {dictionary.quickAction.label}
            </span>
            <h3 className="mt-1 text-xl font-bold">{dictionary.quickAction.title}</h3>
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
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-4"
        id="stock-levels"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">
              {dictionary.filters.categoryLabel}
            </label>
            <div className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700">
              {productTypesCount}
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
            onChange={(event) => onSearchChange(event.target.value)}
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
        emptyState={emptyState}
        isPending={isPending}
        loadingLabel={loadingLabel}
        managementDictionary={managementDictionary}
        onDelete={onDelete}
        onEdit={onEdit}
        products={filteredProducts}
        tableDictionary={dictionary.table}
      />
    </>
  );
}
