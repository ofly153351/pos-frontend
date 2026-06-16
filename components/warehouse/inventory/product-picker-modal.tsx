"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getWarehouseInventoryProducts } from "@/services/warehouse-inventory";
import type { WarehouseInventoryProduct } from "@/types/warehouse-inventory";
import { formatNumber } from "./utils";
import { useDebouncedValue } from "./use-debounced-value";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  open: boolean;
  warehouseId: string;
  title: string;
  dict: WarehouseInventoryDictionary;
  onPick: (product: WarehouseInventoryProduct) => void;
  onClose: () => void;
};

// Lightweight product chooser for toolbar-level Transfer / Adjust, which both reuse
// product-scoped drawers. Searches the selected warehouse via the same Phase 0 endpoint.
export function ProductPickerModal({ open, warehouseId, title, dict, onPick, onClose }: Props) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const query = useQuery({
    enabled: open && Boolean(warehouseId),
    queryKey: ["wh-inv", "picker", warehouseId, debounced],
    queryFn: async () =>
      (await getWarehouseInventoryProducts(warehouseId, { search: debounced || undefined, pageSize: 30, sort: "name" })).data,
  });

  if (!open) return null;
  const items = query.data?.items ?? [];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label={dict.close} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict.searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {query.isLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">{dict.emptyFiltered}</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.product_id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-violet-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{item.product_name}</span>
                      <span className="block truncate font-mono text-[11px] text-slate-400">{item.sku || dict.noBarcode}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">{formatNumber(item.total_stock)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
