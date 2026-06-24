"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { Product, ProductBrand, ProductType } from "@/types/product";
import {
  listProductBrands,
  listProducts,
  listProductTypes,
} from "@/services/products";
import { ScanButton } from "@/components/shared/scan-button";
import type { PromotionDictionary } from "./promotion-types";

// ── Shared item shape ─────────────────────────────────────────────────────────

type PickerItem = { id: string; name: string; sub?: string };

// ── Generic multi-select dropdown ─────────────────────────────────────────────

type GenericPickerDict = {
  searchPlaceholder: string;
  /** Must contain the literal string "{count}" */
  selectedCount: string;
  clearAll: string;
  noResults: string;
  loading: string;
  loadMore: string;
};

type GenericPickerProps = {
  items: PickerItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Called whenever the id→name map derived from `items` changes */
  onNamesChange?: (map: Record<string, string>) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** When set, renders a mobile camera-scan button next to the search input. Only the
   *  product picker passes this — category/brand searches have no barcode to scan. */
  scanTitle?: string;
  dict: GenericPickerDict;
};

function GenericPicker({
  items,
  selectedIds,
  onChange,
  onNamesChange,
  isLoading,
  hasMore,
  onLoadMore,
  scanTitle,
  dict,
}: GenericPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setIsOpen(false);
    }
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [isOpen]);

  // Filtered list (client-side; sub includes SKU, barcode, brand)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.sub ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  // Reset active row when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query, items]);

  // Scroll active row into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, isOpen]);

  // Build id→name lookup and publish it so parent can show chip labels
  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const it of items) m[it.id] = it.name;
    return m;
  }, [items]);

  // Only report names for currently-selected IDs so the parent object stays small
  const selectedNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const id of selectedIds) {
      if (nameMap[id]) m[id] = nameMap[id];
    }
    return m;
  }, [nameMap, selectedIds]);

  useEffect(() => {
    onNamesChange?.(selectedNameMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNameMap]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  // Resolve a typed-or-scanned code to an exact SKU/barcode hit (the `sub` field holds
  // these, separated by " · ") and select it. Shared by Enter and the camera scanner.
  function applyExactCode(raw: string): boolean {
    const code = raw.trim().toLowerCase();
    if (!code) return false;
    const exact = items.find((it) =>
      it.sub?.split(" · ").some((seg) => seg.toLowerCase() === code),
    );
    if (!exact) return false;
    toggle(exact.id);
    setQuery("");
    setActiveIdx(0);
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsOpen(true);
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        e.preventDefault();
        if (!query.trim()) break;
        // Prefer an exact barcode/SKU scan; otherwise toggle the highlighted row.
        if (applyExactCode(query)) {
          setTimeout(() => inputRef.current?.focus(), 0);
          break;
        }
        if (filtered[activeIdx]) toggle(filtered[activeIdx].id);
        break;
      }
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input + dropdown */}
      <div ref={wrapRef} className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder={dict.searchPlaceholder}
              className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-9 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setActiveIdx(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
            {isLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            ) : (
              <ChevronDown
                className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-150 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
          {scanTitle ? (
            <ScanButton
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-violet-600 transition-colors hover:border-violet-300 hover:bg-violet-50"
              onScan={(code) => {
                // Exact hit selects immediately; otherwise drop the code into the
                // search box so the user sees the filtered matches.
                if (!applyExactCode(code)) {
                  setQuery(code);
                  setIsOpen(true);
                }
              }}
              title={scanTitle}
            />
          ) : null}
        </div>

        {isOpen ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {dict.loading}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                {dict.noResults}
              </div>
            ) : (
              <>
                <div ref={listRef} className="max-h-64 overflow-y-auto">
                  {filtered.map((it, i) => {
                    const selected = selectedIds.includes(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onMouseEnter={() => setActiveIdx(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          toggle(it.id);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                          i === activeIdx ? "bg-violet-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            selected
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {it.name}
                          </p>
                          {it.sub ? (
                            <p className="truncate text-[11px] text-slate-400">
                              {it.sub}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {hasMore && onLoadMore ? (
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={onLoadMore}
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {dict.loadMore}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Summary + clear */}
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-violet-700">
            {dict.selectedCount.replace("{count}", String(selectedIds.length))}
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-slate-400 hover:text-rose-500"
          >
            {dict.clearAll}
          </button>
        </div>
      ) : null}

      {/* Selected chips with names */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700"
            >
              {nameMap[id] ?? id}
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                className="ml-0.5 leading-none"
              >
                <X className="h-3 w-3 opacity-60 hover:opacity-100" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Category picker ────────────────────────────────────────────────────────────

export function ScopeCategoryPicker({
  selectedIds,
  onChange,
  onNamesChange,
  dict,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNamesChange?: (map: Record<string, string>) => void;
  dict: PromotionDictionary;
}) {
  const q = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => (await listProductTypes()).data,
    staleTime: 5 * 60 * 1000,
  });

  const items: PickerItem[] = useMemo(
    () =>
      (q.data ?? [])
        .filter((c: ProductType) => c.is_active)
        .map((c: ProductType) => ({
          id: c.id,
          name: c.name,
          sub: c.description ?? undefined,
        })),
    [q.data],
  );

  const sd = dict.scopeStep;
  return (
    <GenericPicker
      items={items}
      selectedIds={selectedIds}
      onChange={onChange}
      onNamesChange={onNamesChange}
      isLoading={q.isPending}
      dict={{
        searchPlaceholder: sd.searchCategories,
        selectedCount: sd.selectedCount,
        clearAll: sd.clearAll,
        noResults: sd.noResults,
        loading: sd.loading,
        loadMore: sd.loadMore,
      }}
    />
  );
}

// ── Brand picker ───────────────────────────────────────────────────────────────

export function ScopeBrandPicker({
  selectedIds,
  onChange,
  onNamesChange,
  dict,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNamesChange?: (map: Record<string, string>) => void;
  dict: PromotionDictionary;
}) {
  const q = useQuery({
    queryKey: ["product-brands"],
    queryFn: async () => (await listProductBrands()).data,
    staleTime: 5 * 60 * 1000,
  });

  const items: PickerItem[] = useMemo(
    () =>
      (q.data ?? [])
        .filter((b: ProductBrand) => b.is_active)
        .map((b: ProductBrand) => ({
          id: b.id,
          name: b.name,
          sub: b.description ?? undefined,
        })),
    [q.data],
  );

  const sd = dict.scopeStep;
  return (
    <GenericPicker
      items={items}
      selectedIds={selectedIds}
      onChange={onChange}
      onNamesChange={onNamesChange}
      isLoading={q.isPending}
      dict={{
        searchPlaceholder: sd.searchBrands,
        selectedCount: sd.selectedCount,
        clearAll: sd.clearAll,
        noResults: sd.noResults,
        loading: sd.loading,
        loadMore: sd.loadMore,
      }}
    />
  );
}

// ── Product picker ─────────────────────────────────────────────────────────────

const PRODUCT_PAGE_SIZE = 100;

function productToItem(p: Product): PickerItem {
  const parts: string[] = [];
  if (p.sku) parts.push(p.sku);
  if (p.barcode) parts.push(p.barcode);
  parts.push(
    `฿${Number(p.base_price).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`,
  );
  const label = p.brand_name ?? p.product_type_name;
  if (label) parts.push(label);
  return {
    id: p.id,
    name: p.name,
    sub: parts.length > 0 ? parts.join(" · ") : undefined,
  };
}

export function ScopeProductPicker({
  selectedIds,
  onChange,
  onNamesChange,
  dict,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNamesChange?: (map: Record<string, string>) => void;
  dict: PromotionDictionary;
}) {
  const [allItems, setAllItems] = useState<PickerItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const initialQuery = useQuery({
    queryKey: ["products-for-promo-picker", 1],
    queryFn: async () => {
      const res = await listProducts({ page: 1, limit: PRODUCT_PAGE_SIZE });
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!initialQuery.data) return;
    const page = initialQuery.data;
    setAllItems(page.items.filter((p: Product) => p.is_active).map(productToItem));
    setHasMore(page.has_next);
    setCurrentPage(1);
  }, [initialQuery.data]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const next = currentPage + 1;
      const res = await listProducts({ page: next, limit: PRODUCT_PAGE_SIZE });
      const newItems = res.data.items
        .filter((p: Product) => p.is_active)
        .map(productToItem);
      setAllItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...newItems.filter((x) => !seen.has(x.id))];
      });
      setHasMore(res.data.has_next);
      setCurrentPage(next);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore]);

  const sd = dict.scopeStep;
  return (
    <GenericPicker
      items={allItems}
      selectedIds={selectedIds}
      onChange={onChange}
      onNamesChange={onNamesChange}
      isLoading={initialQuery.isPending || isLoadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      scanTitle={sd.scanWithCamera}
      dict={{
        searchPlaceholder: sd.searchProducts,
        selectedCount: sd.selectedCount,
        clearAll: sd.clearAll,
        noResults: sd.noResults,
        loading: sd.loading,
        loadMore: sd.loadMore,
      }}
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ScopePicker({
  scopeType,
  selectedIds,
  onChange,
  onNamesChange,
  dict,
}: {
  scopeType: "category" | "brand" | "products";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNamesChange?: (map: Record<string, string>) => void;
  dict: PromotionDictionary;
}) {
  if (scopeType === "category") {
    return (
      <ScopeCategoryPicker
        selectedIds={selectedIds}
        onChange={onChange}
        onNamesChange={onNamesChange}
        dict={dict}
      />
    );
  }
  if (scopeType === "brand") {
    return (
      <ScopeBrandPicker
        selectedIds={selectedIds}
        onChange={onChange}
        onNamesChange={onNamesChange}
        dict={dict}
      />
    );
  }
  return (
    <ScopeProductPicker
      selectedIds={selectedIds}
      onChange={onChange}
      onNamesChange={onNamesChange}
      dict={dict}
    />
  );
}
