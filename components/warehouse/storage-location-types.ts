import type { Location } from "@/services/locations";

// ── Dictionary ────────────────────────────────────────────────────────────────
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
  addZoneButton: string;
  addFloorButton: string;
  renameZoneTitle: string;
  renameFloorTitle: string;
  newNameLabel: string;
  confirmDeleteZoneTitle: string;
  confirmDeleteZoneBody: string;
  confirmDeleteFloorTitle: string;
  confirmDeleteFloorBody: string;
  toastZoneRenamed: string;
  toastZoneDeleted: string;
  toastFloorRenamed: string;
  toastFloorDeleted: string;
};

// ── Status ────────────────────────────────────────────────────────────────────
export type LocationStatus = "available" | "inactive" | "sale_point";

export function getStatus(loc: Location): LocationStatus {
  if (!loc.is_active) return "inactive";
  if (loc.is_sale_point) return "sale_point";
  return "available";
}

export const STATUS_STYLES: Record<
  LocationStatus,
  { border: string; bg: string; dot: string; strip: string; label: (d: StorageLocationDictionary) => string }
> = {
  available:  { border: "border-emerald-300", bg: "bg-white",        dot: "bg-emerald-500", strip: "bg-emerald-400", label: (d) => d.statusAvailable },
  inactive:   { border: "border-slate-200",   bg: "bg-slate-50",     dot: "bg-slate-400",   strip: "bg-slate-300",   label: (d) => d.statusInactive },
  sale_point: { border: "border-violet-300",  bg: "bg-violet-50/60", dot: "bg-violet-500",  strip: "bg-violet-400",  label: (d) => d.statusSalePoint },
};

export const STATUS_BADGE: Record<LocationStatus, string> = {
  available:  "bg-emerald-100 text-emerald-700",
  inactive:   "bg-slate-100 text-slate-500",
  sale_point: "bg-violet-100 text-violet-700",
};

export const DRAWER_BG: Record<LocationStatus, string> = {
  available:  "from-emerald-50 to-white",
  inactive:   "from-slate-100 to-white",
  sale_point: "from-violet-50 to-white",
};

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

// ── Tree helpers ──────────────────────────────────────────────────────────────
export type DerivedFloor = { name: string; count: number };
export type DerivedZone  = { name: string; floors: DerivedFloor[]; count: number };

export function deriveTree(locations: Location[]): DerivedZone[] {
  const zoneMap = new Map<string, Map<string, number>>();
  for (const loc of locations) {
    const zone  = loc.zone_name  || "";
    const floor = loc.floor_name || "";
    if (!zoneMap.has(zone)) zoneMap.set(zone, new Map());
    const fm = zoneMap.get(zone)!;
    fm.set(floor, (fm.get(floor) ?? 0) + 1);
  }
  return Array.from(zoneMap.entries()).map(([zone, fm]) => ({
    name: zone,
    count: Array.from(fm.values()).reduce((a, b) => a + b, 0),
    floors: Array.from(fm.entries()).map(([floor, count]) => ({ name: floor, count })),
  }));
}

// ── Form ──────────────────────────────────────────────────────────────────────
export type LocationForm = {
  warehouse_id: string;
  zone_name: string;
  floor_name: string;
  code: string;
  name: string;
  is_active: boolean;
  is_sale_point: boolean;
};

export function emptyForm(warehouseId = ""): LocationForm {
  return { warehouse_id: warehouseId, zone_name: "", floor_name: "", code: "", name: "", is_active: true, is_sale_point: false };
}

export function locationToForm(loc: Location): LocationForm {
  return {
    warehouse_id:  loc.warehouse_id,
    zone_name:     loc.zone_name  ?? "",
    floor_name:    loc.floor_name ?? "",
    code:          loc.code       ?? "",
    name:          loc.name,
    is_active:     loc.is_active,
    is_sale_point: loc.is_sale_point,
  };
}
