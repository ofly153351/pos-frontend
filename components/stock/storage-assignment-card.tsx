"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listLocations, type Location } from "@/services/locations";
import { listWarehouses } from "@/services/warehouses";

/**
 * StorageAssignmentCard
 * ---------------------
 * Cascading Warehouse -> Zone -> Location picker that assigns a product's
 * AUTHORITATIVE default storage/receiving location. Its `value` is a real
 * `locations.id` (products.default_location_id) — NOT a free-text label — and
 * `onChange` returns both the id and a human-readable label so the parent can
 * keep the legacy `storage_location` display field in sync. Choosing a location
 * NEVER creates, reserves, or moves stock; it only records where Goods Receiving
 * should add incoming stock for this product. Only active, non-sale-point
 * locations (valid receiving destinations) are selectable.
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
  unavailableLabel: string;
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

function composeLabel(loc: Location, warehouseName: string): string {
  const parts: string[] = [];
  if (warehouseName) parts.push(warehouseName);
  if (loc.zone_name) parts.push(loc.zone_name);
  parts.push(loc.code ? `${loc.code} (${loc.name})` : loc.name);
  return parts.join(" · ");
}

export function StorageAssignmentCard({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (locationId: string, label: string) => void;
  labels: StorageAssignmentLabels;
}) {
  // The cascading pickers intentionally start blank on edit (we never pre-seed
  // them from `value`): pre-selecting would require syncing state from a prop in
  // an effect, which this project's lint forbids (react-hooks/set-state-in-effect).
  // The saved value is preserved and surfaced read-only in the summary card below.
  const [warehouseId, setWarehouseId] = useState("");
  const [zone, setZone] = useState("");
  const [locationId, setLocationId] = useState("");

  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: listWarehouses });
  const warehouses = useMemo(
    () => (Array.isArray(warehousesQuery.data?.data) ? warehousesQuery.data.data : []),
    [warehousesQuery.data],
  );

  // One fetch of all store locations: used both to resolve the saved `value`
  // (a location id) to a display label and to drive the cascading picker.
  const locationsQuery = useQuery({
    queryKey: ["all-locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data?.items ?? [],
  });
  const allLocations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const warehouseNameOf = useMemo(() => {
    const map = new Map(warehouses.map((w) => [w.id, w.name] as const));
    return (id: string) => map.get(id) ?? "";
  }, [warehouses]);

  // Only active, non-sale-point locations are valid receiving destinations.
  const selectable = useMemo(
    () => allLocations.filter((l) => l.is_active && !l.is_sale_point),
    [allLocations],
  );
  const warehouseLocations = useMemo(
    () => selectable.filter((l) => l.warehouse_id === warehouseId),
    [selectable, warehouseId],
  );
  const zones = useMemo(() => {
    const set = new Set<string>();
    warehouseLocations.forEach((l) => {
      if (l.zone_name) set.add(l.zone_name);
    });
    return Array.from(set);
  }, [warehouseLocations]);
  const zoneLocations = useMemo(
    () => warehouseLocations.filter((l) => (zone ? l.zone_name === zone : true)),
    [warehouseLocations, zone],
  );

  const selected = useMemo(
    () => (value ? allLocations.find((l) => l.id === value) ?? null : null),
    [allLocations, value],
  );
  const resolving = locationsQuery.isLoading || warehousesQuery.isLoading;
  const selectedLabel = selected ? composeLabel(selected, warehouseNameOf(selected.warehouse_id)) : "";
  // A saved id that does not resolve to an active, non-sale-point location.
  const selectedUnavailable =
    Boolean(value) && !resolving && (!selected || !selected.is_active || selected.is_sale_point);

  function handleWarehouse(id: string) {
    setWarehouseId(id);
    setZone("");
    setLocationId("");
  }
  function handleZone(z: string) {
    setZone(z);
    setLocationId("");
  }
  function handleLocation(id: string) {
    setLocationId(id);
    if (!id) {
      // Picking the blank "— Select —" option commits a clear, so the visible
      // dropdown never desyncs from the committed value (parity with Clear).
      onChange("", "");
      return;
    }
    const loc = allLocations.find((l) => l.id === id);
    onChange(id, loc ? composeLabel(loc, warehouseNameOf(loc.warehouse_id)) : "");
  }
  function clearSelection() {
    setWarehouseId("");
    setZone("");
    setLocationId("");
    onChange("", "");
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
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            selectedUnavailable ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {labels.currentLabel}
            </p>
            <p
              className={`truncate font-medium ${
                selectedUnavailable ? "text-amber-700" : "text-slate-800"
              }`}
            >
              {selected ? selectedLabel : resolving ? "…" : labels.unavailableLabel}
            </p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={clearSelection}
            type="button"
          >
            {labels.clearLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
