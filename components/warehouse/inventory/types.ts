import type { Location } from "@/services/locations";
import type { ProductStockLocation } from "@/types/warehouse-inventory";
import type { ReactNode } from "react";
import type { WarehouseAction } from "./warehouse-action-bar";
import type { WarehouseInventoryProduct, WarehouseInventorySummary } from "@/types/warehouse-inventory";
import type { LucideIcon } from "lucide-react";
import type { WarehouseInventorySort } from "@/types/warehouse-inventory";
import type { WarehouseLocationType } from "@/types/warehouse-inventory";
import type { WarehouseStockStatus } from "@/types/warehouse-inventory";
import type { Warehouse } from "@/types/warehouse";
import type { LocationTransferDict } from "@/components/stock/location-transfer-drawer";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";


// The warehouseInventory locale slice, derived from the JSON so it always tracks the keys.
export type WarehouseInventoryDictionary =
  (typeof import("@/locales/en.json"))["warehouseInventory"];

// A product's stock at one location, enriched by joining the stock summary
// (quantity) with the location metadata (warehouse / zone / floor / type / active).
export type EnrichedStockLocation = {
  location_id: string;
  name: string;
  code?: string | null;
  warehouse_name?: string | null;
  zone_name?: string | null;
  floor_name?: string | null;
  is_sale_point: boolean;
  is_active: boolean;
  quantity: number;
};

export type ProductLocationBreakdown = {
  sale: EnrichedStockLocation[];
  storage: EnrichedStockLocation[];
  readyStock: number;
  storageStock: number;
  totalStock: number;
};

export type RawLocation = Location;
export type RawStockLocation = ProductStockLocation;

export type DrawerShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

export type MobileWarehouseActionsProps = {
  dict: WarehouseInventoryDictionary;
  actions: WarehouseAction[];
};

export type ProductLocationDrawerProps = {
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

export type ProductPickerModalProps = {
  open: boolean;
  warehouseId: string;
  title: string;
  dict: WarehouseInventoryDictionary;
  onPick: (product: WarehouseInventoryProduct) => void;
  onClose: () => void;
};

export type WarehouseActionBarWarehouseActionHandlers = {
  onReceive: () => void;
  onTransfer: () => void;
  onAdjust: () => void;
  onCount: () => void;
  onManageWarehouse: () => void;
  onStorageLocations: () => void;
  onProducts: () => void;
  onExport: () => void;
};

export type WarehouseActionBarWarehouseActionGates = {
  canManage: boolean;
  canReceive: boolean;
};

export type WarehouseActionBarWarehouseAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
};

export type WarehouseActionBarProps = {
  actions: WarehouseActionBarWarehouseAction[];
};

export type WarehouseFiltersWarehouseFiltersState = {
  search: string;
  categoryId: string;
  stockStatus: WarehouseStockStatus | "";
  locationType: WarehouseLocationType | "";
  sort: WarehouseInventorySort | "";
};

export type WarehouseFiltersProps = {
  dict: WarehouseInventoryDictionary;
  value: WarehouseFiltersWarehouseFiltersState;
  categories: { id: string; name: string }[];
  onChange: (patch: Partial<WarehouseFiltersWarehouseFiltersState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

export type WarehouseFormProps = {
  open: boolean;
  mode: "create" | "edit";
  warehouse: Warehouse | null;
  dict: WarehouseInventoryDictionary;
  onClose: () => void;
  onSaved: (warehouse: Warehouse) => void;
};

export type WarehouseFormFormState = {
  name: string;
  code: string;
  contact_name: string;
  phone: string;
  address: string;
  is_active: boolean;
};

export type WarehouseInventoryManagerProps = {
  dictionary: WarehouseInventoryDictionary;
  transferDict: LocationTransferDict;
  adjustDict: InventoryAdjustDictionary;
  locale: string;
};

export type WarehouseKpiGridProps = {
  dict: WarehouseInventoryDictionary;
  summary: WarehouseInventorySummary | undefined;
  loading: boolean;
};

export type WarehouseManagementDrawerStatusFilter = "active" | "inactive" | "archived";

export type WarehouseManagementDrawerProps = {
  open: boolean;
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  statsByWarehouse: Map<string, { zones: number; locations: number }>;
  dict: WarehouseInventoryDictionary;
  locale: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (w: Warehouse) => void;
  onViewStorage: (w: Warehouse) => void;
  onChanged: () => void;
};

export type WarehouseProductCardsProps = {
  dict: WarehouseInventoryDictionary;
  items: WarehouseInventoryProduct[];
  onViewLocations: (item: WarehouseInventoryProduct) => void;
  onTransfer: (item: WarehouseInventoryProduct) => void;
  canTransfer: boolean;
};

export type WarehouseProductTableProps = {
  dict: WarehouseInventoryDictionary;
  items: WarehouseInventoryProduct[];
  onViewLocations: (item: WarehouseInventoryProduct) => void;
  onTransfer: (item: WarehouseInventoryProduct) => void;
  canTransfer: boolean;
};

export type WarehouseSelectorProps = {
  warehouses: Warehouse[];
  value: string;
  onChange: (id: string) => void;
  dict: WarehouseInventoryDictionary;
  locationCount: number;
  productCount: number | null;
  disabled?: boolean;
};
