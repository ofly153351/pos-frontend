"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight, PackageOpen, Plus } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import { listLocations } from "@/services/locations";
import { listProductTypes, getProductById } from "@/services/products";
import { listWarehouses } from "@/services/warehouses";
import { getWarehouseInventoryProducts } from "@/services/warehouse-inventory";
import { LocationTransferDrawer, type LocationTransferDict } from "@/components/stock/location-transfer-drawer";
import { StockAdjustDrawer } from "@/components/stock/stock-adjust-drawer";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";
import type { Product } from "@/types/product";
import type { Warehouse } from "@/types/warehouse";
import type { WarehouseInventoryProduct } from "@/types/warehouse-inventory";

import { WarehouseSelector } from "./warehouse-selector";
import { WarehouseKpiGrid } from "./warehouse-kpi-grid";
import { WarehouseActionBar, buildWarehouseActions } from "./warehouse-action-bar";
import { MobileWarehouseActions } from "./mobile-warehouse-actions";
import { WarehouseFilters, type WarehouseFiltersState } from "./warehouse-filters";
import { WarehouseProductTable } from "./warehouse-product-table";
import { WarehouseProductCards } from "./warehouse-product-cards";
import { ProductLocationDrawer } from "./product-location-drawer";
import { WarehouseManagementDrawer } from "./warehouse-management-drawer";
import { WarehouseForm } from "./warehouse-form";
import { ProductPickerModal } from "./product-picker-modal";
import { useDebouncedValue } from "./use-debounced-value";
import { formatNumber } from "./utils";
import { statusLabel } from "./status-chip";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  dictionary: WarehouseInventoryDictionary;
  transferDict: LocationTransferDict;
  adjustDict: InventoryAdjustDictionary;
  locale: string;
};

const PAGE_SIZE = 20;

const defaultFilters: WarehouseFiltersState = {
  search: "",
  categoryId: "",
  stockStatus: "",
  locationType: "",
  sort: "name",
};

