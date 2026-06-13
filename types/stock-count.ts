// Shared stock-count worksheet types. These mirror the backend stockcount module
// (camelCase JSON) so the API round-trips the session/items verbatim and the
// manager + service share one definition.

export type CountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";
export type CountType = "full" | "zone" | "category" | "cycle";
export type VarianceReason =
  | ""
  | "counting_error"
  | "misplaced_product"
  | "damaged_product"
  | "missing_product"
  | "receiving_not_recorded"
  | "sale_not_recorded"
  | "previous_adjustment_error"
  | "other";

export type CountAuditEntry = {
  id: string;
  productId: string;
  productName: string;
  systemQty: number;
  countedQty: number;
  difference: number;
  reason: string;
  user: string;
  timestamp: string;
};

export type CountItem = {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  systemQty: number;
  minStock: number;
  location: string;
  counted: number | null;
  note: string;
  skipped: boolean;
  varianceReason: VarianceReason;
  varianceReasonOther: string;
  countUser: string;
  countedAt: string | null;
  costBasis: number;
  adjusted: boolean;
  adjustedAt: string | null;
  adjustedBy: string;
};

export type CountSession = {
  id: string;
  name: string;
  warehouseName: string | null;
  zone: string | null;
  categoryId: string | null;
  categoryName: string | null;
  staff: string;
  note: string;
  status: CountStatus;
  createdAt: string;
  createdBy: string;
  items: CountItem[];
  countType: CountType;
  cycleRule: string;
  blindCount: boolean;
  completedAt: string | null;
  completedBy: string;
  // Derived on the client during apply; not persisted server-side (rebuilt from
  // item.adjusted flags), so it may be empty after loading on another terminal.
  auditTrail: CountAuditEntry[];
};
