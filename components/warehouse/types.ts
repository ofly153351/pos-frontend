import type { DeletionPhase } from "@/hooks/use-deletion-flow";
import type { DeletionTarget } from "@/hooks/use-deletion-flow";
import type { DeletionAssessment } from "@/types/lifecycle";
import type { DeletionDialogDictionary } from "@/types/lifecycle";
import type { DeletionEntity } from "@/types/lifecycle";
import type { Warehouse } from "@/types/warehouse";
import type { Location } from "@/services/locations";
import type { LocationProduct } from "@/services/locations";
import type { StorageLocationDictionary } from "./storage-location-types";
import type { LocationForm } from "./storage-location-types";
import type { DerivedZone } from "./storage-location-types";
import type { GoodsReceiptStatus } from "@/types/goods-receipt";
import type { ReceiveDictionary } from "./receive-shared";
import type { Supplier } from "@/services/suppliers";
import type { Warehouse as WarehouseType } from "@/types/warehouse";
import type { HeaderForm } from "./receive-shared";
import type { LocationResolveStatus } from "./receive-shared";
import type { ReceiveRowStatus } from "./receive-shared";
import type { Product } from "@/types/product";
import type { GoodsReceiptStockImpact } from "@/types/goods-receipt";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/locale-config";

export type DeletionDialogNavigateTarget = "transfer" | "products";

export type DeletionDialogDeletionDialogProps = {
  open: boolean;
  entity: DeletionEntity;
  target: DeletionTarget | null;
  assessment: DeletionAssessment | null;
  phase: DeletionPhase;
  error: string | null;
  stateChanged: boolean;
  dict: DeletionDialogDictionary;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onNavigate?: (target: DeletionDialogNavigateTarget) => void;
};

export type DeletionDialogIconKind = "archive" | "danger" | "warning" | "locked" | "default";

export type DeletionDialogViewModel = {
  icon: DeletionDialogIconKind;
  title: string;
  body: string;
  note?: string; // secondary line (archive history note)
  confirmLabel?: string; // present → confirmable
  danger?: boolean;
  cta?: { label: string; target: DeletionDialogNavigateTarget };
};

export type LocationDetailDrawerConfirmAction = "disable" | "enable" | "delete";

export type LocationDetailDrawerProps = {
  isOpen: boolean;
  selectedLocation: Location | null;
  onClose: () => void;
  onEdit: (loc: Location) => void;
  onConfirmAction: (action: LocationDetailDrawerConfirmAction) => void;
  products: LocationProduct[];
  isProductsLoading: boolean;
  warehouses: Warehouse[];
  dictionary: StorageLocationDictionary;
};

export type LocationFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingLocation: Location | null;
  form: LocationForm;
  setField: <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => void;
  formError: string;
  isPending: boolean;
  onSave: () => void;
  warehouses: Warehouse[];
  tree: DerivedZone[];
  dictionary: StorageLocationDictionary;
};

export type ReceiveActionBarReceiveActionBarProps = {
  dictionary: ReceiveDictionary;
  status: GoodsReceiptStatus;
  canManage: boolean;
  busy: boolean;
  hasItems: boolean;
  hasBlockingError: boolean;
  totalLines: number;
  totalQty: number;
  totalCost: number;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onReopen: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPrint: () => void;
};

export type ReceiveDocumentSectionReceiveDocumentSectionProps = {
  dictionary: ReceiveDictionary;
  documentNo: string;
  editable: boolean;
  headerForm: HeaderForm;
  errors: Partial<Record<keyof HeaderForm, string>>;
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  purchaseOrders: { id: string; order_number: string }[];
  purchaseOrderId: string;
  purchaseOrderNo: string;
  locationsWarning: string | null;
  onFieldChange: <K extends keyof HeaderForm>(field: K, value: HeaderForm[K]) => void;
  onPurchaseOrderChange: (poId: string) => void;
};

export type ReceiveEditorProps = { dictionary: ReceiveDictionary; locale: string; receiptId: string };

export type ReceiveFinancialSummaryReceiveFinancialSummaryProps = {
  dictionary: ReceiveDictionary;
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
};

export type ReceiveInspectionSummaryInspectionMismatch = {
  productId: string;
  productName: string;
  ordered: number;
  received: number;
  difference: number;
  kind: "short" | "over";
};

export type ReceiveInspectionSummaryInspectionCounts = {
  totalLines: number;
  totalOrdered: number;
  totalReceived: number;
  totalRemaining: number;
  totalDifference: number;
  complete: number;
  short: number;
  over: number;
  notReceived: number;
};

export type ReceiveInspectionSummaryReceiveInspectionSummaryProps = {
  dictionary: ReceiveDictionary;
  hasPo: boolean;
  counts: ReceiveInspectionSummaryInspectionCounts;
  mismatches: ReceiveInspectionSummaryInspectionMismatch[];
  hasOver: boolean;
  /** draft|pending_review — only these states may show over/short verdicts (H-01/POS-005 gate). */
  verdictsOn: boolean;
};

export type ReceiveItemsTableEditorRowView = {
  key: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  discountValue: string;
  hasPo: boolean;
  ordered: number;
  prevReceived: number;
  remaining: number;
  /** null = no PO verdict is applicable (confirmed/cancelled doc, or no PO link). */
  difference: number | null;
  status: ReceiveRowStatus;
  lineTotal: number;
  overReceipt: boolean;
  error: string;
  // Per-line receiving location: chosen id + resolved label/status for the picker.
  locationId: string;
  locationName: string;
  locationStatus: LocationResolveStatus;
  locationWarning: string;
  productEditHref: string;
};

