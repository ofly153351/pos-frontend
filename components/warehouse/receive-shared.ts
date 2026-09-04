import type { GoodsReceiptDraft } from "@/types/goods-receipt";

export type ReceiveDictionary = {
  actionBack: string;
  actionBackToOverview: string;
  actionCancel: string;
  actionClose: string;
  actionConfirm: string;
  actionContinue: string;
  actionCreateDraft: string;
  actionCreatingDraft: string;
  actionEditDraft: string;
  actionNewReceipt: string;
  actionOpenConfirmedView: string;
  actionPrint: string;
  actionResumeDraft: string;
  actionSaveAndContinue: string;
  actionScanDuplicate: string;
  actionSaving: string;
  actionPreviewAttachment: string;
  actionRemoveAttachment: string;
  actionUploadAttachment: string;
  actionUploadingAttachment: string;
  actionViewReceipt: string;
  badgeCancelled: string;
  badgeConfirmed: string;
  badgeDraft: string;
  badgeStep: string;
  confirmCancel: string;
  confirmBody: string;
  confirmLeaveBody: string;
  confirmLeaveTitle: string;
  confirmTitle: string;
  emptyLocations: string;
  emptyProducts: string;
  emptyStockPreview: string;
  emptySuppliers: string;
  helperAutosaveError: string;
  helperAutosaveSaved: string;
  helperAutosaveSaving: string;
  helperConfirmedView: string;
  helperDraft: string;
  helperIndex: string;
  helperScanInput: string;
  helperStep1: string;
  helperStep2: string;
  helperStep3: string;
  helperStart: string;
  helperUploadAttachment: string;
  itemCountLabel: string;
  labelAllProducts: string;
  labelAttachment: string;
  labelAttachmentPending: string;
  labelAttachmentUnknownType: string;
  labelAttachmentUploaded: string;
  labelBarcode: string;
  labelConfirmedAt: string;
  labelConfirmedBy: string;
  labelCreatedBy: string;
  labelDiscount: string;
  labelDocumentNo: string;
  labelDraftReceipts: string;
  labelItems: string;
  labelLineTotal: string;
  labelLocation: string;
  labelNetAmount: string;
  labelNote: string;
  labelProduct: string;
  labelQuantity: string;
  labelReceiptStatus: string;
  labelReceivedAt: string;
  labelRecentReceipts: string;
  labelReferenceNo: string;
  labelScanCode: string;
  labelSearchProducts: string;
  labelSelectedQuantity: string;
  labelSku: string;
  labelStockPreview: string;
  labelStorageSummary: string;
  labelSubtotal: string;
  labelSupplier: string;
  labelSupplierOptional: string;
  labelTotal: string;
  labelUnitPrice: string;
  labelVatAmount: string;
  labelVatIncluded: string;
  labelVatPercent: string;
  labelWarehouse: string;
  pageTitle: string;
  placeholderLocation: string;
  placeholderNote: string;
  placeholderReferenceNo: string;
  placeholderScanCode: string;
  placeholderSearchProducts: string;
  scanWithCamera?: string;
  placeholderSelectSupplier: string;
  placeholderSelectWarehouse: string;
  startPageDescription: string;
  startPageTitle: string;
  stateLoading: string;
  stateLoadingDrafts: string;
  stateLoadingLocations: string;
  stateLoadingStockPreview: string;
  stateNoDrafts: string;
  stateNoMatchingProduct: string;
  stateNoPendingAttachments: string;
  stateNoRecentReceipts: string;
  stateNoReceipt: string;
  statePrintAfterConfirm: string;
  statePrintBlocked: string;
  statePrintPreparing: string;
  statePrintSuccess: string;
  statePrintMissingContent: string;
  stateSaving: string;
  stateScanMatched: string;
  stateUploadSuccess: string;
  stateUploadingFailed: string;
  stateAttachmentMissing: string;
  stateUploadingAttachmentProgress: string;
  stateStockImpactSummary: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  stepConfirmedTitle: string;
  stepLabel1: string;
  stepLabel2: string;
  stepLabel3: string;
  stockAfter: string;
  stockBefore: string;
  stockChange: string;
  summaryTitle: string;
  validationItemsRequired: string;
  validationLocationRequired: string;
  validationQuantityRequired: string;
  validationReceivedAtRequired: string;
  validationUnitPriceRequired: string;
  validationWarehouseRequired: string;
  addLocationLabel: string;
  createLocationTitle: string;
  locationCodeLabel: string;
  locationNameLabel: string;
  locationNameRequired: string;
  locationSaveLabel: string;
  validationWarehouseOnlySalePoints: string;
  validationWarehouseWithoutLocations: string;
  viewNotConfirmed: string;
  // ── Single-page editor ──
  editorTitle: string;
  editorSubtitle: string;
  sectionDocument: string;
  sectionItems: string;
  sectionInspection: string;
  sectionFinancial: string;
  sourceLabel: string;
  sourceFromPo: string;
  sourceDirect: string;
  noPoMatch: string;
  labelPurchaseOrder: string;
  placeholderSelectPo: string;
  colDestination: string;
  colOrdered: string;
  colPrevReceived: string;
  colRemaining: string;
  colActualReceived: string;
  colDifference: string;
  colStatus: string;
  statusComplete: string;
  statusShort: string;
  statusOver: string;
  statusNotReceived: string;
  statusReceived: string;
  inspectionTotalLines: string;
  inspectionTotalOrdered: string;
  inspectionTotalReceived: string;
  inspectionTotalRemaining: string;
  inspectionTotalDifference: string;
  inspectionComplete: string;
  inspectionShort: string;
  inspectionOver: string;
  inspectionNotReceived: string;
  inspectionMismatchTitle: string; // uses {count}
  inspectionOverWarning: string;
  inspectionReceivedNote: string;
  overReceiptInline: string; // uses {remaining}
  autoLocationHint: string;
  itemNoLocation: string;
  itemLocationUnavailable: string;
  itemLocationWrongWarehouse: string;
  actionGoSetProductLocation: string;
  locationSalePointTag: string;
  locationStorageTag: string;
  validationSelectAllLocations: string;
  statePrereqError: string;
  emptyItems: string;
  actionSaveDraft: string;
  actionSubmit: string;
  actionSubmitting: string;
  actionReopen: string;
  actionConfirmReceipt: string;
  actionConfirming: string;
  badgePendingReview: string;
  readonlyPending: string;
  readonlyConfirmed: string;
  readonlyCancelled: string;
  actionBackToList: string;
};

