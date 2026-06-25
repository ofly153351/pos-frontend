"use client";

import { ChevronRight, Folder, Layers, Pencil, PackageOpen, Trash2, X } from "lucide-react";
import type { Warehouse } from "@/types/warehouse";
import type { Location, LocationProduct } from "@/services/locations";
import {
  getStatus, formatDate,
  STATUS_STYLES, STATUS_BADGE, DRAWER_BG,
  type StorageLocationDictionary,
} from "./storage-location-types";

type ConfirmAction = "disable" | "enable" | "delete";

type Props = {
  isOpen: boolean;
  selectedLocation: Location | null;
  onClose: () => void;
  onEdit: (loc: Location) => void;
  onConfirmAction: (action: ConfirmAction) => void;
  products: LocationProduct[];
  isProductsLoading: boolean;
  warehouses: Warehouse[];
  dictionary: StorageLocationDictionary;
};

export function LocationDetailDrawer({
  isOpen, selectedLocation, onClose, onEdit, onConfirmAction,
  products, isProductsLoading, warehouses, dictionary,
}: Props) {
  const drawerStatus = selectedLocation ? getStatus(selectedLocation) : ("available" as const);
  const isArchived = Boolean(selectedLocation?.deleted_at);

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        width: isOpen ? 360 : 0,
        opacity: isOpen ? 1 : 0,
        borderWidth: isOpen ? undefined : 0,
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {selectedLocation ? (
        <>
          {/* ── Header ── */}
          <div className={`shrink-0 border-b border-violet-100 bg-gradient-to-b ${DRAWER_BG[drawerStatus]} px-5 py-5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xl font-black leading-none tracking-wider text-slate-900">
                  {selectedLocation.code || selectedLocation.name}
                </p>
                {selectedLocation.code && (
                  <p className="mt-1.5 truncate text-sm text-slate-600">{selectedLocation.name}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[drawerStatus].dot}`} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[drawerStatus]}`}>
                    {STATUS_STYLES[drawerStatus].label(dictionary)}
                  </span>
                  {selectedLocation.is_sale_point && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                      {dictionary.statusSalePoint}
                    </span>
                  )}
                  {isArchived && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {dictionary.lifecycle.badgeArchived}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {/* Warehouse + zone/floor path */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-violet-500">{dictionary.infoWarehouse}</p>
              <div className="space-y-3">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dictionary.infoWarehouse}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedLocation.warehouse_name ||
                      warehouses.find((w) => w.id === selectedLocation.warehouse_id)?.name ||
                      "-"}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {dictionary.infoZone} / {dictionary.infoFloor}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                      <Folder className="h-3 w-3" />
                      {selectedLocation.zone_name || "–"}
                    </span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className="flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                      <Layers className="h-3 w-3" />
                      {selectedLocation.floor_name || "–"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.drawerTitle}</p>
              <div className="space-y-3">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dictionary.infoCode}</p>
                  <p className="text-sm font-bold text-slate-900">{selectedLocation.code || "-"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dictionary.infoName}</p>
                  <p className="text-sm font-medium text-slate-900">{selectedLocation.name}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dictionary.infoCreatedAt}</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(selectedLocation.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="rounded-2xl border border-violet-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dictionary.productsTitle}</p>
                {products.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    {products.length}
                  </span>
                )}
              </div>
              {isProductsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-violet-50" />)}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <PackageOpen className="h-7 w-7 text-violet-200" />
                  <p className="text-xs text-slate-400">{dictionary.productsEmpty}</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <li key={p.product_id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{p.product_name}</p>
                        {p.sku && <p className="text-[10px] text-slate-400">{p.sku}</p>}
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        {p.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Actions ── (archived rows are read-only history §12) */}
          {!isArchived && (
            <div className="shrink-0 space-y-2 border-t border-violet-100 p-4">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50"
                onClick={() => onEdit(selectedLocation)}
                type="button"
              >
                <Pencil className="h-4 w-4" />
                {dictionary.editButton}
              </button>
              <button
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selectedLocation.is_active
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
                onClick={() => onConfirmAction(selectedLocation.is_active ? "disable" : "enable")}
                type="button"
              >
                {selectedLocation.is_active ? dictionary.disableButton : dictionary.enableButton}
              </button>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                onClick={() => onConfirmAction("delete")}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                {dictionary.deleteButton}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