export type ReceiveItemsTableReceiveItemsTableProps = {
  dictionary: ReceiveDictionary;
  rows: ReceiveItemsTableEditorRowView[];
  hasPo: boolean;
  editable: boolean;
  locationOptions: { id: string; label: string }[];
  onQtyChange: (key: string, value: string) => void;
  onQtyBlur: (key: string) => void;
  onStep: (key: string, delta: number) => void;
  onUnitCostChange: (key: string, value: string) => void;
  onLocationChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
};

export type ReceiveListReceivePageProps = {
  dictionary: ReceiveDictionary;
  locale: string;
};

export type ReceiveProductSearchReceiveProductSearchProps = {
  dictionary: ReceiveDictionary;
  products: Product[];
  search: string;
  scanFeedback: { tone: "error" | "success"; value: string } | null;
  qtyByProduct: Record<string, number>;
  disabled: boolean;
  onSearchChange: (v: string) => void;
  onScanDetected: (barcode: string) => void;
  onAdd: (product: Product) => void;
  onStep: (product: Product, delta: number) => void;
};

export type ReceiveStockPreviewReceiveStockPreviewProps = {
  dictionary: ReceiveDictionary;
  stockPreview: GoodsReceiptStockImpact[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export type StorageLocationPageStatusFilter = "active" | "inactive" | "archived";

export type WarehouseDashboardCountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";

export type WarehouseDashboardWarehouseDashboardDictionary = {
  title: string;
  subtitle: string;
  refresh: string;
  actionCenter: {
    title: string;
    subtitle: string;
    open: string;
    viewAll?: string;
    items: {
      lowStock: string;
      outOfStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
    helpers: {
      lowStock: string;
      outOfStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
  };
  kpi: {
    inventoryValue: string;
    availableStock: string;
    reservedStock: string;
    damagedStock: string;
    inTransitStock: string;
    helpers: {
      inventoryValue: string;
      availableStock: string;
      reservedStock: string;
      damagedStock: string;
      inTransitStock: string;
    };
  };
  movement: {
    title: string;
    periods: {
      sevenDays: string;
      thirtyDays: string;
      threeMonths: string;
    };
    legends: {
      receive: string;
      issue: string;
      transfer: string;
      total: string;
    };
    empty: string;
  };
  alerts: {
    title: string;
    subtitle: string;
    critical: string;
    warning: string;
    info: string;
    viewAll: string;
    noAlerts: string;
    items: {
      lowStock: string;
      pendingTransfer: string;
      pendingCount: string;
      pendingApproval: string;
    };
    stockLevel: string;
  };
  variance: {
    title: string;
    viewCount: string;
    headers: {
      product: string;
      systemQty: string;
      countQty: string;
      variance: string;
    };
    noData: string;
    noDeadStock?: string;
  };
  statusDistribution: {
    title: string;
    subtitle: string;
    labels: {
      available: string;
      reserved: string;
      damaged: string;
      inTransit: string;
      counting: string;
    };
    helpers: {
      available: string;
      reserved: string;
      damaged: string;
      inTransit: string;
      counting: string;
    };
  };
  recentActivity: {
    title: string;
    subtitle: string;
    noData: string;
    reference: string;
    types: {
      receive: string;
      transfer: string;
      adjustment: string;
      count: string;
      approval: string;
      sale: string;
      issue: string;
      return: string;
    };
    messages: {
      receive: string;
      transfer: string;
      adjustment: string;
      count: string;
      approval: string;
      sale: string;
      issue: string;
      return: string;
    };
  };
  summary: {
    inventoryValue: string;
    availableStock: string;
    reservedStock: string;
    damagedStock: string;
    inTransitStock: string;
    activeAlerts: string;
  };
  units: {
    items: string;
  };
};

export type WarehouseDashboardLocalCountItem = {
  productId: string;
  name: string;
  systemQty: number;
  counted: number | null;
  skipped: boolean;
  varianceReason?: string;
};

export type WarehouseDashboardLocalCountSession = {
  id: string;
  name: string;
  status: WarehouseDashboardCountStatus;
  createdAt: string;
  completedAt?: string | null;
  items: WarehouseDashboardLocalCountItem[];
};

export type WarehouseDashboardActionCenterItem = {
  key: string;
  label: string;
  value: number;
  helper: string;
  href: string;
  tone: "critical" | "warning" | "info";
  icon: ReactNode;
};

export type WarehouseDashboardVarianceRow = {
  key: string;
  product: string;
  systemQty: number;
  countQty: number;
  variance: number;
  sessionName: string;
  absVariance: number;
};

export type WarehouseDashboardStatusRow = {
  key: string;
  label: string;
  value: number;
  helper: string;
  tone: string;
  bar: string;
};

export type WarehouseDashboardTimelineRow = {
  id: string;
  kind: "IN" | "OUT" | "SALE" | "TRANSFER" | "ADJUST" | "RETURN" | "COUNT" | "APPROVAL";
  title: string;
  detail: string;
  reference: string;
  createdAt: string;
  tone: string;
  icon: ReactNode;
};

export type WarehouseDashboardWarehouseDashboardProps = {
  dictionary: WarehouseDashboardWarehouseDashboardDictionary;
  locale: Locale;
};

export type StorageLocationPageZoneFloorTarget =
  | { kind: "zone"; zoneName: string }
  | { kind: "floor"; zoneName: string; floorName: string };
