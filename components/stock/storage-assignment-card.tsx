"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listLocations } from "@/services/locations";
import { listWarehouses } from "@/services/warehouses";

/**
 * StorageAssignmentCard
 * ---------------------
 * Optional, cascading Warehouse -> Zone -> Storage Location picker for the
 * product form. It is a MASTER-DATA hint only: choosing a location writes a
 * readable string into the product's existing `storage_location` field and
 * NEVER creates, reserves, or moves stock. Stock is owned by the Inventory /
 * Goods-Receiving modules.
 */

export type StorageAssignmentLabels = {
  hint: string;
  warehouseLabel: string;
  zoneLabel: string;
  locationLabel: string;
  optionalLabel: string;
  placeholder: string;
  selectWarehouseFirst: string;
  noWarehouses: string;
  noLocations: string;
  currentLabel: string;
  clearLabel: string;
};

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-3 pr-10 text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function FieldShell({
  label,
  optionalLabel,
  children,
}: {
  label: string;
  optionalLabel: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          {optionalLabel}
        </span>
      </span>
      <div className="relative">
        {children}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}

export function StorageAssignmentCard({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (value: string) => void;
  labels: StorageAssignmentLabels;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [zone, setZone] = useState("");
  const [locationId, setLocationId] = useState("");

  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: listWarehouses });
  const warehouses = Array.isArray(warehousesQuery.data?.data) ? warehousesQuery.data.data : [];

  const locationsQuery = useQuery({
    queryKey: ["storage-locations", warehouseId],
    queryFn: async () => {
      const res = await listLocations({ warehouseId });
      return res.data?.items ?? [];
    },
    enabled: Boolean(warehouseId),
  });
  const locations = useMemo(
    () => (locationsQuery.data ?? []).filter((l) => l.is_active),
    [locationsQuery.data],
  );

  const zones = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.zone_name) set.add(l.zone_name);
    });
    return Array.from(set);
  }, [locations]);

  const zoneLocations = useMemo(
    () => locations.filter((l) => (zone ? l.zone_name === zone : true)),
    [locations, zone],
  );

  // Compose a human-readable hint string from the current selection and emit it.
  function emit(nextWarehouseId: string, nextZone: string, nextLocationId: string) {
    const wh = warehouses.find((w) => w.id === nextWarehouseId);
    const loc = locations.find((l) => l.id === nextLocationId);
    const parts: string[] = [];
    if (wh) parts.push(wh.name);
    if (nextZone) parts.push(nextZone);
    if (loc) parts.push(loc.code ? `${loc.code} (${loc.name})` : loc.name);
    onChange(parts.join(" · "));
  }

  function handleWarehouse(id: string) {
    setWarehouseId(id);
    setZone("");
    setLocationId("");
    emit(id, "", "");
  }
  function handleZone(z: string) {
    setZone(z);
    setLocationId("");
    emit(warehouseId, z, "");
  }
  function handleLocation(id: string) {
    setLocationId(id);
    emit(warehouseId, zone, id);
  }
  function clearAll() {
    setWarehouseId("");
    setZone("");
    setLocationId("");
    onChange("");
  }

  const hasWarehouses = warehouses.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-700">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        <span>{labels.hint}</span>
      </div>

      {!hasWarehouses && !warehousesQuery.isLoading ? (
        <p className="text-sm text-slate-400">{labels.noWarehouses}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <FieldShell label={labels.warehouseLabel} optionalLabel={labels.optionalLabel}>
            <select
              className={selectClass}
              onChange={(e) => handleWarehouse(e.target.value)}
              value={warehouseId}
            >
              <option value="">{labels.placeholder}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label={labels.zoneLabel} optionalLabel={labels.optionalLabel}>
            <select
              className={selectClass}
              disabled={!warehouseId}
              onChange={(e) => handleZone(e.target.value)}
              value={zone}
            >
              <option value="">{warehouseId ? labels.placeholder : labels.selectWarehouseFirst}</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label={labels.locationLabel} optionalLabel={labels.optionalLabel}>
            <select
              className={selectClass}
              disabled={!warehouseId}
              onChange={(e) => handleLocation(e.target.value)}
              value={locationId}
            >
              <option value="">
                {!warehouseId
                  ? labels.selectWarehouseFirst
                  : zoneLocations.length === 0
                    ? labels.noLocations
                    : labels.placeholder}
              </option>
              {zoneLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code ? `${l.code} — ${l.name}` : l.name}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>
      )}

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {labels.currentLabel}
            </p>
            <p className="truncate font-medium text-slate-800">{value}</p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={clearAll}
            type="button"
          >
            {labels.clearLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
