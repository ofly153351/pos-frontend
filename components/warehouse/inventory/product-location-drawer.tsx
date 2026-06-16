"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, History, MapPin, SlidersHorizontal, Store } from "lucide-react";

import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductStockByLocation } from "@/services/warehouse-inventory";
import type { Location } from "@/services/locations";
import type { WarehouseInventoryProduct } from "@/types/warehouse-inventory";
import { DrawerShell } from "./drawer-shell";
import { buildProductLocationBreakdown, formatNumber, locationPath } from "./utils";
import type { EnrichedStockLocation, WarehouseInventoryDictionary } from "./types";

type Props = {
  open: boolean;
  product: WarehouseInventoryProduct | null;
  warehouseId: string;
  locations: Location[];
  dict: WarehouseInventoryDictionary;
  locale: string;
  canManage: boolean;
  onClose: () => void;
  onTransfer: (product: WarehouseInventoryProduct, presetSourceLocationId?: string) => void;
  onAdjust: (product: WarehouseInventoryProduct) => void;
  onHistory: (product: WarehouseInventoryProduct) => void;
};

export function ProductLocationDrawer({
  open,
  product,
  warehouseId,
  locations,
  dict,
  locale,
  canManage,
  onClose,
  onTransfer,
  onAdjust,
  onHistory,
}: Props) {
  const stockQuery = useQuery({
    enabled: open && Boolean(product),
    queryKey: ["wh-inv", "product-stock", product?.product_id],
    queryFn: async () => (await getProductStockByLocation(product!.product_id)).data,
  });

  const breakdown = buildProductLocationBreakdown(stockQuery.data, locations, warehouseId);
  const hasAnyLocation = breakdown.sale.length > 0 || breakdown.storage.length > 0;
  const hasInactive = [...breakdown.sale, ...breakdown.storage].some((l) => !l.is_active);

  return (
    <DrawerShell
      open={open}
      title={dict.drawerTitle}
      subtitle={product?.product_name}
      onClose={onClose}
      closeLabel={dict.close}
    >
      {!product ? null : stockQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : stockQuery.isError ? (
        <QueryErrorState locale={locale} onRetry={() => stockQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          {/* Hero */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {product.sku ? (
                <span>
                  {dict.drawerSku} <span className="font-mono text-slate-700">{product.sku}</span>
                </span>
              ) : null}
              {product.barcode ? (
                <span>
                  {dict.drawerBarcode} <span className="font-mono text-slate-700">{product.barcode}</span>
                </span>
              ) : null}
              {product.category_name ? (
                <span>
                  {dict.drawerCategory} <span className="text-slate-700">{product.category_name}</span>
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-slate-400">{dict.drawerReady}</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">{formatNumber(breakdown.readyStock)}</p>
              </div>
              <div className="border-x border-violet-100">
                <p className="text-[11px] text-slate-400">{dict.drawerStorage}</p>
                <p className="text-lg font-bold tabular-nums text-slate-600">{formatNumber(breakdown.storageStock)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{dict.drawerWarehouseTotal}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{formatNumber(breakdown.totalStock)}</p>
              </div>
            </div>
            {product.min_stock > 0 ? (
              <p className="mt-2 text-center text-[11px] text-slate-400">
                {dict.minLevel}: {formatNumber(product.min_stock)} {product.unit}
              </p>
            ) : null}
          </div>

          {!hasAnyLocation ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              {dict.drawerEmpty}
            </p>
          ) : (
            <>
              <LocationGroup
                title={dict.groupSale}
                icon={<Store className="h-4 w-4 text-emerald-500" />}
                items={breakdown.sale}
                dict={dict}
                canManage={canManage}
                onTransfer={(loc) => onTransfer(product, loc.location_id)}
                onAdjust={() => onAdjust(product)}
                onHistory={() => onHistory(product)}
              />
              <LocationGroup
                title={dict.groupStorage}
                icon={<MapPin className="h-4 w-4 text-violet-500" />}
                items={breakdown.storage}
                dict={dict}
                canManage={canManage}
                onTransfer={(loc) => onTransfer(product, loc.location_id)}
                onAdjust={() => onAdjust(product)}
                onHistory={() => onHistory(product)}
              />
            </>
          )}

          {hasInactive ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              {dict.inactiveNote}
            </p>
          ) : null}
        </div>
      )}
    </DrawerShell>
  );
}

function LocationGroup({
  title,
  icon,
  items,
  dict,
  canManage,
  onTransfer,
  onAdjust,
  onHistory,
}: {
  title: string;
  icon: React.ReactNode;
  items: EnrichedStockLocation[];
  dict: WarehouseInventoryDictionary;
  canManage: boolean;
  onTransfer: (loc: EnrichedStockLocation) => void;
  onAdjust: (loc: EnrichedStockLocation) => void;
  onHistory: (loc: EnrichedStockLocation) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
        <span className="text-slate-300">({items.length})</span>
      </div>
      <ul className="space-y-2">
        {items.map((loc) => {
          const path = locationPath(loc);
          const disabled = !loc.is_active;
          return (
            <li key={loc.location_id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">{loc.code || loc.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        loc.is_sale_point ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"
                      }`}
                    >
                      {loc.is_sale_point ? dict.locationSale : dict.locationStorage}
                    </span>
                    {!loc.is_active ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {dict.locInactive}
                      </span>
                    ) : null}
                  </div>
                  {path ? <p className="mt-0.5 truncate text-xs text-slate-400">{path}</p> : null}
                </div>
                <span className="shrink-0 text-base font-bold tabular-nums text-slate-900">{formatNumber(loc.quantity)}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {canManage ? (
                  <>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onTransfer(loc)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      {dict.drawerActionTransfer}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAdjust(loc)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      {dict.drawerActionAdjust}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onHistory(loc)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <History className="h-3.5 w-3.5" />
                  {dict.drawerActionHistory}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