export type HeaderForm = {
  note: string;
  receivedAt: string;
  referenceNo: string;
  supplierId: string;
  vatIncluded: boolean;
  vatPercent: string;
  warehouseId: string;
};

export type ItemFormRow = {
  discountValue: string;
  locationId: string;
  quantity: string;
  unitPrice: string;
};

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function formatDateTimeInput(value?: string | null) {
  const toLocal = (d: Date) => {
    const offsetMs = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  };
  if (!value) return toLocal(new Date());
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toLocal(new Date());
  return toLocal(date);
}

export function formatDateTimeLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatSignedNumber(value?: number | null) {
  const n = value ?? 0;
  const abs = formatNumber(Math.abs(n));
  return n > 0 ? `+${abs}` : n < 0 ? `-${abs}` : abs;
}

export function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value ?? 0);
}

export function formatFileSize(value?: number | null) {
  if (!value || value <= 0) return "-";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function readSessionValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function clearSessionValue(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

export function buildHeaderForm(receipt?: GoodsReceiptDraft | null): HeaderForm {
  return {
    note: receipt?.note ?? "",
    receivedAt: formatDateTimeInput(receipt?.received_at),
    referenceNo: receipt?.reference_no ?? "",
    supplierId: receipt?.supplier_id ?? "",
    vatIncluded: receipt?.vat_included ?? true,
    vatPercent: String(receipt?.vat_percent ?? 7),
    warehouseId: receipt?.warehouse_id ?? "",
  };
}

export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeGoodsReceiptDraft(receipt: GoodsReceiptDraft): GoodsReceiptDraft {
  return {
    ...receipt,
    attachments: ensureArray(receipt.attachments),
    audits: ensureArray(receipt.audits),
    items: ensureArray(receipt.items),
    pending_attachments: ensureArray(receipt.pending_attachments),
    stock_preview: ensureArray(receipt.stock_preview),
  };
}

export function normalizeGoodsReceiptDraftList(receipts: GoodsReceiptDraft[] | null | undefined): GoodsReceiptDraft[] {
  return ensureArray(receipts).map(normalizeGoodsReceiptDraft);
}

export function buildItemRows(receipt?: GoodsReceiptDraft | null, products: { id: string; cost_price?: number | null; effective_price?: number | null }[] = []) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const rows: Record<string, ItemFormRow> = {};
  for (const item of receipt?.items ?? []) {
    const product = productMap.get(item.product_id);
    rows[item.product_id] = {
      discountValue: String(item.discount_value ?? 0),
      locationId: item.location_id,
      quantity: String(item.quantity),
      unitPrice: String(item.unit_price ?? product?.cost_price ?? product?.effective_price ?? 0),
    };
  }
  return rows;
}

export function getEditableReceiptStep(receipt: GoodsReceiptDraft) {
  if (receipt.status === "confirmed" || receipt.status === "cancelled") return "view" as const;
  if (!receipt.warehouse_id || !receipt.received_at) return 1 as const;
  if (!(receipt.items?.length ?? 0)) return 2 as const;
  return 3 as const;
}

export function getReceiptRoute(locale: string, receipt: GoodsReceiptDraft) {
  const step = getEditableReceiptStep(receipt);
  return step === "view"
    ? `/${locale}/warehouse/receive/${receipt.id}/view`
    : `/${locale}/warehouse/receive/${receipt.id}/step-${step}`;
}

export function buildHeaderPayload(headerForm: HeaderForm) {
  return {
    note: headerForm.note.trim() || undefined,
    received_at: new Date(headerForm.receivedAt).toISOString(),
    reference_no: headerForm.referenceNo.trim() || undefined,
    supplier_id: headerForm.supplierId || undefined,
    vat_included: headerForm.vatIncluded,
    vat_percent: Number(headerForm.vatPercent || 0),
    warehouse_id: headerForm.warehouseId,
  };
}

export function buildDraftItemsPayload(itemRows: Record<string, ItemFormRow>) {
  return Object.entries(itemRows)
    .filter(([, row]) => Number(row.quantity) > 0)
    .map(([productId, row]) => ({
      discount_value: Number(row.discountValue || 0),
      location_id: row.locationId,
      product_id: productId,
      quantity: Number(row.quantity),
      unit_price: Number(row.unitPrice || 0),
    }))
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

// ── Single-page editor model ─────────────────────────────────────────────────
// Rows are keyed by PRODUCT (one product = one row). Each row carries an explicit
// receiving locationId: it is PRE-SELECTED from the product's authoritative default
// (products.default_location_id) when that default is valid for the receipt
// warehouse, and the user can override it per line. An empty locationId means the
// line is unresolved and must be selected before submit/confirm.

export type ReceiveItemRow = {
  key: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unitName: string;
  quantity: string; // kept as a string so the input can be temporarily empty while typing
  unitPrice: string;
  discountValue: string;
  locationId: string; // explicit per-line receiving location ("" = unresolved)
};

export type ReceiveRowStatus = "complete" | "short" | "over" | "not_received" | "received";

/** Resolution state of a product's default receiving location.
 *  "resolving" = prerequisite product/location data not loaded yet (neutral, non-blocking). */
export type LocationResolveStatus = "ok" | "resolving" | "missing" | "unavailable" | "wrong_warehouse";

/** PO ordered/received per product, used for the ordered/remaining/difference columns. */
export type ReceivePoLine = { productId: string; ordered: number; previouslyReceived: number };

export function receiveRowKey(productId: string) {
  return productId;
}

export function buildEditorRows(receipt?: GoodsReceiptDraft | null): Record<string, ReceiveItemRow> {
  const rows: Record<string, ReceiveItemRow> = {};
  for (const item of receipt?.items ?? []) {
    const key = receiveRowKey(item.product_id);
    const existing = rows[key];
    if (existing) {
      // Pre-Phase-2 drafts could split one product across locations; merge them and
      // keep the first persisted location as the row's selection.
      existing.quantity = String(Number(existing.quantity || 0) + Number(item.quantity || 0));
      if (!existing.locationId) existing.locationId = (item.location_id ?? "").trim();
      continue;
    }
    rows[key] = {
      key,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku ?? "",
      barcode: item.barcode ?? "",
      unitName: item.unit_name ?? "",
      quantity: String(item.quantity),
      unitPrice: String(item.unit_price ?? 0),
      discountValue: String(item.discount_value ?? 0),
      // Reopening a draft restores the user's previously chosen receiving location.
      locationId: (item.location_id ?? "").trim(),
    };
  }
  return rows;
}

export function buildEditorItemsPayload(rows: Record<string, ReceiveItemRow>) {
  // location_id carries the user's explicit per-line receiving location so it is
  // persisted on the draft (and restored on reopen). When empty, the backend
  // resolves the product's authoritative default.
  return Object.values(rows)
    .filter((row) => Number(row.quantity) > 0)
    .map((row) => ({
      discount_value: Number(row.discountValue || 0),
      location_id: row.locationId ? row.locationId : undefined,
      product_id: row.productId,
      quantity: Math.floor(Number(row.quantity) || 0),
      unit_price: Number(row.unitPrice || 0),
    }))
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

/** Status of a row vs the PO remaining for its product (aggregate received across rows). */
export function receiveRowStatus(
  hasPo: boolean,
  receivedForProduct: number,
  remainingForProduct: number,
): ReceiveRowStatus {
  if (!hasPo) return receivedForProduct > 0 ? "received" : "not_received";
  if (receivedForProduct <= 0) return "not_received";
  if (receivedForProduct > remainingForProduct) return "over";
  if (receivedForProduct < remainingForProduct) return "short";
  return "complete";
}

// ── H-01: single source of truth for PO-quantity comparisons ──────────────────
// Definitions (backend/DB are the authority):
//   ordered        = purchase_order_items.quantity  (จำนวนที่สั่ง)
//   prevReceived   = purchase_order_items.received_quantity (รับแล้ว — only
//                    CONFIRMED receipts bump it, so for a draft/pending_review
//                    document it excludes THIS document's own lines)
//   remainingBefore = ordered − prevReceived  (คงเหลือที่ PO ยังเป็นหนี้ ก่อน doc นี้)
//   received       = qty rows in THIS document (รับจริง)
//   remainingAfter = outstanding LEFT on the PO line once THIS document confirms
//                    = max(0, remainingBefore − received)
//   difference     = received − remainingBefore  (กี่หน่วยที่ doc นี้ เกิน/ขาด
//                    เทียบกับยอดค้าง; 0 = ครบ, ลบ = ขาด, บวก = เกิน)
//
// A verdict (short/complete/over + difference) is only MEANINGFUL while the
// document has not yet been counted into the PO aggregate (draft/pending_review).
// On a CONFIRMED receipt, received_quantity already includes this doc's own
// lines, so comparing the doc against remainingBefore would count the document
// against itself (POS-005 class) → verdicts are suppressed and the row shows a
// factual "received/not_received" state instead.

export type ReceiveQtyResult = {
  ordered: number;
  prevReceived: number;
  remainingBefore: number;
  remainingAfter: number;
  received: number;
  status: ReceiveRowStatus;
  /** null = no PO verdict is applicable (no PO link, or the doc is confirmed/cancelled). */
  difference: number | null;
};

export type ReceiveQtyInput = {
  hasPo: boolean;
  /** true only while status is draft|pending_review (doc not yet in PO aggregate). */
  verdictsOn: boolean;
  /** true when the document itself is already confirmed. */
  confirmed: boolean;
  ordered: number;
  prevReceived: number;
  received: number;
};

export function resolveReceiveQty({
  hasPo,
  verdictsOn,
  confirmed,
  ordered,
  prevReceived,
  received,
}: ReceiveQtyInput): ReceiveQtyResult {
  const safeOrdered = Number.isFinite(ordered) ? Math.max(0, Math.floor(ordered)) : 0;
  const safePrev = Number.isFinite(prevReceived) ? Math.max(0, Math.floor(prevReceived)) : 0;
  const safeReceived = Number.isFinite(received) ? Math.max(0, Math.floor(received)) : 0;
  const remainingBefore = hasPo ? Math.max(0, safeOrdered - safePrev) : 0;
  const remainingAfter = Math.max(0, remainingBefore - safeReceived);

  if (!hasPo) {
    return {
      ordered: safeOrdered,
      prevReceived: safePrev,
      remainingBefore: 0,
      remainingAfter: 0,
      received: safeReceived,
      status: safeReceived > 0 ? "received" : "not_received",
      difference: null,
    };
  }
  if (!verdictsOn) {
    // Confirmed/cancelled: the PO aggregate may already include this document's
    // own lines, so over/short/complete against remainingBefore is meaningless.
    // Confirmed rows were really received; cancelled rows were not.
    return {
      ordered: safeOrdered,
      prevReceived: safePrev,
      remainingBefore,
      remainingAfter,
      received: safeReceived,
      status: confirmed && safeReceived > 0 ? "received" : "not_received",
      difference: null,
    };
  }
  const status = receiveRowStatus(true, safeReceived, remainingBefore);
  return {
    ordered: safeOrdered,
    prevReceived: safePrev,
    remainingBefore,
    remainingAfter,
    received: safeReceived,
    status,
    difference: safeReceived > 0 ? safeReceived - remainingBefore : null,
  };
}

export type ReceiveInspectionInput = {
  hasPo: boolean;
  /** draft|pending_review — the only states where over/short verdicts are shown. */
  verdictsOn: boolean;
  confirmed: boolean;
  /** PO lines keyed by product; only lines still outstanding count as "ยังไม่ได้รับ". */
  poMap: ReadonlyMap<string, { ordered: number; prevReceived: number }>;
  /** This document's received qty per product (rows in the editor). */
  receivedByProduct: Readonly<Record<string, number>>;
  /** Display name resolver for mismatch rows. */
  productName: (productId: string) => string;
};

export type ReceiveInspectionSummary = {
  counts: {
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
  mismatches: {
    productId: string;
    productName: string;
    ordered: number;
    received: number;
    difference: number;
    kind: "short" | "over";
  }[];
  hasOver: boolean;
};

/**
 * Pure H-01 summary computation shared by the editor memo and the regression
 * tests, so the row table and the inspection card can never disagree.
 *
 * Scope = products present in this document + PO lines still outstanding
 * (remainingBefore > 0). Lines the PO already fully received elsewhere are NOT
 * part of this document's story and are excluded (they must not appear as
 * "ยังไม่ได้รับ" on a mixed-receive PO).
 */
export function buildReceiveInspection({
  hasPo,
  verdictsOn,
  confirmed,
  poMap,
  receivedByProduct,
  productName,
}: ReceiveInspectionInput): ReceiveInspectionSummary {
  const productIds = new Set<string>(Object.keys(receivedByProduct));
  for (const [pid, po] of poMap) {
    const remainingBefore = Math.max(0, po.ordered - po.prevReceived);
    if (remainingBefore > 0 || receivedByProduct[pid] !== undefined) productIds.add(pid);
  }

  const counts = {
    totalLines: Object.keys(receivedByProduct).length,
    totalOrdered: 0,
    totalReceived: 0,
    totalRemaining: 0,
    totalDifference: 0,
    complete: 0,
    short: 0,
    over: 0,
    notReceived: 0,
  };
  const mismatches: ReceiveInspectionSummary["mismatches"] = [];

  for (const pid of [...productIds].sort()) {
    const po = poMap.get(pid);
    const ordered = po?.ordered ?? 0;
    const prevReceived = po?.prevReceived ?? 0;
    const received = receivedByProduct[pid] ?? 0;
    const r = resolveReceiveQty({ hasPo, verdictsOn, confirmed, ordered, prevReceived, received });
    counts.totalOrdered += r.ordered;
    counts.totalReceived += r.received;
    counts.totalRemaining += r.remainingAfter;
    if (r.difference !== null) counts.totalDifference += r.difference;

    if (!verdictsOn) continue; // confirmed/cancelled: never emit PO verdict counts
    switch (r.status) {
      case "complete":
        counts.complete += 1;
        break;
      case "short":
        counts.short += 1;
        mismatches.push({
          productId: pid,
          productName: productName(pid),
          ordered: r.ordered, // real PO ordered — not remaining (H-01 "สั่ง 0" fix)
          received: r.received,
          difference: r.difference ?? 0,
          kind: "short",
        });
        break;
      case "over":
        counts.over += 1;
        mismatches.push({
          productId: pid,
          productName: productName(pid),
          ordered: r.ordered,
          received: r.received,
          difference: r.difference ?? 0,
          kind: "over",
        });
        break;
      case "not_received":
        counts.notReceived += 1;
        break;
      case "received":
        break;
    }
  }
  return { counts, mismatches, hasOver: counts.over > 0 };
}
