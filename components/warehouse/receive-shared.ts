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
    minimumFractionDigits: 2,
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