export function WarehouseInventoryManager({ dictionary: dict, transferDict, adjustDict, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { role, loading: roleLoading } = useStoreRole();

  const canManage = !roleLoading && canManageStore(role);
  const canReceive = !roleLoading && (role === "owner" || role === "manager" || role === "warehouse");

  // ── Data ──────────────────────────────────────────────────────────────────
  const warehousesQuery = useQuery({
    queryKey: ["wh-inv", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });
  const warehouses = useMemo<Warehouse[]>(() => warehousesQuery.data ?? [], [warehousesQuery.data]);

  const categoriesQuery = useQuery({
    queryKey: ["wh-inv", "categories"],
    queryFn: async () => (await listProductTypes()).data ?? [],
  });
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    [categoriesQuery.data],
  );

  const locationsQuery = useQuery({
    queryKey: ["wh-inv", "locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data.items,
  });
  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  // ── Warehouse selection (URL ?wh=) ──────────────────────────────────────────
  const whParam = searchParams.get("wh") ?? "";
  const validWh = warehouses.some((w) => w.id === whParam) ? whParam : "";
  const fallbackWh = useMemo(
    () => warehouses.find((w) => w.is_active)?.id ?? warehouses[0]?.id ?? "",
    [warehouses],
  );
  // Explicit user pick. Next 16 + Turbopack same-path query navigation (router.replace
  // ?wh=) is unreliable, so the dropdown selection is held locally for an immediate,
  // reliable switch; the URL is still updated for shareable deep links and cleared once
  // the URL catches up (so browser back/forward and deep links still drive selection).
  const [picked, setPicked] = useState<string | null>(null);
  const pickedValid = picked && warehouses.some((w) => w.id === picked) ? picked : "";
  const selectedWarehouseId = pickedValid || validWh || fallbackWh;
  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) ?? null;

  // Clear the override once the URL reflects it (render-time, like trackedWh below) so
  // deep links and back/forward continue to drive selection from the URL.
  if (picked && whParam === picked) {
    setPicked(null);
  }

  useEffect(() => {
    if (selectedWarehouseId && selectedWarehouseId !== whParam) {
      router.replace(`${pathname}?wh=${selectedWarehouseId}`, { scroll: false });
    }
  }, [selectedWarehouseId, whParam, pathname, router]);

  // ── Filters & paging ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<WarehouseFiltersState>(defaultFilters);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Reset filters + page when the warehouse changes. Adjusting state during render
  // (the "previous value" pattern) is React's recommended alternative to a reset effect.
  const [trackedWh, setTrackedWh] = useState(selectedWarehouseId);
  if (trackedWh !== selectedWarehouseId) {
    setTrackedWh(selectedWarehouseId);
    setFilters(defaultFilters);
    setPage(1);
  }

  const onFilterChange = (patch: Partial<WarehouseFiltersState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const onResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };
  const hasActiveFilters =
    Boolean(filters.search || filters.categoryId || filters.stockStatus || filters.locationType) ||
    filters.sort !== "name";

  const inventoryQuery = useQuery({
    enabled: Boolean(selectedWarehouseId),
    queryKey: [
      "wh-inv",
      "products",
      selectedWarehouseId,
      debouncedSearch,
      filters.categoryId,
      filters.stockStatus,
      filters.locationType,
      filters.sort,
      page,
    ],
    queryFn: async () =>
      (
        await getWarehouseInventoryProducts(selectedWarehouseId, {
          search: debouncedSearch || undefined,
          categoryId: filters.categoryId || undefined,
          stockStatus: filters.stockStatus || undefined,
          locationType: filters.locationType || undefined,
          sort: filters.sort || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
      ).data,
    placeholderData: (prev) => prev,
  });

  const summary = inventoryQuery.data?.summary;
  const items = inventoryQuery.data?.items ?? [];
  const total = inventoryQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Per-warehouse zone/location counts for the management drawer (one locations fetch).
  const statsByWarehouse = useMemo(() => {
    const acc = new Map<string, { locations: number; zones: Set<string> }>();
    for (const l of locations) {
      const cur = acc.get(l.warehouse_id) ?? { locations: 0, zones: new Set<string>() };
      cur.locations += 1;
      if (l.zone_name) cur.zones.add(l.zone_name);
      acc.set(l.warehouse_id, cur);
    }
    return new Map([...acc].map(([k, v]) => [k, { locations: v.locations, zones: v.zones.size }]));
  }, [locations]);

  const selectedLocationCount = useMemo(
    () => locations.filter((l) => l.warehouse_id === selectedWarehouseId).length,
    [locations, selectedWarehouseId],
  );

  // ── Drawer / modal state ─────────────────────────────────────────────────────
  const [locationProduct, setLocationProduct] = useState<WarehouseInventoryProduct | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [formState, setFormState] = useState<{ mode: "create" | "edit"; warehouse: Warehouse | null } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ product: WarehouseInventoryProduct; preset?: string } | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [pickerFor, setPickerFor] = useState<"transfer" | "adjust" | null>(null);

  const anyMutationOpen = Boolean(formState || transferTarget || adjustProduct);

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ["wh-inv", "products"] });
    queryClient.invalidateQueries({ queryKey: ["wh-inv", "product-stock"] });
    queryClient.invalidateQueries({ queryKey: ["wh-inv", "locations"] });
  };

  // Warehouse selection updates ?wh as shareable, SSR-safe view-state (router.replace).
  // NOTE: this is intentionally replace, not push — Next 16 treats a same-path query-only
  // router.push as a no-op (it would silently fail to switch), and filter/view-state is
  // conventionally not pushed onto history. Trade-off: browser back/forward does not cycle
  // through previously-selected warehouses (documented UAT limitation).
  function setWh(id: string) {
    setPicked(id);
    router.replace(`${pathname}?wh=${id}`, { scroll: false });
  }

  function openTransferFor(product: WarehouseInventoryProduct, preset?: string) {
    if (!canManage) {
      toast.error(dict.forbiddenAction);
      return;
    }
    setLocationProduct(null);
    setTransferTarget({ product, preset });
  }

  async function openAdjustFor(product: WarehouseInventoryProduct) {
    if (!canManage) {
      toast.error(dict.forbiddenAction);
      return;
    }
    setLocationProduct(null);
    try {
      const full = (await getProductById(product.product_id)).data;
      setAdjustProduct(full);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : dict.drawerLoadError);
    }
  }

  // ── Toolbar navigation / actions ─────────────────────────────────────────────
  const actions = buildWarehouseActions(
    dict,
    {
      onReceive: () => router.push(`/${locale}/warehouse/receive/new`),
      onTransfer: () => setPickerFor("transfer"),
      onAdjust: () => setPickerFor("adjust"),
      onCount: () => router.push(`/${locale}/inventory/counts`),
      onManageWarehouse: () => setManageOpen(true),
      onStorageLocations: () =>
        router.push(
          `/${locale}/settings/storage-locations${selectedWarehouseId ? `?warehouse_id=${selectedWarehouseId}` : ""}`,
        ),
      // Product Master in this branch is /stock (the /products migration is not in this
      // baseline). Link to the canonical route that actually exists to avoid a 404.
      onProducts: () => router.push(`/${locale}/stock`),
      onExport: () => void exportExcel(),
    },
    { canManage, canReceive },
  );

  async function exportExcel() {
    if (!selectedWarehouseId) return;
    try {
      const first = (
        await getWarehouseInventoryProducts(selectedWarehouseId, {
          search: debouncedSearch || undefined,
          categoryId: filters.categoryId || undefined,
          stockStatus: filters.stockStatus || undefined,
          locationType: filters.locationType || undefined,
          sort: filters.sort || undefined,
          page: 1,
          pageSize: 100,
        })
      ).data;
      const all = [...first.items];
      const pages = Math.ceil(first.pagination.total / 100);
      for (let p = 2; p <= pages; p++) {
        const next = (
          await getWarehouseInventoryProducts(selectedWarehouseId, {
            search: debouncedSearch || undefined,
            categoryId: filters.categoryId || undefined,
            stockStatus: filters.stockStatus || undefined,
            locationType: filters.locationType || undefined,
            sort: filters.sort || undefined,
            page: p,
            pageSize: 100,
          })
        ).data;
        all.push(...next.items);
      }
      if (all.length === 0) {
        toast.error(dict.exportEmpty);
        return;
      }
      const rows = all.map((it) => ({
        [dict.colProduct]: it.product_name,
        SKU: it.sku,
        [dict.drawerBarcode]: it.barcode,
        [dict.colCategory]: it.category_name,
        [dict.colReady]: it.ready_stock,
        [dict.colStorage]: it.storage_stock,
        [dict.colTotal]: it.total_stock,
        [dict.colStatus]: statusLabel(dict, it.status),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, `${selectedWarehouse?.name ?? "warehouse"}-inventory.xlsx`);
      toast.success(dict.exportDone);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : dict.saveError);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const showWarehousesError = warehousesQuery.isError;
  const warehousesLoading = warehousesQuery.isLoading;
  const noWarehouses = !warehousesLoading && warehouses.length === 0;

  return (
    <div className="space-y-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900 md:text-2xl">{dict.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{dict.subtitle}</p>
        </div>
      </div>

      {showWarehousesError ? (
        <QueryErrorState locale={locale} onRetry={() => warehousesQuery.refetch()} />
      ) : noWarehouses ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">{dict.noWarehouses}</p>
          {canManage ? (
            <button
              type="button"
              onClick={() => setFormState({ mode: "create", warehouse: null })}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              {dict.createWarehouse}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Selector */}
          <WarehouseSelector
            warehouses={warehouses}
            value={selectedWarehouseId}
            onChange={setWh}
            dict={dict}
            locationCount={selectedLocationCount}
            productCount={summary?.product_count ?? null}
            disabled={anyMutationOpen}
          />

          {/* KPIs */}
          <WarehouseKpiGrid dict={dict} summary={summary} loading={inventoryQuery.isLoading} />

          {/* Toolbar (desktop) */}
          <WarehouseActionBar actions={actions} />

          {/* Filters */}
          <WarehouseFilters
            dict={dict}
            value={filters}
            categories={categories}
            onChange={onFilterChange}
            onReset={onResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Content */}
          {inventoryQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SkeletonTable rows={8} cols={6} />
            </div>
          ) : inventoryQuery.isError ? (
            <QueryErrorState locale={locale} onRetry={() => inventoryQuery.refetch()} />
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                {hasActiveFilters ? dict.emptyFiltered : dict.empty}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-3 text-sm font-semibold text-violet-600 hover:text-violet-700"
                >
                  {dict.clearFilters}
                </button>
              ) : (
                <p className="mt-1 text-xs text-slate-400">{dict.emptyHint}</p>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <WarehouseProductTable
                  dict={dict}
                  items={items}
                  onViewLocations={setLocationProduct}
                  onTransfer={(item) => openTransferFor(item)}
                  canTransfer={canManage}
                />
              </div>
              <div className="md:hidden">
                <WarehouseProductCards
                  dict={dict}
                  items={items}
                  onViewLocations={setLocationProduct}
                  onTransfer={(item) => openTransferFor(item)}
                  canTransfer={canManage}
                />
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                <p className="text-xs text-slate-500">
                  {dict.showing} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {dict.of} {formatNumber(total)} {dict.items}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {dict.prev}
                  </button>
                  <span className="px-2 text-xs font-semibold text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    {dict.next}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Mobile sticky actions */}
          <MobileWarehouseActions dict={dict} actions={actions} />
        </>
      )}

      {/* Drawers & modals */}
      <ProductLocationDrawer
        open={Boolean(locationProduct)}
        product={locationProduct}
        warehouseId={selectedWarehouseId}
        locations={locations}
        dict={dict}
        locale={locale}
        canManage={canManage}
        onClose={() => setLocationProduct(null)}
        onTransfer={(product, preset) => openTransferFor(product, preset)}
        onAdjust={(product) => void openAdjustFor(product)}
        onHistory={() => router.push(`/${locale}/inventory`)}
      />

      <WarehouseManagementDrawer
        open={manageOpen}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        statsByWarehouse={statsByWarehouse}
        dict={dict}
        locale={locale}
        onClose={() => setManageOpen(false)}
        onSelect={setWh}
        onCreate={() => setFormState({ mode: "create", warehouse: null })}
        onEdit={(w) => setFormState({ mode: "edit", warehouse: w })}
        onViewStorage={(w) => router.push(`/${locale}/settings/storage-locations?warehouse_id=${w.id}`)}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["wh-inv", "warehouses"] });
          queryClient.invalidateQueries({ queryKey: ["wh-inv", "locations"] });
        }}
      />

      <WarehouseForm
        open={Boolean(formState)}
        mode={formState?.mode ?? "create"}
        warehouse={formState?.warehouse ?? null}
        dict={dict}
        onClose={() => setFormState(null)}
        onSaved={(w) => {
          queryClient.invalidateQueries({ queryKey: ["wh-inv", "warehouses"] });
          queryClient.invalidateQueries({ queryKey: ["wh-inv", "locations"] });
          if (formState?.mode === "create") setWh(w.id);
        }}
      />

      {transferTarget ? (
        <LocationTransferDrawer
          open
          productId={transferTarget.product.product_id}
          productName={transferTarget.product.product_name}
          presetSourceLocationId={transferTarget.preset}
          canManage={canManage}
          dict={transferDict}
          onClose={() => setTransferTarget(null)}
          onSuccess={(msg) => {
            toast.success(msg);
            setTransferTarget(null);
            invalidateInventory();
          }}
        />
      ) : null}

      <StockAdjustDrawer
        product={adjustProduct}
        warehouseId={selectedWarehouseId}
        dict={adjustDict}
        onClose={() => setAdjustProduct(null)}
        onSuccess={() => {
          setAdjustProduct(null);
          invalidateInventory();
        }}
      />

      <ProductPickerModal
        open={Boolean(pickerFor)}
        warehouseId={selectedWarehouseId}
        title={pickerFor === "adjust" ? dict.actionAdjust : dict.actionTransfer}
        dict={dict}
        onClose={() => setPickerFor(null)}
        onPick={(item) => {
          const target = pickerFor;
          setPickerFor(null);
          if (target === "transfer") openTransferFor(item);
          else if (target === "adjust") void openAdjustFor(item);
        }}
      />
    </div>
  );
}
