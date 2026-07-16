// Frontend mirror of the backend canonical deletion decision engine
// (internal/platform/lifecycle/lifecycle.go). The backend is the single source of truth for
// the *decision* (what blocks, archive vs hard-delete); this file only types the JSON it
// returns and derives the matching UI variant. Keep keys byte-aligned with lifecycle.go —
// the assessment endpoint and the blocked-delete 409 both serialize these exact shapes.

export type DeletionEntity = "warehouse" | "location";

// The safe strategy a plain "Delete" click resolves to. "" is the neutral no-determination
// value the backend returns for an idempotent no-op (already-archived double click).
export type DeletionSuggestedAction = "hard_delete" | "archive" | "blocked" | "";

// Machine-readable blocker codes (mirror the lifecycle.go Code* constants). ENTITY_STATE_CHANGED
// is not produced by Assess() — it only travels in the 409 details.code when the locked
// re-assessment disagrees with the client's declared action.
export const DELETION_BLOCKER = {
  warehouseSystemProtected: "WAREHOUSE_SYSTEM_PROTECTED",
  warehouseHasStock: "WAREHOUSE_HAS_STOCK",
  warehouseHasBlockedLocations: "WAREHOUSE_HAS_BLOCKED_LOCATIONS",
  warehouseHasOpenOperations: "WAREHOUSE_HAS_OPEN_OPERATIONS",
  locationSystemProtected: "LOCATION_SYSTEM_PROTECTED",
  locationHasStock: "LOCATION_HAS_STOCK",
  locationIsProductDefault: "LOCATION_IS_PRODUCT_DEFAULT",
  locationHasOpenOperations: "LOCATION_HAS_OPEN_OPERATIONS",
  entityStateChanged: "ENTITY_STATE_CHANGED",
} as const;

export type DeletionBlockerCode =
  | (typeof DELETION_BLOCKER)[keyof typeof DELETION_BLOCKER]
  | "";

// Entity-agnostic dependency snapshot. For a warehouse the stock / product-default /
// movement / open-operation figures are aggregated across all of its child locations.
export type DeletionBlockers = {
  stock_quantity: number;
  stock_row_count: number;
  active_location_count: number;
  location_count: number;
  product_default_location_count: number;
  open_transfer_count: number;
  open_receiving_count: number;
  open_stock_count_count: number;
  movement_count: number;
  historical_reference_count: number;
  blocked_child_count: number;
  system_protected: boolean;
};

export type DeletionAssessment = {
  can_hard_delete: boolean;
  can_archive: boolean;
  can_deactivate: boolean;
  suggested_action: DeletionSuggestedAction;
  blocker_code?: DeletionBlockerCode; // omitempty on the wire
  blockers: DeletionBlockers;
};

// The result body of a successful smart DELETE (data: { action, assessment }).
export type DeletionOutcome = {
  action: "archived" | "deleted";
  assessment: DeletionAssessment;
};

// The structured payload carried on a blocked-delete 409 (ApiError.details / error.details).
export type DeletionErrorDetails = {
  code: DeletionBlockerCode;
  assessment: DeletionAssessment;
};

// The discriminated UI state the adaptive dialog renders. Derived purely from the assessment
// so the dialog never re-implements the backend decision rules.
export type DeletionVariant =
  | "archive" // zero-stock + history → soft delete (history preserved)
  | "hard_delete" // never used, reference-free → permanent delete
  | "blocked_stock" // SUM(stocks.quantity) != 0
  | "blocked_default" // location is a product default
  | "blocked_protected" // system / default protected (stable flag)
  | "blocked_children" // warehouse has hard-blocked child locations
  | "blocked_open_ops" // open receiving / stock-count sessions
  | "blocked_generic"; // fallback in-use

export function deletionVariant(a: DeletionAssessment | null | undefined): DeletionVariant | null {
  if (!a) return null;
  if (a.suggested_action === "archive") return "archive";
  if (a.suggested_action === "hard_delete") return "hard_delete";
  // suggested_action === "blocked" (or "") → narrow by the machine code.
  switch (a.blocker_code) {
    case DELETION_BLOCKER.warehouseHasStock:
    case DELETION_BLOCKER.locationHasStock:
      return "blocked_stock";
    case DELETION_BLOCKER.locationIsProductDefault:
      return "blocked_default";
    case DELETION_BLOCKER.warehouseSystemProtected:
    case DELETION_BLOCKER.locationSystemProtected:
      return "blocked_protected";
    case DELETION_BLOCKER.warehouseHasBlockedLocations:
      return "blocked_children";
    case DELETION_BLOCKER.warehouseHasOpenOperations:
    case DELETION_BLOCKER.locationHasOpenOperations:
      return "blocked_open_ops";
    default:
      return "blocked_generic";
  }
}

// A confirmable variant maps to a DELETE ?expected=<action>; a blocked variant has no
// confirm action (the user must remediate first).
export function variantIsConfirmable(v: DeletionVariant | null): v is "archive" | "hard_delete" {
  return v === "archive" || v === "hard_delete";
}

// Narrows an unknown ApiError.details into the structured deletion payload. Returns null when
// the error is not a deletion blocker (e.g. a plain 403/404), so callers can fall back.
export function asDeletionErrorDetails(details: unknown): DeletionErrorDetails | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  if (typeof d.code !== "string") return null;
  if (!d.assessment || typeof d.assessment !== "object") return null;
  return { code: d.code as DeletionBlockerCode, assessment: d.assessment as DeletionAssessment };
}

// ── Localized dialog dictionary ──────────────────────────────────────────────────────────
// One shared shape for the adaptive dialog, mirrored under both the warehouseInventory and
// storageLocations locale slices (each localizes its own entity noun). Placeholders {qty},
// {rows}, {count}, {name} are substituted at render time.
export type DeletionDialogDictionary = {
  // chrome
  cancel: string;
  close: string;
  assessing: string;
  assessError: string;
  retry: string;
  badgeArchived: string;
  stateChangedNotice: string;
  // archive (safe soft-delete)
  archiveTitle: string;
  archiveBody: string;
  archiveHistoryNote: string;
  archiveConfirm: string;
  archivedToast: string;
  // hard delete (never used → permanent)
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
  deletedToast: string;
  // blocked: remaining stock
  blockedStockTitle: string;
  blockedStockBody: string; // {qty} {rows}
  blockedStockCta: string;
  // blocked: product default location
  blockedDefaultTitle: string;
  blockedDefaultBody: string; // {count}
  blockedDefaultCta: string;
  // blocked: system / default protected
  blockedProtectedTitle: string;
  blockedProtectedBody: string;
  // blocked: warehouse has blocked children
  blockedChildrenTitle: string;
  blockedChildrenBody: string; // {count}
  // blocked: open operations
  blockedOpenOpsTitle: string;
  blockedOpenOpsBody: string; // {count}
  // blocked: generic in-use fallback
  blockedGenericTitle: string;
  blockedGenericBody: string;
};
