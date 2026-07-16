"use client";

import { Search, X } from "lucide-react";

import type {
  WarehouseInventorySort,
  WarehouseLocationType,
  WarehouseStockStatus,
} from "@/types/warehouse-inventory";
import type { WarehouseInventoryDictionary } from "./types";

export type WarehouseFiltersState = {
  search: string;
  categoryId: string;
  stockStatus: WarehouseStockStatus | "";
  locationType: WarehouseLocationType | "";
  sort: WarehouseInventorySort | "";
};

type Props = {
  dict: WarehouseInventoryDictionary;
  value: WarehouseFiltersState;
  categories: { id: string; name: string }[];
  onChange: (patch: Partial<WarehouseFiltersState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

const selectClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export function WarehouseFilters({
  dict,
  value,
  categories,
  onChange,
  onReset,
  hasActiveFilters,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={dict.searchPlaceholder}
          aria-label={dict.searchPlaceholder}
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {value.search ? (
          <button
            type="button"
            onClick={() => onChange({ search: "" })}
            aria-label={dict.clearFilters}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          aria-label={dict.filterCategory}
          className={selectClass}
        >
          <option value="">{dict.categoryAll}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={value.stockStatus}
          onChange={(e) => onChange({ stockStatus: e.target.value as WarehouseStockStatus | "" })}
          aria-label={dict.filterStockStatus}
          className={selectClass}
        >
          <option value="">{dict.statusAll}</option>
          <option value="available">{dict.statusReady}</option>
          <option value="low_stock">{dict.statusLow}</option>
          <option value="out_of_stock">{dict.statusOut}</option>
        </select>

        <select
          value={value.locationType}
          onChange={(e) => onChange({ locationType: e.target.value as WarehouseLocationType | "" })}
          aria-label={dict.filterLocationType}
          className={selectClass}
        >
          <option value="">{dict.locationAll}</option>
          <option value="sale_point">{dict.locationSale}</option>
          <option value="storage">{dict.locationStorage}</option>
        </select>

        <select
          value={value.sort}
          onChange={(e) => onChange({ sort: e.target.value as WarehouseInventorySort | "" })}
          aria-label={dict.sortLabel}
          className={selectClass}
        >
          <option value="name">{dict.sortName}</option>
          <option value="name_desc">{dict.sortNameDesc}</option>
          <option value="total_desc">{dict.sortTotalDesc}</option>
          <option value="total_asc">{dict.sortTotalAsc}</option>
        </select>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            {dict.clearFilters}
          </button>
        ) : null}
      </div>
    </div>
  );
}
