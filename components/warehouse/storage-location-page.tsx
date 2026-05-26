"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  Folder,
  FolderOpen,
  GripVertical,
  Layers,
  LayoutGrid,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import { listWarehouses } from "@/services/warehouses";
import {
  listLocations,
  listLocationProducts,
  createLocation,
  updateLocation,
  deleteLocation,
  renameZone,
  deleteZone,
  renameFloor,
  deleteFloor,
  type Location,
} from "@/services/locations";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { toast } from "@/components/ui/toast";

import {
  getStatus,
  STATUS_STYLES,
  STATUS_BADGE,
  deriveTree,
  emptyForm,
  locationToForm,
  type StorageLocationDictionary,
  type LocationForm,
  type DerivedFloor,
  type DerivedZone,
} from "./storage-location-types";
import { LocationFormModal } from "./location-form-modal";
import { LocationDetailDrawer } from "./location-detail-drawer";

export type { StorageLocationDictionary };

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export function StorageLocationPage({ dictionary }: { dictionary: StorageLocationDictionary; locale: string }) {
  const queryClient = useQueryClient();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedZone, setSelectedZone]   = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState("");
  const [page, setPage]                   = useState(1);

  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [expandedZones, setExpandedZones]     = useState<Set<string>>(new Set());

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]         = useState(false);

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [confirmAction, setConfirmAction]     = useState<"disable" | "enable" | "delete" | null>(null);
  const [form, setForm]                       = useState<LocationForm>(emptyForm());
  const [formError, setFormError]             = useState("");
  const [isPending, startTransition]          = useTransition();

  // ── Zone / Floor CRUD state ────────────────────────────────────────────────
  type ZoneFloorTarget =
    | { kind: "zone";  zoneName: string }
    | { kind: "floor"; zoneName: string; floorName: string };

  const [renameTarget, setRenameTarget]  = useState<ZoneFloorTarget | null>(null);
  const [renameInput, setRenameInput]    = useState("");
  const [deleteTarget, setDeleteTarget]  = useState<ZoneFloorTarget | null>(null);
  const [isZFPending, startZFTransition] = useTransition();

  // ── Floor drag-and-drop order ──────────────────────────────────────────────
  // key = `${warehouseId}::${zoneName}` → ordered floor names
  const [floorOrder, setFloorOrder]     = useState<Map<string, string[]>>(new Map());
  const [draggingFloor, setDraggingFloor] = useState<string | null>(null);
  const dragFloorRef  = useRef<string | null>(null);
  const dragZoneRef   = useRef<string | null>(null);
  const lastDragOver  = useRef<string | null>(null);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function startRename(target: ZoneFloorTarget) {
    setRenameTarget(target);
    setRenameInput(target.kind === "zone" ? target.zoneName : target.floorName);
  }

  function commitRename() {
    if (!renameTarget) return;
    startZFTransition(async () => {
      try {
        if (renameTarget.kind === "zone") {
          await renameZone(selectedWarehouseId, renameTarget.zoneName, renameInput.trim());
          toast.success(dictionary.toastZoneRenamed);
        } else {
          await renameFloor(selectedWarehouseId, renameTarget.zoneName, renameTarget.floorName, renameInput.trim());
          toast.success(dictionary.toastFloorRenamed);
        }
        setRenameTarget(null);
        await queryClient.invalidateQueries({ queryKey: ["storage-locations", selectedWarehouseId] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.toastError);
      }
    });
  }

  function confirmDeleteZoneFloor() {
    if (!deleteTarget) return;
    startZFTransition(async () => {
      try {
        if (deleteTarget.kind === "zone") {
          await deleteZone(selectedWarehouseId, deleteTarget.zoneName);
          toast.success(dictionary.toastZoneDeleted);
          if (selectedZone === deleteTarget.zoneName) { setSelectedZone(null); setSelectedFloor(null); }
        } else {
          await deleteFloor(selectedWarehouseId, deleteTarget.zoneName, deleteTarget.floorName);
          toast.success(dictionary.toastFloorDeleted);
          if (selectedFloor === deleteTarget.floorName && selectedZone === deleteTarget.zoneName) setSelectedFloor(null);
        }
        setDeleteTarget(null);
        await queryClient.invalidateQueries({ queryKey: ["storage-locations", selectedWarehouseId] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.toastError);
        setDeleteTarget(null);
      }
    });
  }


  function getOrderedFloors(zone: DerivedZone): DerivedFloor[] {
    const key   = `${selectedWarehouseId}::${zone.name}`;
    const order = floorOrder.get(key);
    if (!order) return zone.floors;
    const map   = new Map(zone.floors.map((f) => [f.name, f]));
    const sorted: DerivedFloor[] = [];
    for (const name of order) { const f = map.get(name); if (f) sorted.push(f); }
    for (const f of zone.floors) { if (!order.includes(f.name)) sorted.push(f); }
    return sorted;
  }

  function handleFloorDragStart(e: React.DragEvent, zoneName: string, floorName: string) {
    dragFloorRef.current = floorName;
    dragZoneRef.current  = zoneName;
    lastDragOver.current = null;
    setDraggingFloor(floorName);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleFloorDragOver(e: React.DragEvent, zoneName: string, floorName: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragZoneRef.current !== zoneName || dragFloorRef.current === floorName) return;
    if (lastDragOver.current === floorName) return;
    lastDragOver.current = floorName;
    const key = `${selectedWarehouseId}::${zoneName}`;
    setFloorOrder((prev) => {
      const next  = new Map(prev);
      const order = [...(next.get(key) ?? [])];
      const from = order.indexOf(dragFloorRef.current!);
      const to   = order.indexOf(floorName);
      if (from === -1 || to === -1) return prev;
      order.splice(from, 1);
      order.splice(to, 0, dragFloorRef.current!);
      next.set(key, order);
      return next;
    });
  }

  function handleFloorDragEnd() {
    setDraggingFloor(null);
    dragFloorRef.current = null;
    dragZoneRef.current  = null;
    lastDragOver.current = null;
  }

  // ── Queries ────────────────────────────────────────────────────────────────
  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: listWarehouses });

  const locationsQuery = useQuery({
    queryKey: ["storage-locations", selectedWarehouseId],
    queryFn: async () => {
      const res = await listLocations({ warehouseId: selectedWarehouseId });
      return res.data?.items ?? [];
    },
    enabled: !!selectedWarehouseId,
  });

  const productsQuery = useQuery({
    queryKey: ["location-products", selectedLocation?.id],
    queryFn: async () => {
      const res = await listLocationProducts(selectedLocation!.id, { limit: 20 });
      return res.data?.items ?? [];
    },
    enabled: !!selectedLocation?.id && isDrawerOpen,
  });

  const warehouses   = Array.isArray(warehousesQuery.data?.data) ? warehousesQuery.data.data : [];
  const allLocations = locationsQuery.data ?? [];

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length) setSelectedWarehouseId(warehouses[0].id);
  }, [warehouses, selectedWarehouseId]);

  useEffect(() => { setPage(1); }, [selectedWarehouseId, selectedZone, selectedFloor, searchQuery]);

  const tree = useMemo(() => deriveTree(allLocations), [allLocations]);

  // ── Floor order: init from localStorage + sync with tree ──────────────────
  useEffect(() => {
    if (!selectedWarehouseId || !tree.length) return;
    const stored: Record<string, string[]> = (() => {
      try { return JSON.parse(localStorage.getItem(`floor_order_${selectedWarehouseId}`) ?? "{}"); }
      catch { return {}; }
    })();
    setFloorOrder((prev) => {
      const next = new Map(prev);
      for (const zone of tree) {
        const key = `${selectedWarehouseId}::${zone.name}`;
        if (!next.has(key)) {
          next.set(key, stored[zone.name] ?? zone.floors.map((f) => f.name));
        }
      }
      return next;
    });
  }, [tree, selectedWarehouseId]);

  // Persist to localStorage (debounced 600 ms)
  useEffect(() => {
    if (!selectedWarehouseId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const out: Record<string, string[]> = {};
      for (const [key, order] of floorOrder.entries()) {
        if (key.startsWith(`${selectedWarehouseId}::`)) {
          out[key.slice(selectedWarehouseId.length + 2)] = order;
        }
      }
      localStorage.setItem(`floor_order_${selectedWarehouseId}`, JSON.stringify(out));
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [floorOrder, selectedWarehouseId]);

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

  const totalPages     = Math.max(1, Math.ceil(filteredLocations.length / PAGE_SIZE));
  const pagedLocations = filteredLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Event handlers ─────────────────────────────────────────────────────────
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
    if (!expandedZones.has(zoneName)) setExpandedZones((prev) => new Set([...prev, zoneName]));
  }

  function openDrawer(loc: Location) { setSelectedLocation(loc); setIsDrawerOpen(true); }
  function closeDrawer() { setIsDrawerOpen(false); setTimeout(() => setSelectedLocation(null), 310); }

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
            name: form.name.trim(), code: form.code.trim(),
            zone_name:  form.zone_name.trim()  || undefined,
            floor_name: form.floor_name.trim() || undefined,
            is_active: form.is_active, is_sale_point: form.is_sale_point,
          });
          toast.success(dictionary.toastUpdated);
          if (selectedLocation?.id === editingLocation.id) {
            setSelectedLocation((prev) => prev ? { ...prev, ...form, name: form.name.trim(), code: form.code.trim() } : prev);
          }
        } else {
          await createLocation({
            warehouse_id: form.warehouse_id, name: form.name.trim(), code: form.code.trim(),
            zone_name:  form.zone_name.trim()  || undefined,
            floor_name: form.floor_name.trim() || undefined,
            is_active: form.is_active, is_sale_point: form.is_sale_point,
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

  // ── Card renderer ──────────────────────────────────────────────────────────
  function renderCard(loc: Location) {
    const status     = getStatus(loc);
    const styles     = STATUS_STYLES[status];
    const isSelected = selectedLocation?.id === loc.id && isDrawerOpen;
    return (
      <button
        key={loc.id}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-150
          ${isSelected
            ? "border-violet-500 bg-violet-50/80 shadow-lg shadow-violet-100"
            : `${styles.border} ${styles.bg} hover:shadow-md hover:shadow-violet-100/60 hover:-translate-y-0.5`}`}
        onClick={() => openDrawer(loc)}
        type="button"
      >
        <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-1">
          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-700">
            {loc.zone_name || "–"}
          </span>
          {loc.floor_name && (
            <>
              <ChevronRight className="h-2.5 w-2.5 shrink-0 text-slate-300" />
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-500">
                {loc.floor_name}
              </span>
            </>
          )}
        </div>
        <span className="font-mono text-lg font-black leading-none tracking-wider text-slate-900">
          {loc.code || loc.name}
        </span>
        {loc.code && <span className="mt-1.5 truncate text-xs text-slate-500">{loc.name}</span>}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
          <span className="text-xs font-semibold text-slate-600">{styles.label(dictionary)}</span>
        </div>
        <div className={`absolute inset-x-0 bottom-0 h-1 ${styles.strip} opacity-60`} />
      </button>
    );
  }

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col overflow-hidden xl:px-2 2xl:px-4">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 shadow-sm">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{dictionary.pageTitle}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{dictionary.pageSubtitle}</p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
          disabled={!selectedWarehouseId}
          onClick={openAddModal}
          type="button"
        >
          <Plus className="h-4 w-4" />
          {dictionary.addButton}
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
        {/* Warehouse */}
        <div className="relative">
          <Warehouse className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            value={selectedWarehouseId}
            onChange={(e) => selectWarehouse(e.target.value)}
          >
            {warehousesQuery.isLoading
              ? <option>{dictionary.loadingWarehouses}</option>
              : warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        {/* Zone */}
        <div className="relative">
          <Folder className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            value={selectedZone ?? ""}
            onChange={(e) => { setSelectedZone(e.target.value || null); setSelectedFloor(null); }}
          >
            <option value="">{dictionary.allZones}</option>
            {tree.map((z) => <option key={z.name} value={z.name}>{z.name || dictionary.unzoned}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder={dictionary.filterSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600" onClick={() => setSearchQuery("")} type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 3-panel layout ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">

        {/* ── LEFT: Zone/Floor Tree ──────────────────────────────────────────── */}
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-[width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: isTreeCollapsed ? 0 : 300, opacity: isTreeCollapsed ? 0 : 1, pointerEvents: isTreeCollapsed ? "none" : undefined }}
        >
          {/* Tree header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-bold uppercase tracking-widest text-violet-600">{dictionary.treeTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              {selectedWarehouseId && (
                <button
                  className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                  title={dictionary.addZoneButton}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, warehouse_id: selectedWarehouseId, zone_name: "", floor_name: "" }));
                    setEditingLocation(null);
                    setFormError("");
                    setIsModalOpen(true);
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {dictionary.addZoneButton}
                </button>
              )}
            </div>
          </div>

          {/* Tree body */}
          <div className="tree-scroll flex-1 overflow-y-auto p-2.5">
            {locationsQuery.isLoading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 animate-pulse rounded-xl bg-violet-50" />)}
              </div>
            ) : !selectedWarehouseId ? (
              <p className="px-3 py-4 text-xs text-slate-400">{dictionary.noWarehouseSelected}</p>
            ) : (
              <div className="space-y-0.5">
                {/* All row */}
                <button
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors
                    ${selectedZone === null ? "bg-violet-600 text-white shadow-sm font-semibold" : "text-slate-600 hover:bg-violet-50"}`}
                  onClick={() => { setSelectedZone(null); setSelectedFloor(null); }}
                  type="button"
                >
                  <LayoutGrid className={`h-4 w-4 shrink-0 ${selectedZone === null ? "text-white" : "text-violet-400"}`} />
                  <span className="flex-1 truncate text-sm font-semibold">{dictionary.allZones}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selectedZone === null ? "bg-white/25 text-white" : "bg-violet-100 text-violet-600"}`}>
                    {allLocations.length}
                  </span>
                </button>

                {tree.length > 0 && <div className="mx-1 my-2 border-t border-slate-100" />}

                {/* Zone rows */}
                {tree.map((zone) => {
                  const isZoneActive   = selectedZone === zone.name && selectedFloor === null;
                  const isZoneExpanded = expandedZones.has(zone.name);
                  const hasActiveChild = selectedZone === zone.name && selectedFloor !== null;
                  const isRenamingZone = renameTarget?.kind === "zone" && renameTarget.zoneName === zone.name;
                  return (
                    <div key={zone.name}>
                      {/* Zone row */}
                      {isRenamingZone ? (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2">
                          <FolderOpen className="h-4 w-4 shrink-0 text-amber-400" />
                          <input
                            autoFocus
                            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-amber-900 outline-none placeholder:text-amber-400"
                            placeholder={dictionary.newNameLabel}
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenameTarget(null); }}
                          />
                          <button className="rounded p-1 text-amber-600 hover:bg-amber-100" disabled={isZFPending} onClick={commitRename} type="button"><Check className="h-4 w-4" /></button>
                          <button className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setRenameTarget(null)} type="button"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className={`group flex items-center rounded-lg transition-colors
                          ${isZoneActive ? "bg-amber-100" : hasActiveChild ? "bg-amber-50/60" : "hover:bg-slate-50"}`}>
                          {/* Disclosure arrow */}
                          <button
                            className={`flex shrink-0 items-center justify-center rounded p-1 transition-colors
                              ${isZoneActive || hasActiveChild ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
                            onClick={() => toggleZone(zone.name)}
                            tabIndex={-1}
                            type="button"
                          >
                            {isZoneExpanded
                              ? <ChevronDown  className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </button>
                          {/* Folder icon + name */}
                          <button
                            className={`flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left
                              ${isZoneActive ? "font-bold text-amber-800" : hasActiveChild ? "font-semibold text-amber-700" : "font-medium text-slate-700"}`}
                            onClick={() => toggleZone(zone.name)}
                            type="button"
                          >
                            {isZoneExpanded
                              ? <FolderOpen className={`h-4 w-4 shrink-0 ${isZoneActive || hasActiveChild ? "text-amber-500" : "text-amber-400"}`} />
                              : <Folder    className={`h-4 w-4 shrink-0 ${isZoneActive ? "text-amber-500" : "text-amber-400"}`} />}
                            <span className="flex-1 truncate text-sm">{zone.name || dictionary.unzoned}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold
                              ${isZoneActive ? "bg-amber-200 text-amber-700" : hasActiveChild ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                              {zone.count}
                            </span>
                          </button>
                          {/* Action buttons — fade in on group hover */}
                          <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
                            <button
                              className="rounded p-1 text-slate-400 hover:bg-amber-100 hover:text-amber-600"
                              title={dictionary.renameZoneTitle}
                              onClick={(e) => { e.stopPropagation(); startRename({ kind: "zone", zoneName: zone.name }); }}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                              title={dictionary.confirmDeleteZoneTitle}
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "zone", zoneName: zone.name }); }}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Floor rows — grid-row trick for smooth height animation */}
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isZoneExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                        <div className="relative ml-4 pl-4">
                          {/* Vertical guide line */}
                          <div className="absolute bottom-2 left-0 top-0 w-px bg-slate-200" />
                          <div className="space-y-0.5 pb-1 pt-0.5">
                            {getOrderedFloors(zone).map((floor, _fi, _arr) => {
                              const isFloorActive   = selectedZone === zone.name && selectedFloor === floor.name;
                              const isRenamingFloor = renameTarget?.kind === "floor" && renameTarget.zoneName === zone.name && renameTarget.floorName === floor.name;
                              const isDragging      = draggingFloor === floor.name;
                              return (
                                <div key={floor.name} className="relative">
                                  {/* Horizontal branch */}
                                  <div className="absolute -left-4 top-[50%] h-px w-4 bg-slate-200" />
                                  {isRenamingFloor ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-2">
                                      <Layers className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                                      <input
                                        autoFocus
                                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-violet-900 outline-none placeholder:text-violet-400"
                                        placeholder={dictionary.newNameLabel}
                                        value={renameInput}
                                        onChange={(e) => setRenameInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenameTarget(null); }}
                                      />
                                      <button className="rounded p-1 text-violet-600 hover:bg-violet-100" disabled={isZFPending} onClick={commitRename} type="button"><Check className="h-3.5 w-3.5" /></button>
                                      <button className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setRenameTarget(null)} type="button"><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                  ) : (
                                    <div
                                      draggable
                                      onDragStart={(e) => handleFloorDragStart(e, zone.name, floor.name)}
                                      onDragOver={(e) => handleFloorDragOver(e, zone.name, floor.name)}
                                      onDragEnd={handleFloorDragEnd}
                                      className={`group/floor flex items-center rounded-lg transition-colors
                                        ${isDragging ? "opacity-40" : ""}
                                        ${isFloorActive ? "bg-violet-600 shadow-sm" : "hover:bg-violet-50"}`}
                                    >
                                      {/* Drag handle */}
                                      <GripVertical className={`ml-0.5 h-3.5 w-3.5 shrink-0 cursor-grab active:cursor-grabbing
                                        ${isFloorActive ? "text-white/30" : "text-slate-200 group-hover/floor:text-slate-400"}`}
                                      />
                                      <button
                                        className={`flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left
                                          ${isFloorActive ? "font-semibold text-white" : "font-medium text-slate-600"}`}
                                        onClick={() => selectFloor(zone.name, floor.name)}
                                        type="button"
                                      >
                                        <Layers className={`h-3.5 w-3.5 shrink-0 ${isFloorActive ? "text-white/80" : "text-violet-400"}`} />
                                        <span className="flex-1 truncate text-sm">{floor.name || dictionary.unfloored}</span>
                                        <span className={`text-xs font-semibold ${isFloorActive ? "text-white/70" : "text-slate-400"}`}>
                                          {floor.count}
                                        </span>
                                      </button>
                                      {/* Action buttons */}
                                      <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
                                        <button
                                          className={`rounded p-1 hover:bg-violet-100 hover:text-violet-600 ${isFloorActive ? "text-white/60" : "text-slate-300"}`}
                                          title={dictionary.renameFloorTitle}
                                          onClick={(e) => { e.stopPropagation(); startRename({ kind: "floor", zoneName: zone.name, floorName: floor.name }); }}
                                          type="button"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          className={`rounded p-1 hover:bg-rose-50 hover:text-rose-500 ${isFloorActive ? "text-white/60" : "text-slate-300"}`}
                                          title={dictionary.confirmDeleteFloorTitle}
                                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "floor", zoneName: zone.name, floorName: floor.name }); }}
                                          type="button"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {/* Add floor button */}
                            <div className="relative">
                              <div className="absolute -left-4 top-[50%] h-px w-4 bg-slate-200" />
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, warehouse_id: selectedWarehouseId, zone_name: zone.name, floor_name: "" }));
                                  setEditingLocation(null);
                                  setFormError("");
                                  setIsModalOpen(true);
                                }}
                                type="button"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {dictionary.addFloorButton}
                              </button>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status legend */}
          <div className="shrink-0 border-t border-violet-100 bg-slate-50/70 px-4 py-3.5">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">{dictionary.statusLegendTitle}</p>
            <div className="space-y-2">
              {(["available", "inactive", "sale_point"] as const).map((s) => (
                <div key={s} className="flex items-center gap-2.5">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${STATUS_STYLES[s].dot}`} />
                  <span className="text-xs text-slate-600">{STATUS_STYLES[s].label(dictionary)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tree collapsed toggle */}
        {isTreeCollapsed && (
          <button
            className="flex shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-white px-1.5 shadow-sm hover:bg-violet-50"
            onClick={() => setIsTreeCollapsed(false)}
            type="button"
          >
            <ChevronRight className="h-4 w-4 text-violet-500" />
          </button>
        )}

        {/* ── CENTER: Location Grid ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50/70 to-white px-5 py-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                {selectedFloor !== null ? (
                  <>
                    <span className="font-medium text-slate-400">{selectedZone}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span>{selectedFloor}</span>
                  </>
                ) : selectedZone !== null ? (
                  <span>{selectedZone}</span>
                ) : (
                  <span>{selectedWarehouse?.name ?? dictionary.pageTitle}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{filteredLocations.length} {dictionary.gridTotal}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!selectedWarehouseId ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                  <Warehouse className="h-8 w-8 text-violet-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">{dictionary.gridNoWarehouse}</p>
              </div>
            ) : locationsQuery.isLoading ? (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(clamp(200px,25%,300px),1fr))]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-36 animate-pulse rounded-2xl bg-violet-50" />
                ))}
              </div>
            ) : pagedLocations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                  <PackageOpen className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {searchQuery ? dictionary.gridSearchEmpty : dictionary.gridEmpty}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{dictionary.gridEmptyHint}</p>
                </div>
                {!searchQuery && (
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={openAddModal}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {dictionary.addButton}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(clamp(200px,25%,300px),1fr))]">
                {pagedLocations.map(renderCard)}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-violet-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLocations.length)} / {filteredLocations.length} {dictionary.gridTotal}
              </span>
              <div className="flex items-center gap-1">
                <button className="rounded-lg border border-violet-100 px-2.5 py-1.5 font-medium hover:bg-violet-50 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">‹</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`rounded-lg px-2.5 py-1.5 font-medium ${page === i + 1 ? "bg-violet-600 text-white shadow-sm" : "border border-violet-100 text-slate-600 hover:bg-violet-50"}`}
                    onClick={() => setPage(i + 1)}
                    type="button"
                  >
                    {i + 1}
                  </button>
                ))}
                <button className="rounded-lg border border-violet-100 px-2.5 py-1.5 font-medium hover:bg-violet-50 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">›</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Detail Drawer ───────────────────────────────────────────── */}
        <LocationDetailDrawer
          isOpen={isDrawerOpen}
          selectedLocation={selectedLocation}
          onClose={closeDrawer}
          onEdit={openEditModal}
          onConfirmAction={setConfirmAction}
          products={productsQuery.data ?? []}
          isProductsLoading={productsQuery.isLoading}
          warehouses={warehouses}
          dictionary={dictionary}
        />
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <LocationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingLocation={editingLocation}
        form={form}
        setField={setField}
        formError={formError}
        isPending={isPending}
        onSave={handleSave}
        warehouses={warehouses}
        tree={tree}
        dictionary={dictionary}
      />

      {/* ── Confirm: disable / enable / delete location ──────────────────────── */}
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

      {/* ── Confirm: delete zone / floor ─────────────────────────────────────── */}
      <ConfirmDialog
        confirmLabel={deleteTarget?.kind === "zone" ? dictionary.confirmDeleteZoneTitle : dictionary.confirmDeleteFloorTitle}
        danger
        isOpen={!!deleteTarget}
        title={deleteTarget?.kind === "zone" ? dictionary.confirmDeleteZoneTitle : dictionary.confirmDeleteFloorTitle}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteZoneFloor}
      >
        {deleteTarget?.kind === "zone"
          ? dictionary.confirmDeleteZoneBody.replace("{name}", deleteTarget.zoneName || dictionary.unzoned)
          : deleteTarget?.kind === "floor"
          ? dictionary.confirmDeleteFloorBody.replace("{name}", deleteTarget.floorName || dictionary.unfloored)
          : ""}
      </ConfirmDialog>
    </div>
  );
}
