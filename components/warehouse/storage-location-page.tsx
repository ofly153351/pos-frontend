"use client";

import { useEffect, useMemo, useState, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Plus,
  Search,
  X,
  Pencil,
  Warehouse,
  Layers,
  PackageOpen,
} from "lucide-react";

import { listWarehouses } from "@/services/warehouses";
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  type Location,
} from "@/services/locations";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { toast } from "@/components/ui/toast";

// ── Dictionary type ────────────────────────────────────────────────────────────
export type StorageLocationDictionary = {
  pageTitle: string;
  pageSubtitle: string;
  addButton: string;
  editButton: string;
  disableButton: string;
  enableButton: string;
  deleteButton: string;
  saveButton: string;
  savingButton: string;
  cancelButton: string;
  closeButton: string;
  collapseTree: string;
  expandTree: string;
  treeTitle: string;
  filterWarehousePlaceholder: string;
  filterZonePlaceholder: string;
  filterSearchPlaceholder: string;
  filterButton: string;
  statusAvailable: string;
  statusInUse: string;
  statusFull: string;
  statusInactive: string;
  statusSalePoint: string;
  statusLegendTitle: string;
  statusLegendAvailable: string;
  statusLegendInUse: string;
  statusLegendFull: string;
  statusLegendInactive: string;
  gridEmpty: string;
  gridEmptyHint: string;
  gridNoWarehouse: string;
  gridSearchEmpty: string;
  gridTotal: string;
  gridPage: string;
  gridShowing: string;
  gridOf: string;
  drawerTitle: string;
  infoWarehouse: string;
  infoZone: string;
  infoFloor: string;
  infoCode: string;
  infoName: string;
  infoType: string;
  infoStatus: string;
  infoActive: string;
  infoSalePoint: string;
  infoCreatedAt: string;
  productsTitle: string;
  productsTotal: string;
  productsEmpty: string;
  viewAllProducts: string;
  formWarehouse: string;
  formZone: string;
  formFloor: string;
  formCode: string;
  formCodeHint: string;
  formName: string;
  formType: string;
  formActive: string;
  formSalePoint: string;
  formNotes: string;
  formNotesPlaceholder: string;
  typeShelf: string;
  typeBin: string;
  typeFloorArea: string;
  typeColdStorage: string;
  addModalTitle: string;
  editModalTitle: string;
  confirmDisableTitle: string;
  confirmDisableBody: string;
  confirmEnableTitle: string;
  confirmEnableBody: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: string;
  toastCreated: string;
  toastUpdated: string;
  toastDisabled: string;
  toastEnabled: string;
  toastDeleted: string;
  toastError: string;
  validationWarehouseRequired: string;
  validationCodeRequired: string;
  validationNameRequired: string;
  loadingLocations: string;
  loadingWarehouses: string;
  noWarehouseSelected: string;
  allZones: string;
  allFloors: string;
  unzoned: string;
  unfloored: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
type LocationStatus = "available" | "inactive" | "sale_point";

function getStatus(loc: Location): LocationStatus {
  if (!loc.is_active) return "inactive";
  if (loc.is_sale_point) return "sale_point";
  return "available";
}

const STATUS_STYLES: Record<LocationStatus, { border: string; bg: string; dot: string; label: (d: StorageLocationDictionary) => string }> = {
  available:  { border: "border-emerald-300", bg: "bg-white",          dot: "bg-emerald-500", label: (d) => d.statusAvailable },
  inactive:   { border: "border-slate-300",   bg: "bg-slate-50",       dot: "bg-slate-400",   label: (d) => d.statusInactive },
  sale_point: { border: "border-violet-300",  bg: "bg-violet-50/60",   dot: "bg-violet-500",  label: (d) => d.statusSalePoint },
};

const STATUS_BADGE: Record<LocationStatus, string> = {
  available:  "bg-emerald-100 text-emerald-700",
  inactive:   "bg-slate-100 text-slate-500",
  sale_point: "bg-violet-100 text-violet-700",
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

// ── Derived tree structure ─────────────────────────────────────────────────────
type DerivedFloor = { name: string; count: number };
type DerivedZone  = { name: string; floors: DerivedFloor[]; count: number };

function deriveTree(locations: Location[]): DerivedZone[] {
  const zoneMap = new Map<string, Map<string, number>>();
  for (const loc of locations) {
    const zone  = loc.zone_name  || "";
    const floor = loc.floor_name || "";
    if (!zoneMap.has(zone)) zoneMap.set(zone, new Map());
    const floorMap = zoneMap.get(zone)!;
    floorMap.set(floor, (floorMap.get(floor) ?? 0) + 1);
  }
  return Array.from(zoneMap.entries()).map(([zone, floorMap]) => ({
    name: zone,
    count: Array.from(floorMap.values()).reduce((a, b) => a + b, 0),
    floors: Array.from(floorMap.entries()).map(([floor, count]) => ({ name: floor, count })),
  }));
}

// ── Form state ─────────────────────────────────────────────────────────────────
type LocationForm = {
  warehouse_id: string;
  zone_name: string;
  floor_name: string;
  code: string;
  name: string;
  is_active: boolean;
  is_sale_point: boolean;
};

function emptyForm(warehouseId = ""): LocationForm {
  return { warehouse_id: warehouseId, zone_name: "", floor_name: "", code: "", name: "", is_active: true, is_sale_point: false };
}

function locationToForm(loc: Location): LocationForm {
  return {
    warehouse_id: loc.warehouse_id,
    zone_name:    loc.zone_name  ?? "",
    floor_name:   loc.floor_name ?? "",
    code:         loc.code       ?? "",
    name:         loc.name,
    is_active:    loc.is_active,
    is_sale_point: loc.is_sale_point,
  };
}

// ── Main page ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export function StorageLocationPage({ dictionary, locale }: { dictionary: StorageLocationDictionary; locale: string }) {
  const queryClient = useQueryClient();

  // ── Filter / selection state ─────────────────────────────────────────────────
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedZone, setSelectedZone]   = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState("");
  const [page, setPage]                   = useState(1);

  // ── Tree UI state ────────────────────────────────────────────────────────────
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [expandedZones, setExpandedZones]     = useState<Set<string>>(new Set());

  // ── Drawer state ─────────────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]         = useState(false);

  // ── Modal / confirm state ────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [confirmAction, setConfirmAction]     = useState<"disable" | "enable" | "delete" | null>(null);
  const [form, setForm]                       = useState<LocationForm>(emptyForm());
  const [formError, setFormError]             = useState("");
  const [isPending, startTransition]          = useTransition();

  // ── Data ─────────────────────────────────────────────────────────────────────
  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await listWarehouses();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["storage-locations", selectedWarehouseId],
    queryFn: async () => {
      const res = await listLocations({ warehouseId: selectedWarehouseId });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedWarehouseId,
  });

  const warehouses   = warehousesQuery.data ?? [];
  const allLocations = locationsQuery.data ?? [];

  // auto-select first warehouse
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // reset page when filter changes
  useEffect(() => { setPage(1); }, [selectedWarehouseId, selectedZone, selectedFloor, searchQuery]);

  // ── Derived tree ──────────────────────────────────────────────────────────────
  const tree = useMemo(() => deriveTree(allLocations), [allLocations]);

  // ── Filtered locations for grid ───────────────────────────────────────────────
  const filteredLocations = useMemo(() => {
    let list = allLocations;
    if (selectedZone  !== null) list = list.filter((l) => (l.zone_name  || "") === selectedZone);
    if (selectedFloor !== null) list = list.filter((l) => (l.floor_name || "") === selectedFloor);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => l.code?.toLowerCase().includes(q) || l.name.toLowerCase().includes(q));
    }
    return list;
  }, [allLocations, selectedZone, selectedFloor, searchQuery]);

  const totalPages   = Math.max(1, Math.ceil(filteredLocations.length / PAGE_SIZE));
  const pagedLocations = filteredLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function selectWarehouse(id: string) {
    setSelectedWarehouseId(id);
    setSelectedZone(null);
    setSelectedFloor(null);
    setSelectedLocation(null);
    setIsDrawerOpen(false);
    setExpandedZones(new Set());
  }

  function toggleZone(zoneName: string) {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneName)) next.delete(zoneName); else next.add(zoneName);
      return next;
    });
    setSelectedZone(zoneName);
    setSelectedFloor(null);
  }

  function selectFloor(zoneName: string, floorName: string) {
    setSelectedZone(zoneName);
    setSelectedFloor(floorName);
  }

  function openDrawer(loc: Location) {
    setSelectedLocation(loc);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedLocation(null), 310);
  }

  function openAddModal() {
    setEditingLocation(null);
    setForm(emptyForm(selectedWarehouseId));
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(loc: Location) {
    setEditingLocation(loc);
    setForm(locationToForm(loc));
    setFormError("");
    setIsModalOpen(true);
  }

  function setField<K extends keyof LocationForm>(key: K, value: LocationForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.warehouse_id) { setFormError(dictionary.validationWarehouseRequired); return; }
    if (!form.code.trim())  { setFormError(dictionary.validationCodeRequired);       return; }
    if (!form.name.trim())  { setFormError(dictionary.validationNameRequired);       return; }
    setFormError("");

    startTransition(async () => {
      try {
        if (editingLocation) {
          await updateLocation(editingLocation.id, {
            name:         form.name.trim(),
            code:         form.code.trim(),
            zone_name:    form.zone_name.trim() || undefined,
            floor_name:   form.floor_name.trim() || undefined,
            is_active:    form.is_active,
            is_sale_point: form.is_sale_point,
          });
          toast.success(dictionary.toastUpdated);
          if (selectedLocation?.id === editingLocation.id) {
            setSelectedLocation((prev) => prev ? { ...prev, ...form, name: form.name.trim(), code: form.code.trim() } : prev);
          }
        } else {
          await createLocation({
            warehouse_id:  form.warehouse_id,
            name:          form.name.trim(),
            code:          form.code.trim(),
            zone_name:     form.zone_name.trim() || undefined,
            floor_name:    form.floor_name.trim() || undefined,
            is_active:     form.is_active,
            is_sale_point: form.is_sale_point,
          });
          toast.success(dictionary.toastCreated);
        }
        await queryClient.invalidateQueries({ queryKey: ["storage-locations", selectedWarehouseId] });
        setIsModalOpen(false);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : dictionary.toastError);
      }
    });
  }

  function handleToggleActive() {
    if (!selectedLocation) return;
    startTransition(async () => {
      try {
        const next = !selectedLocation.is_active;
        await updateLocation(selectedLocation.id, { is_active: next });
        toast.success(next ? dictionary.toastEnabled : dictionary.toastDisabled);
        await queryClient.invalidateQueries({ queryKey: ["storage-locations", selectedWarehouseId] });
        setSelectedLocation((prev) => prev ? { ...prev, is_active: next } : prev);
        setConfirmAction(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.toastError);
      }
    });
  }

  function handleDelete() {
    if (!selectedLocation) return;
    startTransition(async () => {
      try {
        await deleteLocation(selectedLocation.id);
        toast.success(dictionary.toastDeleted);
        await queryClient.invalidateQueries({ queryKey: ["storage-locations", selectedWarehouseId] });
        setConfirmAction(null);
        closeDrawer();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.toastError);
      }
    });
  }

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col overflow-hidden xl:px-2 2xl:px-4">
      {/* Page header */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 py-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{dictionary.pageTitle}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">{dictionary.pageSubtitle}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
          disabled={!selectedWarehouseId}
          onClick={openAddModal}
          type="button"
        >
          <Plus className="h-4 w-4" />
          {dictionary.addButton}
        </button>
      </div>

      {/* Warehouse filter bar */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Warehouse className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            value={selectedWarehouseId}
            onChange={(e) => selectWarehouse(e.target.value)}
          >
            {warehousesQuery.isLoading ? (
              <option>{dictionary.loadingWarehouses}</option>
            ) : (
              warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))
            )}
          </select>
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder={dictionary.filterSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600" onClick={() => setSearchQuery("")} type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {(selectedZone !== null || selectedFloor !== null) && (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
            onClick={() => { setSelectedZone(null); setSelectedFloor(null); }}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
            {selectedFloor ?? selectedZone}
          </button>
        )}
      </div>

      {/* 3-panel layout */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden rounded-2xl">

        {/* LEFT — Warehouse Tree */}
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: isTreeCollapsed ? 0 : 240, opacity: isTreeCollapsed ? 0 : 1, borderWidth: isTreeCollapsed ? 0 : undefined }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">{dictionary.treeTitle}</span>
            <button className="rounded-lg p-1 text-slate-400 hover:bg-violet-50 hover:text-violet-600" onClick={() => setIsTreeCollapsed(true)} type="button">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pretty-scroll p-2">
            {locationsQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-violet-50" />
                ))}
              </div>
            ) : !selectedWarehouseId ? (
              <p className="p-3 text-xs text-slate-400">{dictionary.noWarehouseSelected}</p>
            ) : tree.length === 0 ? (
              <p className="p-3 text-xs text-slate-400">{dictionary.gridEmpty}</p>
            ) : (
              <ul className="space-y-0.5">
                {tree.map((zone) => {
                  const isZoneActive   = selectedZone === zone.name && selectedFloor === null;
                  const isZoneExpanded = expandedZones.has(zone.name);
                  return (
                    <li key={zone.name}>
                      <button
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors
                          ${isZoneActive ? "bg-violet-100 font-semibold text-violet-700" : "text-slate-600 hover:bg-violet-50"}`}
                        onClick={() => toggleZone(zone.name)}
                        type="button"
                      >
                        {isZoneExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-violet-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                        <Layers className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="flex-1 truncate">{zone.name || dictionary.unzoned}</span>
                        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">{zone.count}</span>
                      </button>
                      {isZoneExpanded && (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-violet-100 pl-2">
                          {zone.floors.map((floor) => {
                            const isFloorActive = selectedZone === zone.name && selectedFloor === floor.name;
                            return (
                              <li key={floor.name}>
                                <button
                                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors
                                    ${isFloorActive ? "bg-violet-100 font-bold text-violet-700 border-l-2 border-violet-500 -ml-[2px]" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"}`}
                                  onClick={() => selectFloor(zone.name, floor.name)}
                                  type="button"
                                >
                                  <span className="flex-1 truncate">{floor.name || dictionary.unfloored}</span>
                                  <span className="text-[10px] text-slate-400">{floor.count}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Status legend */}
          <div className="border-t border-violet-100 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{dictionary.statusLegendTitle}</p>
            {(["available", "inactive", "sale_point"] as LocationStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-2 py-0.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} />
                <span className="text-[11px] text-slate-600">{STATUS_STYLES[s].label(dictionary)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tree collapsed button */}
        {isTreeCollapsed && (
          <button
            className="flex shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-white px-1.5 shadow-sm hover:bg-violet-50"
            onClick={() => setIsTreeCollapsed(false)}
            type="button"
          >
            <ChevronRight className="h-4 w-4 text-violet-500" />
          </button>
        )}

        {/* CENTER — Location Grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
          {/* Grid header */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-violet-100 px-5 py-3">
            <div>
              <p className="font-semibold text-slate-900">
                {selectedFloor ?? selectedZone ?? selectedWarehouse?.name ?? dictionary.pageTitle}
              </p>
              <p className="text-xs text-slate-500">
                {dictionary.gridShowing} {filteredLocations.length} {dictionary.gridTotal}
              </p>
            </div>
          </div>

          {/* Grid body */}
          <div className="flex-1 overflow-y-auto pretty-scroll p-4">
            {!selectedWarehouseId ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Warehouse className="h-12 w-12 text-violet-200" />
                <p className="text-sm font-medium text-slate-500">{dictionary.gridNoWarehouse}</p>
              </div>
            ) : locationsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-violet-50" />
                ))}
              </div>
            ) : pagedLocations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <PackageOpen className="h-12 w-12 text-violet-200" />
                <p className="text-sm font-medium text-slate-500">
                  {searchQuery ? dictionary.gridSearchEmpty : dictionary.gridEmpty}
                </p>
                {!searchQuery && (
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={openAddModal}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {dictionary.addButton}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {pagedLocations.map((loc) => {
                  const status    = getStatus(loc);
                  const styles    = STATUS_STYLES[status];
                  const isSelected = selectedLocation?.id === loc.id && isDrawerOpen;
                  return (
                    <button
                      key={loc.id}
                      className={`group relative flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all duration-150
                        ${isSelected ? "border-violet-500 bg-violet-50/60 shadow-md" : `${styles.border} ${styles.bg} hover:shadow-md hover:scale-[1.02]`}`}
                      onClick={() => openDrawer(loc)}
                      type="button"
                    >
                      <span className="font-mono text-sm font-bold text-slate-900">{loc.code || loc.name}</span>
                      {loc.code && <span className="mt-0.5 truncate text-xs text-slate-500">{loc.name}</span>}
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                        <span className="text-xs font-medium text-slate-600">{styles.label(dictionary)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-violet-100 px-5 py-2.5 text-xs text-slate-500">
              <span>
                {dictionary.gridShowing} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLocations.length)} {dictionary.gridOf} {filteredLocations.length} {dictionary.gridTotal}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-violet-100 px-2.5 py-1 font-medium text-slate-600 hover:bg-violet-50 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`rounded-lg px-2.5 py-1 font-medium ${page === i + 1 ? "bg-violet-600 text-white" : "border border-violet-100 text-slate-600 hover:bg-violet-50"}`}
                    onClick={() => setPage(i + 1)}
                    type="button"
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="rounded-lg border border-violet-100 px-2.5 py-1 font-medium text-slate-600 hover:bg-violet-50 disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Detail Drawer */}
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: isDrawerOpen ? 320 : 0,
            opacity: isDrawerOpen ? 1 : 0,
            borderWidth: isDrawerOpen ? undefined : 0,
            pointerEvents: isDrawerOpen ? "auto" : "none",
          }}
        >
          {selectedLocation ? (
            <>
              {/* Drawer header */}
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-violet-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-base font-bold text-slate-900">{selectedLocation.code || selectedLocation.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[getStatus(selectedLocation)].dot}`} />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[getStatus(selectedLocation)]}`}>
                      {STATUS_STYLES[getStatus(selectedLocation)].label(dictionary)}
                    </span>
                  </div>
                </div>
                <button
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                  onClick={closeDrawer}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer info */}
              <div className="flex-1 overflow-y-auto pretty-scroll p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{dictionary.drawerTitle}</p>
                <dl className="space-y-2.5">
                  {[
                    { label: dictionary.infoWarehouse, value: selectedLocation.warehouse_name || warehouses.find((w) => w.id === selectedLocation.warehouse_id)?.name || "-" },
                    { label: dictionary.infoZone,      value: selectedLocation.zone_name  || "-" },
                    { label: dictionary.infoFloor,     value: selectedLocation.floor_name || "-" },
                    { label: dictionary.infoCode,      value: selectedLocation.code       || "-" },
                    { label: dictionary.infoName,      value: selectedLocation.name },
                    { label: dictionary.infoStatus,    value: STATUS_STYLES[getStatus(selectedLocation)].label(dictionary) },
                    { label: dictionary.infoCreatedAt, value: formatDate(selectedLocation.created_at) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <dt className="w-28 shrink-0 text-xs text-slate-400">{label}</dt>
                      <dd className="min-w-0 flex-1 text-xs font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Flags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedLocation.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {dictionary.infoActive}: {selectedLocation.is_active ? "✓" : "✗"}
                  </span>
                  {selectedLocation.is_sale_point && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {dictionary.statusSalePoint}
                    </span>
                  )}
                </div>

                {/* Stored products placeholder */}
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">{dictionary.productsTitle}</p>
                  <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-center text-xs text-slate-400">
                    {dictionary.productsEmpty}
                  </div>
                </div>
              </div>

              {/* Drawer actions */}
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-violet-100 p-3">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                  onClick={() => openEditModal(selectedLocation)}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {dictionary.editButton}
                </button>
                <button
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    selectedLocation.is_active
                      ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                  }`}
                  onClick={() => setConfirmAction(selectedLocation.is_active ? "disable" : "enable")}
                  type="button"
                >
                  {selectedLocation.is_active ? dictionary.disableButton : dictionary.enableButton}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-5 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {editingLocation ? dictionary.editModalTitle : dictionary.addModalTitle}
              </h2>
              <button className="rounded-xl p-1.5 text-slate-400 hover:bg-violet-50" onClick={() => setIsModalOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Warehouse */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formWarehouse} *</label>
                <select
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={form.warehouse_id}
                  onChange={(e) => setField("warehouse_id", e.target.value)}
                >
                  <option value="">{dictionary.filterWarehousePlaceholder}</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              {/* Zone + Floor row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formZone}</label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    list="zone-datalist"
                    placeholder="A"
                    value={form.zone_name}
                    onChange={(e) => setField("zone_name", e.target.value)}
                  />
                  <datalist id="zone-datalist">
                    {tree.map((z) => <option key={z.name} value={z.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formFloor}</label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    list="floor-datalist"
                    placeholder="A01"
                    value={form.floor_name}
                    onChange={(e) => setField("floor_name", e.target.value)}
                  />
                  <datalist id="floor-datalist">
                    {tree.find((z) => z.name === form.zone_name)?.floors.map((f) => <option key={f.name} value={f.name} />)}
                  </datalist>
                </div>
              </div>

              {/* Code + Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formCode} *</label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder={dictionary.formCodeHint}
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formName} *</label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder={dictionary.formName}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${form.is_active ? "bg-violet-600" : "bg-slate-300"}`}
                    onClick={() => setField("is_active", !form.is_active)}
                    role="switch"
                    aria-checked={form.is_active}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{dictionary.formActive}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${form.is_sale_point ? "bg-violet-600" : "bg-slate-300"}`}
                    onClick={() => setField("is_sale_point", !form.is_sale_point)}
                    role="switch"
                    aria-checked={form.is_sale_point}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_sale_point ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{dictionary.formSalePoint}</span>
                </label>
              </div>

              {formError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                {dictionary.cancelButton}
              </button>
              <button
                className="rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-2 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
                disabled={isPending}
                onClick={handleSave}
                type="button"
              >
                {isPending ? dictionary.savingButton : dictionary.saveButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialogs ─────────────────────────────────────────────────────── */}
      <ConfirmDialog
        confirmLabel={confirmAction === "delete" ? dictionary.deleteButton : confirmAction === "disable" ? dictionary.disableButton : dictionary.enableButton}
        danger={confirmAction !== "enable"}
        isOpen={!!confirmAction}
        title={
          confirmAction === "disable" ? dictionary.confirmDisableTitle
          : confirmAction === "enable" ? dictionary.confirmEnableTitle
          : dictionary.confirmDeleteTitle
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmAction === "delete" ? handleDelete : handleToggleActive}
      >
        {confirmAction === "disable"
          ? dictionary.confirmDisableBody.replace("{code}", selectedLocation?.code || selectedLocation?.name || "")
          : confirmAction === "enable"
          ? dictionary.confirmEnableBody.replace("{code}", selectedLocation?.code || selectedLocation?.name || "")
          : dictionary.confirmDeleteBody.replace("{code}", selectedLocation?.code || selectedLocation?.name || "")}
      </ConfirmDialog>
    </div>
  );
}
