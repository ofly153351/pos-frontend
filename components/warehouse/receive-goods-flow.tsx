"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Package,
  Printer,
  ReceiptText,
  Search,
  Store,
  Truck,
  Upload,
  Warehouse,
} from "lucide-react";

import {
  confirmGoodsReceipt,
  createGoodsReceiptDraft,
  fetchGoodsReceiptPrintDocument,
  generateGoodsReceiptDocumentNo,
  getGoodsReceipt,
  getGoodsReceiptStockImpact,
  listGoodsReceipts,
  updateGoodsReceipt,
  uploadGoodsReceiptAttachment,
  upsertGoodsReceiptItems,
} from "@/services/goods-receipts";
import { listLocations, type Location } from "@/services/locations";
import { listProducts } from "@/services/products";
import { getPurchaseOrder, listPurchaseOrders } from "@/services/purchases";
import { listSuppliers, type Supplier } from "@/services/suppliers";
import { listWarehouses } from "@/services/warehouses";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { Product } from "@/types/product";
import type { Warehouse as WarehouseType } from "@/types/warehouse";

type ReceiveGoodsDictionary = {
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
  validationWarehouseWithoutLocations: string;
  viewNotConfirmed: string;
};

type ReceiveGoodsNewPageProps = {
  dictionary: ReceiveGoodsDictionary;
  locale: string;
};

type ReceiveGoodsWizardProps = {
  dictionary: ReceiveGoodsDictionary;
  locale: string;
  receiptId: string;
  step: 1 | 2 | 3 | "view";
};

type HeaderForm = {
  note: string;
  receivedAt: string;
  referenceNo: string;
  supplierId: string;
  vatIncluded: boolean;
  vatPercent: string;
  warehouseId: string;
};

type ItemFormRow = {
  discountValue: string;
  locationId: string;
  quantity: string;
  unitPrice: string;
};

type StepMeta = {
  description: string;
  disabled?: boolean;
  href: string;
  key: 1 | 2 | 3;
};

type AutosaveState = "idle" | "saving" | "saved" | "error";

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 16);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatSignedNumber(value?: number | null) {
  const numericValue = value ?? 0;
  const absText = formatNumber(Math.abs(numericValue));

  if (numericValue > 0) {
    return `+${absText}`;
  }

  if (numericValue < 0) {
    return `-${absText}`;
  }

  return absText;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value ?? 0);
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function readSessionValue<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSessionValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function clearSessionValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(key);
}

function buildHeaderForm(receipt?: GoodsReceiptDraft | null): HeaderForm {
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

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeGoodsReceiptDraft(receipt: GoodsReceiptDraft): GoodsReceiptDraft {
  return {
    ...receipt,
    audits: ensureArray(receipt.audits),
    items: ensureArray(receipt.items),
    stock_preview: ensureArray(receipt.stock_preview),
  };
}

function normalizeGoodsReceiptDraftList(receipts: GoodsReceiptDraft[] | null | undefined): GoodsReceiptDraft[] {
  return ensureArray(receipts).map(normalizeGoodsReceiptDraft);
}

function buildItemRows(receipt?: GoodsReceiptDraft | null, products: Product[] = []): Record<string, ItemFormRow> {
  const productMap = new Map(products.map((product) => [product.id, product]));
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

function getEditableReceiptStep(receipt: GoodsReceiptDraft) {
  if (receipt.status === "confirmed") {
    return "view" as const;
  }

  if (!receipt.warehouse_id || !receipt.received_at) {
    return 1 as const;
  }

  if (!(receipt.items?.length ?? 0)) {
    return 2 as const;
  }

  return 3 as const;
}

function getReceiptRoute(locale: string, receipt: GoodsReceiptDraft) {
  const step = getEditableReceiptStep(receipt);
  return step === "view"
    ? `/${locale}/warehouse/receive/${receipt.id}/view`
    : `/${locale}/warehouse/receive/${receipt.id}/step-${step}`;
}

function buildHeaderPayload(headerForm: HeaderForm) {
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

function buildDraftItemsPayload(itemRows: Record<string, ItemFormRow>) {
  return Object.entries(itemRows)
    .filter(([, row]) => Number(row.quantity) > 0)
    .map(([productId, row]) => ({
      discount_value: Number(row.discountValue || 0),
      location_id: row.locationId,
      product_id: productId,
      quantity: Number(row.quantity),
      unit_price: Number(row.unitPrice || 0),
    }))
    .sort((left, right) => left.product_id.localeCompare(right.product_id));
}

function Stepper({
  currentStep,
  dictionary,
  locale,
  maxAvailableStep,
  receiptId,
}: {
  currentStep: 1 | 2 | 3;
  dictionary: ReceiveGoodsDictionary;
  locale: string;
  maxAvailableStep: 1 | 2 | 3;
  receiptId: string;
}) {
  const steps: StepMeta[] = [
    {
      description: dictionary.step1Title,
      href: `/${locale}/warehouse/receive/${receiptId}/step-1`,
      key: 1,
    },
    {
      description: dictionary.step2Title,
      href: `/${locale}/warehouse/receive/${receiptId}/step-2`,
      key: 2,
    },
    {
      description: dictionary.step3Title,
      href: `/${locale}/warehouse/receive/${receiptId}/step-3`,
      key: 3,
    },
  ];

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
            {dictionary.badgeStep}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {dictionary.pageTitle}
          </h1>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const isActive = step.key === currentStep;
            const isDone = step.key < currentStep;
            const isBlocked = step.key > maxAvailableStep;
            const stepClassName = `rounded-2xl border px-4 py-3 transition-colors ${
              isActive
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : isDone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isBlocked
                    ? "cursor-not-allowed border-violet-100 bg-slate-50 text-slate-400 opacity-70"
                    : "border-violet-100 bg-white text-slate-500"
            }`;

            const stepContent = (
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    isActive
                      ? "bg-violet-600 text-white"
                      : isDone
                        ? "bg-emerald-600 text-white"
                        : isBlocked
                          ? "bg-slate-200 text-slate-500"
                          : "bg-violet-100 text-violet-600"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.key}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {step.key === 1
                      ? dictionary.stepLabel1
                      : step.key === 2
                        ? dictionary.stepLabel2
                        : dictionary.stepLabel3}
                  </p>
                  <p className="text-xs opacity-80">{step.description}</p>
                </div>
              </div>
            );

            return isBlocked ? (
              <div aria-disabled="true" className={stepClassName} key={step.key}>
                {stepContent}
              </div>
            ) : (
              <Link className={stepClassName} href={step.href} key={step.key}>
                {stepContent}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function ReceiptStatusBadge({ dictionary, receipt }: { dictionary: ReceiveGoodsDictionary; receipt: GoodsReceiptDraft }) {
  const badgeClassName =
    receipt.status === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : receipt.status === "cancelled"
        ? "bg-rose-100 text-rose-700"
        : "bg-violet-100 text-violet-700";
  const label =
    receipt.status === "confirmed"
      ? dictionary.badgeConfirmed
      : receipt.status === "cancelled"
        ? dictionary.badgeCancelled
        : dictionary.badgeDraft;

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`}>{label}</span>;
}

export function ReceiveGoodsIndexPage({ dictionary, locale }: ReceiveGoodsNewPageProps) {
  const draftsQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "drafts"],
    queryFn: async () => normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 6, page: 1, status: "draft" })).data.items),
  });
  const recentQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "recent"],
    queryFn: async () => normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 8, page: 1 })).data.items),
  });

  const drafts = draftsQuery.data ?? [];
  const recentReceipts = recentQuery.data ?? [];
  const resumeDraft = drafts[0] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{dictionary.badgeDraft}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{dictionary.pageTitle}</h1>
            <p className="mt-3 text-sm text-slate-600">{dictionary.helperIndex}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {resumeDraft ? (
              <Link
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                href={getReceiptRoute(locale, resumeDraft)}
              >
                {dictionary.actionResumeDraft}
              </Link>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600"
              href={`/${locale}/warehouse/receive/new`}
            >
              <ReceiptText className="h-4 w-4" />
              {dictionary.actionNewReceipt}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{dictionary.labelDraftReceipts}</h2>
              <p className="mt-1 text-sm text-slate-500">{dictionary.helperDraft}</p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{drafts.length}</span>
          </div>

          {draftsQuery.isLoading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
              {dictionary.stateLoadingDrafts}
            </div>
          ) : draftsQuery.isError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {draftsQuery.error instanceof Error ? draftsQuery.error.message : dictionary.stateLoadingDrafts}
            </div>
          ) : drafts.length ? (
            <div className="mt-5 space-y-3">
              {drafts.map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{receipt.document_no}</p>
                        <ReceiptStatusBadge dictionary={dictionary} receipt={receipt} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <SummaryCard label={dictionary.labelWarehouse} value={receipt.warehouse_name ?? "-"} />
                        <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
                        <SummaryCard label={dictionary.labelItems} value={formatNumber(receipt.items.length)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                        href={getReceiptRoute(locale, receipt)}
                      >
                        {dictionary.actionResumeDraft}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
              {dictionary.stateNoDrafts}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{dictionary.labelRecentReceipts}</h2>
            {recentQuery.isLoading ? (
              <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.stateLoadingDrafts}
              </div>
            ) : recentQuery.isError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {recentQuery.error instanceof Error ? recentQuery.error.message : dictionary.stateLoadingDrafts}
              </div>
            ) : recentReceipts.length ? (
              <div className="mt-4 space-y-3">
                {recentReceipts.map((receipt) => (
                  <Link
                    className="block rounded-2xl border border-violet-100 bg-violet-50/30 p-4 transition-colors hover:border-violet-200 hover:bg-violet-50/60"
                    href={getReceiptRoute(locale, receipt)}
                    key={receipt.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{receipt.document_no}</p>
                        <p className="mt-1 text-sm text-slate-500">{receipt.warehouse_name ?? "-"}</p>
                      </div>
                      <ReceiptStatusBadge dictionary={dictionary} receipt={receipt} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{formatDateTimeLabel(receipt.updated_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.stateNoRecentReceipts}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{dictionary.helperStart}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <Warehouse className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step1Title}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <Package className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step2Title}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step3Title}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ReceiveGoodsNewPage({ dictionary, locale }: ReceiveGoodsNewPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [receivedAt, setReceivedAt] = useState(formatDateTimeInput());
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [vatPercent, setVatPercent] = useState("7");
  const [vatIncluded, setVatIncluded] = useState(true);

  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "receive", "new", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });
  const suppliersQuery = useQuery({
    queryKey: ["warehouse", "receive", "new", "suppliers"],
    queryFn: async () => (await listSuppliers()).data ?? [],
  });

  useEffect(() => {
    if (!warehouseId && warehousesQuery.data?.[0]?.id) {
      setWarehouseId(warehousesQuery.data[0].id);
    }
  }, [warehouseId, warehousesQuery.data]);

  async function handleCreateDraft() {
    setError("");

    if (!warehouseId) {
      setError(dictionary.validationWarehouseRequired);
      return;
    }

    startTransition(async () => {
      try {
        const documentNoResponse = await generateGoodsReceiptDocumentNo();
        const response = await createGoodsReceiptDraft({
          document_no: documentNoResponse.data.document_no,
          note: note.trim() || undefined,
          received_at: new Date(receivedAt).toISOString(),
          reference_no: referenceNo.trim() || undefined,
          supplier_id: supplierId || undefined,
          vat_included: vatIncluded,
          vat_percent: Number(vatPercent || 0),
          warehouse_id: warehouseId,
        });

        router.replace(`/${locale}/warehouse/receive/${response.data.id}/step-1`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.stateSaving);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
              {dictionary.badgeDraft}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {dictionary.startPageTitle}
            </h1>
            <p className="mt-3 text-sm text-slate-600">{dictionary.startPageDescription}</p>
          </div>
          <Link
            className="inline-flex items-center gap-2 self-start rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            href={`/${locale}/warehouse/overview`}
          >
            <ArrowLeft className="h-4 w-4" />
            {dictionary.actionBackToOverview}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelWarehouse}</span>
              <select
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setWarehouseId(event.target.value)}
                value={warehouseId}
              >
                <option value="">{dictionary.placeholderSelectWarehouse}</option>
                {(warehousesQuery.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelSupplierOptional}</span>
              <select
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSupplierId(event.target.value)}
                value={supplierId}
              >
                <option value="">{dictionary.placeholderSelectSupplier}</option>
                {(suppliersQuery.data ?? []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelReceivedAt}</span>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setReceivedAt(event.target.value)}
                type="datetime-local"
                value={receivedAt}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelReferenceNo}</span>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setReferenceNo(event.target.value)}
                placeholder={dictionary.placeholderReferenceNo}
                value={referenceNo}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelVatPercent}</span>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                min="0"
                onChange={(event) => setVatPercent(event.target.value)}
                step="0.01"
                type="number"
                value={vatPercent}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                checked={vatIncluded}
                className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-300"
                onChange={(event) => setVatIncluded(event.target.checked)}
                type="checkbox"
              />
              {dictionary.labelVatIncluded}
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{dictionary.labelNote}</span>
            <textarea
              className="min-h-32 rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(event) => setNote(event.target.value)}
              placeholder={dictionary.placeholderNote}
              value={note}
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
              disabled={isPending || warehousesQuery.isLoading}
              onClick={handleCreateDraft}
              type="button"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
              {isPending ? dictionary.actionCreatingDraft : dictionary.actionCreateDraft}
            </button>
            {(warehousesQuery.isLoading || suppliersQuery.isLoading) ? (
              <span className="text-sm text-slate-500">{dictionary.stateLoading}</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{dictionary.helperStart}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <Warehouse className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step1Title}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <Package className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step2Title}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{dictionary.step3Title}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{dictionary.labelWarehouse}</p>
            <p className="mt-2 text-sm text-slate-600">
              {warehousesQuery.data?.length
                ? `${warehousesQuery.data.length} ${dictionary.labelItems}`
                : dictionary.emptyLocations}
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-900">{dictionary.labelSupplier}</p>
            <p className="mt-2 text-sm text-slate-600">
              {suppliersQuery.data?.length
                ? `${suppliersQuery.data.length} ${dictionary.labelItems}`
                : dictionary.emptySuppliers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReceiveGoodsWizard({
  dictionary,
  locale,
  receiptId,
  step,
}: ReceiveGoodsWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ tone: "error" | "success"; value: string } | null>(null);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [itemRows, setItemRows] = useState<Record<string, ItemFormRow>>({});
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<keyof HeaderForm, string>>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ tone: "error" | "success"; value: string } | null>(null);
  const [printMessage, setPrintMessage] = useState<{ tone: "error" | "success"; value: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerInitializedRef = useRef(false);
  const itemsInitializedRef = useRef(false);
  const headerAutosaveSignatureRef = useRef("");
  const itemsAutosaveSignatureRef = useRef("");
  const headerStorageKey = `receive-goods:${receiptId}:step-1`;
  const itemsStorageKey = `receive-goods:${receiptId}:step-2`;

  const receiptQuery = useQuery({
    queryKey: ["warehouse", "receive", receiptId],
    queryFn: async () => normalizeGoodsReceiptDraft((await getGoodsReceipt(receiptId)).data),
  });
  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "receive", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });
  const suppliersQuery = useQuery({
    queryKey: ["warehouse", "receive", "suppliers"],
    queryFn: async () => (await listSuppliers()).data ?? [],
  });
  const productsQuery = useQuery({
    enabled: step === 2,
    queryKey: ["warehouse", "receive", "products"],
    queryFn: async () => (await listProducts({ limit: 200, page: 1 })).data.items ?? [],
  });
  const purchaseOrdersQuery = useQuery({
    enabled: step === 2,
    queryKey: ["warehouse", "receive", "purchase-orders"],
    queryFn: async () => (await listPurchaseOrders()).data ?? [],
  });

  const selectedWarehouseId = headerForm?.warehouseId || receiptQuery.data?.warehouse_id || "";
  const locationsQuery = useQuery({
    enabled: Boolean(selectedWarehouseId),
    queryKey: ["warehouse", "receive", "locations", selectedWarehouseId],
    queryFn: async () => (await listLocations(selectedWarehouseId)).data ?? [],
  });

  const receipt = receiptQuery.data;
  const stockImpactQuery = useQuery({
    enabled: Boolean(receiptId) && (step === 3 || step === "view"),
    queryKey: ["warehouse", "receive", receiptId, "stock-impact"],
    queryFn: async () => ensureArray((await getGoodsReceiptStockImpact(receiptId)).data),
  });
  const locations = locationsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const isView = step === "view";
  const isStep1 = step === 1;
  const isStep2 = step === 2;
  const isStep3 = step === 3;
  const stepLinks = {
    step1: `/${locale}/warehouse/receive/${receiptId}/step-1`,
    step2: `/${locale}/warehouse/receive/${receiptId}/step-2`,
    step3: `/${locale}/warehouse/receive/${receiptId}/step-3`,
    view: `/${locale}/warehouse/receive/${receiptId}/view`,
  };

  useEffect(() => {
    if (!receipt || headerInitializedRef.current) {
      return;
    }

    const storedHeader = readSessionValue<HeaderForm | null>(headerStorageKey, null);
    const initialHeader = storedHeader ?? buildHeaderForm(receipt);
    setHeaderForm(initialHeader);
    headerAutosaveSignatureRef.current = JSON.stringify(buildHeaderPayload(initialHeader));
    headerInitializedRef.current = true;
  }, [headerStorageKey, receipt]);

  useEffect(() => {
    if (!headerForm) {
      return;
    }

    writeSessionValue(headerStorageKey, headerForm);
  }, [headerForm, headerStorageKey]);

  useEffect(() => {
    if (!receipt || !products.length || itemsInitializedRef.current) {
      return;
    }

    const storedRows = readSessionValue<Record<string, ItemFormRow> | null>(itemsStorageKey, null);
    const initialRows = storedRows ?? buildItemRows(receipt, products);
    setItemRows(initialRows);
    itemsAutosaveSignatureRef.current = JSON.stringify(buildDraftItemsPayload(initialRows));
    itemsInitializedRef.current = true;
  }, [itemsStorageKey, products, receipt]);

  useEffect(() => {
    writeSessionValue(itemsStorageKey, itemRows);
  }, [itemRows, itemsStorageKey]);

  useEffect(() => {
    if (!headerForm?.warehouseId || !locations.length) {
      return;
    }

    const defaultLocationId = locations[0]?.id;

    if (!defaultLocationId) {
      return;
    }

    setItemRows((currentRows) => {
      let changed = false;
      const nextRows: Record<string, ItemFormRow> = {};

      for (const [productId, row] of Object.entries(currentRows)) {
        const hasLocation = locations.some((location) => location.id === row.locationId);
        nextRows[productId] = hasLocation ? row : { ...row, locationId: defaultLocationId };
        changed = changed || !hasLocation;
      }

      return changed ? nextRows : currentRows;
    });
  }, [headerForm?.warehouseId, locations]);

  useEffect(() => {
    if (!receipt) {
      return;
    }

    const recommendedStep = getEditableReceiptStep(receipt);

    if (receipt.status === "confirmed" && step !== "view") {
      router.replace(stepLinks.view);
      return;
    }

    if (step === "view" && recommendedStep !== "view") {
      router.replace(recommendedStep === 3 ? stepLinks.step3 : recommendedStep === 2 ? stepLinks.step2 : stepLinks.step1);
      return;
    }

    if (step === 3 && recommendedStep !== 3 && recommendedStep !== "view") {
      router.replace(recommendedStep === 2 ? stepLinks.step2 : stepLinks.step1);
    }

    const itemsWithoutLocation = receipt.items.filter((item) => !item.location_id);

    if (step === 3 && receipt.items.length > 0 && itemsWithoutLocation.length > 0) {
      setError(dictionary.validationLocationRequired);
    }
  }, [receipt, router, step, stepLinks.step1, stepLinks.step2, stepLinks.step3, stepLinks.view]);

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const zoneMatched = selectedZone ? (location.zone_name ?? "") === selectedZone : true;
      const floorMatched = selectedFloor ? (location.floor_name ?? "") === selectedFloor : true;
      return zoneMatched && floorMatched;
    });
  }, [locations, selectedFloor, selectedZone]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const scopedProductIds = new Set(
      Object.entries(itemRows)
        .filter(([, row]) => !selectedZone && !selectedFloor || filteredLocations.some((location) => location.id === row.locationId))
        .map(([productId]) => productId),
    );

    return products.filter((product) => {
      const matchesScope = scopedProductIds.size === 0 || scopedProductIds.has(product.id) || !itemRows[product.id];
      if (!matchesScope) return false;
      if (!keyword) return true;
      const haystack = [product.name, product.sku, product.barcode, product.brand_name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [products, search, itemRows, selectedZone, selectedFloor, filteredLocations]);

  const selectedItemsCount = useMemo(
    () => Object.values(itemRows).filter((row) => Number(row.quantity) > 0).length,
    [itemRows],
  );

  const autosaveMessage =
    autosaveState === "saving"
      ? dictionary.helperAutosaveSaving
      : autosaveState === "saved"
        ? dictionary.helperAutosaveSaved
        : autosaveState === "error"
          ? dictionary.helperAutosaveError
          : "";

  function setHeaderField<Key extends keyof HeaderForm>(field: Key, value: HeaderForm[Key]) {
    setHeaderForm((current) => ({
      ...(current ?? buildHeaderForm(receipt)),
      [field]: value,
    }));

    setAutosaveState("idle");
    setHeaderErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setItemField(productId: string, field: keyof ItemFormRow, value: string) {
    setItemRows((current) => {
      const matchedProduct = products.find((product) => product.id === productId);
      const existing = current[productId] ?? {
        discountValue: "0",
        locationId: locations[0]?.id ?? "",
        quantity: "",
        unitPrice: String(matchedProduct?.cost_price ?? matchedProduct?.effective_price ?? 0),
      };

      return {
        ...current,
        [productId]: {
          ...existing,
          [field]: value,
        },
      };
    });

    setAutosaveState("idle");
    setRowErrors((current) => ({ ...current, [productId]: "" }));
  }

  function handleScanSubmit() {
    const keyword = scanCode.trim().toLowerCase();

    if (!keyword) {
      return;
    }

    const matchedProduct = products.find((product) => {
      const sku = product.sku?.trim().toLowerCase();
      const barcode = product.barcode?.trim().toLowerCase();
      return sku === keyword || barcode === keyword;
    });

    if (!matchedProduct) {
      setScanFeedback({ tone: "error", value: dictionary.stateNoMatchingProduct });
      return;
    }

    const currentQuantity = Number(itemRows[matchedProduct.id]?.quantity || 0);
    const isDuplicate = currentQuantity > 0;
    setItemField(matchedProduct.id, "quantity", String(currentQuantity + 1));
    setScanCode("");
    setScanFeedback({
      tone: "success",
      value: isDuplicate
        ? dictionary.actionScanDuplicate.replace("{count}", String(currentQuantity + 1))
        : dictionary.stateScanMatched,
    });
  }

  async function handleImportFromPo() {
    if (!selectedPoId) {
      return;
    }

    try {
      const po = (await getPurchaseOrder(selectedPoId)).data;
      const poItems = po.items ?? [];
      if (!poItems.length) {
        setScanFeedback({ tone: "error", value: dictionary.validationItemsRequired });
        return;
      }

      const byProductId = new Map(products.map((product) => [product.id, product]));
      let duplicateCount = 0;
      setItemRows((current) => {
        const next = { ...current };
        for (const item of poItems) {
          const existingQty = Number(next[item.product_id]?.quantity || 0);
          if (existingQty > 0) duplicateCount += 1;
          const product = byProductId.get(item.product_id);
          next[item.product_id] = {
            discountValue: String(next[item.product_id]?.discountValue ?? 0),
            locationId: next[item.product_id]?.locationId || filteredLocations[0]?.id || locations[0]?.id || "",
            quantity: String(existingQty + item.quantity),
            unitPrice: String(next[item.product_id]?.unitPrice ?? item.unit_cost ?? product?.cost_price ?? 0),
          };
        }
        return next;
      });

      if (duplicateCount > 0) {
        setScanFeedback({ tone: "success", value: dictionary.actionScanDuplicate.replace("{count}", String(duplicateCount)) });
      }
    } catch (nextError) {
      setScanFeedback({ tone: "error", value: nextError instanceof Error ? nextError.message : dictionary.stateSaving });
    }
  }

  function validateStep1() {
    const nextErrors: Partial<Record<keyof HeaderForm, string>> = {};

    if (!headerForm?.warehouseId) {
      nextErrors.warehouseId = dictionary.validationWarehouseRequired;
    }

    if (!headerForm?.receivedAt) {
      nextErrors.receivedAt = dictionary.validationReceivedAtRequired;
    }

    if (headerForm?.receivedAt && Number.isNaN(new Date(headerForm.receivedAt).getTime())) {
      nextErrors.receivedAt = dictionary.validationReceivedAtRequired;
    }

    setHeaderErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextRowErrors: Record<string, string> = {};
    const selectedRows = Object.entries(itemRows).filter(([, row]) => Number(row.quantity) > 0);

    if (!selectedRows.length) {
      setError(dictionary.validationItemsRequired);
      return false;
    }

    if (!locations.length) {
      setError(dictionary.validationWarehouseWithoutLocations);
      return false;
    }

    for (const [productId, row] of selectedRows) {
      if (Number(row.quantity) <= 0) {
        nextRowErrors[productId] = dictionary.validationQuantityRequired;
      } else if (!row.locationId) {
        nextRowErrors[productId] = dictionary.validationLocationRequired;
      } else if (Number(row.unitPrice) < 0) {
        nextRowErrors[productId] = dictionary.validationUnitPriceRequired;
      } else if (Number(row.discountValue) < 0) {
        nextRowErrors[productId] = dictionary.validationUnitPriceRequired;
      }
    }

    setRowErrors(nextRowErrors);
    setError("");
    return Object.keys(nextRowErrors).length === 0;
  }

  useEffect(() => {
    if (!isStep1 || !headerForm || !receipt || receipt.status !== "draft") {
      return;
    }

    if (!headerForm.warehouseId || !headerForm.receivedAt) {
      return;
    }

    const payload = buildHeaderPayload(headerForm);
    const signature = JSON.stringify(payload);

    if (signature === headerAutosaveSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setAutosaveState("saving");

      try {
        await updateGoodsReceipt(receiptId, payload);
        headerAutosaveSignatureRef.current = signature;
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
      } catch {
        setAutosaveState("error");
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [headerForm, isStep1, queryClient, receipt, receiptId]);

  useEffect(() => {
    if (!isStep2 || !receipt || receipt.status !== "draft") {
      return;
    }

    const items = buildDraftItemsPayload(itemRows);

    if (!items.length || items.some((item) => !item.location_id || item.quantity <= 0 || item.unit_price < 0)) {
      return;
    }

    const signature = JSON.stringify(items);

    if (signature === itemsAutosaveSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setAutosaveState("saving");

      try {
        await upsertGoodsReceiptItems(receiptId, {
          items,
          replace_existing: true,
        });
        itemsAutosaveSignatureRef.current = signature;
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
      } catch {
        setAutosaveState("error");
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [isStep2, itemRows, queryClient, receipt, receiptId]);

  async function handleSaveStep1(nextHref: string) {
    setError("");

    if (!headerForm || !validateStep1()) {
      return;
    }

    const payload = buildHeaderPayload(headerForm);

    startTransition(async () => {
      try {
        await updateGoodsReceipt(receiptId, payload);
        headerAutosaveSignatureRef.current = JSON.stringify(payload);
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.push(nextHref);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.stateSaving);
      }
    });
  }

  async function handleSaveStep2(nextHref: string) {
    setError("");

    if (!validateStep2()) {
      return;
    }

    const items = buildDraftItemsPayload(itemRows);

    startTransition(async () => {
      try {
        await upsertGoodsReceiptItems(receiptId, {
          items,
          replace_existing: true,
        });
        itemsAutosaveSignatureRef.current = JSON.stringify(items);
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.push(nextHref);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.stateSaving);
      }
    });
  }

  async function handleConfirm() {
    if (!receipt?.items.length) {
      setError(dictionary.validationItemsRequired);
      return;
    }

    const itemsWithoutLocation = receipt.items.filter((item) => !item.location_id);

    if (itemsWithoutLocation.length > 0) {
      setError(dictionary.validationLocationRequired);
      return;
    }

    setError("");
    setIsConfirmDialogOpen(false);

    startTransition(async () => {
      try {
        await confirmGoodsReceipt(receiptId);
        clearSessionValue(headerStorageKey);
        clearSessionValue(itemsStorageKey);
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.replace(stepLinks.view);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.stateSaving);
      }
    });
  }

  if (receiptQuery.isLoading || (!headerForm && !receiptQuery.isError)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
          {dictionary.stateLoading}
        </div>
      </div>
    );
  }

  if (receiptQuery.isError || !receipt || !headerForm) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{receiptQuery.error instanceof Error ? receiptQuery.error.message : dictionary.stateNoReceipt}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-100"
            href={`/${locale}/warehouse/receive`}
          >
            {dictionary.actionBack}
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 font-semibold text-violet-700 hover:bg-violet-50"
            href={`/${locale}/warehouse/receive/new`}
          >
            {dictionary.actionNewReceipt}
          </Link>
        </div>
      </div>
    );
  }

  const maxAvailableStep: 1 | 2 | 3 = (() => {
    if (receipt.status === "confirmed") return 3;

    if (!receipt.warehouse_id || !receipt.received_at) {
      return 1;
    }

    if (!receipt.items.length) {
      return 2;
    }

    const itemsWithoutLocation = receipt.items.filter((item) => !item.location_id);

    if (itemsWithoutLocation.length > 0) {
      return 2;
    }

    return 3;
  })();
  const supplierName = suppliers.find((supplier) => supplier.id === (headerForm.supplierId || receipt.supplier_id))?.name
    ?? receipt.supplier_name
    ?? "-";
  const warehouseName = warehouses.find((warehouse) => warehouse.id === (headerForm.warehouseId || receipt.warehouse_id))?.name
    ?? receipt.warehouse_name
    ?? "-";
  const stockPreview = stockImpactQuery.data ?? receipt.stock_preview ?? [];

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    if (isUploadingAttachment) {
      return;
    }

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setUploadMessage({ tone: "error", value: dictionary.stateAttachmentMissing });
      return;
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(selectedFile.type) || selectedFile.size > 10 * 1024 * 1024) {
      setUploadMessage({ tone: "error", value: dictionary.stateUploadingFailed });
      return;
    }

    setUploadMessage(null);
    setIsUploadingAttachment(true);

    try {
      await uploadGoodsReceiptAttachment(receiptId, selectedFile);
      setUploadMessage({ tone: "success", value: dictionary.stateUploadSuccess });
      await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
    } catch (nextError) {
      setUploadMessage({
        tone: "error",
        value: nextError instanceof Error ? nextError.message : dictionary.stateUploadingFailed,
      });
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  }

  async function handlePrintReceipt() {
    if (isPrinting) {
      return;
    }

    setError("");
    setPrintMessage({ tone: "success", value: dictionary.statePrintPreparing });
    setIsPrinting(true);

    let printWindow: Window | null = null;

    try {
      printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        setPrintMessage({ tone: "error", value: dictionary.statePrintBlocked });
        return;
      }

      const printDocument = await fetchGoodsReceiptPrintDocument(receiptId);
      const htmlContent = printDocument.html?.trim();

      if (!htmlContent) {
        setPrintMessage({ tone: "error", value: dictionary.statePrintMissingContent });
        printWindow.close();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setPrintMessage({ tone: "success", value: dictionary.statePrintSuccess });
    } catch (nextError) {
      setPrintMessage({
        tone: "error",
        value: nextError instanceof Error ? nextError.message : dictionary.statePrintBlocked,
      });

      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {isView ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {dictionary.badgeConfirmed}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {dictionary.stepConfirmedTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-600">{dictionary.helperConfirmedView}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                disabled={isPrinting}
                onClick={handlePrintReceipt}
                type="button"
              >
                {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {isPrinting ? dictionary.statePrintPreparing : dictionary.actionPrint}
              </button>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                href={`/${locale}/warehouse/receive/new`}
              >
                {dictionary.actionNewReceipt}
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                href={`/${locale}/warehouse/overview`}
              >
                {dictionary.actionBackToOverview}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Stepper
          currentStep={step}
          dictionary={dictionary}
          locale={locale}
          maxAvailableStep={maxAvailableStep}
          receiptId={receiptId}
        />
      )}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {printMessage ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            printMessage.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-violet-200 bg-violet-50 text-violet-700"
          }`}
        >
          {printMessage.value}
        </div>
      ) : null}

      {!isView && autosaveMessage ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            autosaveState === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : autosaveState === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-violet-50 text-violet-700"
          }`}
        >
          {autosaveMessage}
        </div>
      ) : null}

      {isView && receipt.status !== "confirmed" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dictionary.viewNotConfirmed}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {(isStep1 || isView) ? (
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Store className="h-5 w-5 text-violet-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{dictionary.step1Title}</h2>
                  <p className="text-sm text-slate-500">{dictionary.helperStep1}</p>
                </div>
              </div>

              {isView ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryCard label={dictionary.labelDocumentNo} value={receipt.document_no} />
                  <SummaryCard label={dictionary.labelWarehouse} value={warehouseName} />
                  <SummaryCard label={dictionary.labelSupplier} value={supplierName} />
                  <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
                  <SummaryCard label={dictionary.labelReferenceNo} value={receipt.reference_no ?? "-"} />
                  <SummaryCard label={dictionary.labelVatPercent} value={`${formatNumber(receipt.vat_percent)}%`} />
                  <div className="md:col-span-2">
                    <SummaryCard label={dictionary.labelNote} value={receipt.note ?? "-"} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelDocumentNo}</span>
                      <input
                        className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-slate-600"
                        disabled
                        value={receipt.document_no}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelWarehouse}</span>
                      <select
                        className={`rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                          headerErrors.warehouseId ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
                        }`}
                        onChange={(event) => setHeaderField("warehouseId", event.target.value)}
                        value={headerForm.warehouseId}
                      >
                        <option value="">{dictionary.placeholderSelectWarehouse}</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                      {headerErrors.warehouseId ? (
                        <span className="text-xs text-rose-600">{headerErrors.warehouseId}</span>
                      ) : null}
                    </label>

                    {locationsQuery.isError ? (
                      <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {locationsQuery.error instanceof Error ? locationsQuery.error.message : dictionary.stateLoadingLocations}
                      </div>
                    ) : locations.length === 0 && selectedWarehouseId && !locationsQuery.isLoading ? (
                      <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {dictionary.validationWarehouseWithoutLocations}
                      </div>
                    ) : null}

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelSupplierOptional}</span>
                      <select
                        className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        onChange={(event) => setHeaderField("supplierId", event.target.value)}
                        value={headerForm.supplierId}
                      >
                        <option value="">{dictionary.placeholderSelectSupplier}</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelReceivedAt}</span>
                      <input
                        className={`rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                          headerErrors.receivedAt ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
                        }`}
                        onChange={(event) => setHeaderField("receivedAt", event.target.value)}
                        type="datetime-local"
                        value={headerForm.receivedAt}
                      />
                      {headerErrors.receivedAt ? (
                        <span className="text-xs text-rose-600">{headerErrors.receivedAt}</span>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelReferenceNo}</span>
                      <input
                        className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        onChange={(event) => setHeaderField("referenceNo", event.target.value)}
                        placeholder={dictionary.placeholderReferenceNo}
                        value={headerForm.referenceNo}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelVatPercent}</span>
                      <input
                        className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        min="0"
                        onChange={(event) => setHeaderField("vatPercent", event.target.value)}
                        step="0.01"
                        type="number"
                        value={headerForm.vatPercent}
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-medium text-slate-700">
                      <input
                        checked={headerForm.vatIncluded}
                        className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-300"
                        onChange={(event) => setHeaderField("vatIncluded", event.target.checked)}
                        type="checkbox"
                      />
                      {dictionary.labelVatIncluded}
                    </label>
                  </div>

                  <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
                    <span>{dictionary.labelNote}</span>
                    <textarea
                      className="min-h-32 rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      maxLength={500}
                      onChange={(event) => setHeaderField("note", event.target.value)}
                      placeholder={dictionary.placeholderNote}
                      value={headerForm.note}
                    />
                    <span className="text-right text-xs text-slate-500">{headerForm.note.length}/500</span>
                  </label>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      onClick={() => setIsCancelDialogOpen(true)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {dictionary.actionCancel}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => handleSaveStep1(stepLinks.step2)}
                      type="button"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isPending ? dictionary.actionSaving : dictionary.actionSaveAndContinue}
                    </button>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {(isStep2 || isView) ? (
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Package className="h-5 w-5 text-violet-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{dictionary.step2Title}</h2>
                  <p className="text-sm text-slate-500">{dictionary.helperStep2}</p>
                </div>
              </div>

              {isView ? (
                receipt.items.length ? (
                  <div className="space-y-4">
                    {receipt.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                        <div className="grid gap-3 md:grid-cols-4">
                          <SummaryCard label={dictionary.labelProduct} value={item.product_name} />
                          <SummaryCard label={dictionary.labelQuantity} value={formatNumber(item.quantity)} />
                          <SummaryCard label={dictionary.labelLocation} value={item.location_name ?? item.location_id} />
                          <SummaryCard label={dictionary.labelUnitPrice} value={formatCurrency(item.unit_price)} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
                    {dictionary.emptyProducts}
                  </div>
                )
              ) : (
                <>
                  <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelSearchProducts}</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          className="w-full rounded-2xl border border-violet-200 bg-white py-3 pr-4 pl-11 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={dictionary.placeholderSearchProducts}
                          value={search}
                        />
                      </div>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      <span>{dictionary.labelScanCode}</span>
                      <input
                        className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        onChange={(event) => {
                          setScanCode(event.target.value);
                          setScanFeedback(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleScanSubmit();
                          }
                        }}
                        placeholder={dictionary.placeholderScanCode}
                        value={scanCode}
                      />
                      <span className="text-xs text-slate-500">{dictionary.helperScanInput}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="rounded-2xl border border-violet-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        onChange={(event) => setSelectedZone(event.target.value)}
                        value={selectedZone}
                      >
                        <option value="">Zone</option>
                        {[...new Set(locations.map((location) => location.zone_name).filter(Boolean) as string[])].map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                      <select
                        className="rounded-2xl border border-violet-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        onChange={(event) => setSelectedFloor(event.target.value)}
                        value={selectedFloor}
                      >
                        <option value="">Floor</option>
                        {[...new Set(locations.filter((location) => !selectedZone || location.zone_name === selectedZone).map((location) => location.floor_name).filter(Boolean) as string[])].map((floor) => (
                          <option key={floor} value={floor}>{floor}</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{dictionary.itemCountLabel}</p>
                      <p className="mt-1">{selectedItemsCount}</p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-end gap-2">
                    <select
                      className="min-w-[260px] rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      onChange={(event) => setSelectedPoId(event.target.value)}
                      value={selectedPoId}
                    >
                      <option value="">Import items from PO</option>
                      {(purchaseOrdersQuery.data ?? []).map((po) => (
                        <option key={po.id} value={po.id}>{po.order_number}</option>
                      ))}
                    </select>
                    <button
                      className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      onClick={handleImportFromPo}
                      type="button"
                    >
                      Import PO
                    </button>
                  </div>

                  {scanFeedback ? (
                    <div
                      className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                        scanFeedback.tone === "error"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {scanFeedback.value}
                    </div>
                  ) : null}

                  {locationsQuery.isError ? (
                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {locationsQuery.error instanceof Error ? locationsQuery.error.message : dictionary.stateLoadingLocations}
                    </div>
                  ) : !locations.length && locationsQuery.isLoading ? (
                    <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                      {dictionary.stateLoadingLocations}
                    </div>
                  ) : !locations.length ? (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {dictionary.validationWarehouseWithoutLocations}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {filteredProducts.length ? (
                      filteredProducts.map((product) => {
                        const row = itemRows[product.id] ?? {
                          discountValue: "0",
                          locationId: locations[0]?.id ?? "",
                          quantity: "",
                          unitPrice: String(product.cost_price ?? product.effective_price ?? 0),
                        };
                        const quantityValue = Number(row.quantity || 0);
                        const selected = quantityValue > 0;

                        return (
                          <div
                            key={product.id}
                            className={`rounded-2xl border p-4 transition-colors ${
                              selected
                                ? "border-violet-200 bg-violet-50/50"
                                : "border-violet-100 bg-white"
                            }`}
                          >
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_120px_200px_140px_140px]">
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                        {dictionary.labelSku}: {product.sku || "-"}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                        {dictionary.labelBarcode}: {product.barcode || "-"}
                                      </span>
                                      {product.brand_name ? (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                          {product.brand_name}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                    {product.product_unit_name || dictionary.labelItems}
                                  </span>
                                </div>
                              </div>

                              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                <span>{dictionary.labelQuantity}</span>
                                <input
                                  className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                  min="0"
                                  onChange={(event) => setItemField(product.id, "quantity", event.target.value)}
                                  step="1"
                                  type="number"
                                  value={row.quantity}
                                />
                              </label>

                              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                <span>{dictionary.labelLocation}</span>
                                {filteredLocations.length === 0 && !locationsQuery.isLoading ? (
                                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    {dictionary.validationWarehouseWithoutLocations}
                                  </div>
                                ) : (
                                  <>
                                    <select
                                      className={`rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                                        rowErrors[product.id] ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
                                      }`}
                                      onChange={(event) => setItemField(product.id, "locationId", event.target.value)}
                                      value={row.locationId}
                                    >
                                      <option value="">{dictionary.placeholderLocation}</option>
                                      {filteredLocations.map((location) => (
                                        <option key={location.id} value={location.id}>
                                          {location.name}
                                        </option>
                                      ))}
                                    </select>
                                    {rowErrors[product.id] ? (
                                      <span className="text-xs text-rose-600">{rowErrors[product.id]}</span>
                                    ) : null}
                                  </>
                                )}
                              </label>

                              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                <span>{dictionary.labelDiscount}</span>
                                <input
                                  className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                  min="0"
                                  onChange={(event) => setItemField(product.id, "discountValue", event.target.value)}
                                  step="0.01"
                                  type="number"
                                  value={row.discountValue}
                                />
                              </label>

                              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                                <span>{dictionary.labelUnitPrice}</span>
                                <input
                                  className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                  min="0"
                                  onChange={(event) => setItemField(product.id, "unitPrice", event.target.value)}
                                  step="0.01"
                                  type="number"
                                  value={row.unitPrice}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
                        {dictionary.emptyProducts}
                      </div>
                    )}
                  </div>

                  {selectedItemsCount > 0 ? (
                    <div className="mt-6 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dictionary.itemCountLabel}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{selectedItemsCount}</p>
                      </div>
                      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dictionary.labelQuantity}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {formatNumber(Object.values(itemRows).reduce((sum, row) => sum + Number(row.quantity || 0), 0))}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dictionary.labelSubtotal}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {formatCurrency(Object.entries(itemRows).reduce((sum, [productId, row]) => {
                            return sum + Number(row.quantity || 0) * Number(row.unitPrice || 0);
                          }, 0))}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dictionary.labelSelectedQuantity}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {selectedItemsCount > 0
                            ? `${Object.values(itemRows).filter((row) => Number(row.quantity) > 0 && !row.locationId).length} ${dictionary.placeholderLocation}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      onClick={() => router.push(stepLinks.step1)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {dictionary.actionBack}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => handleSaveStep2(stepLinks.step3)}
                      type="button"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isPending ? dictionary.actionSaving : dictionary.actionSaveAndContinue}
                    </button>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {(isStep3 || isView) ? (
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Truck className="h-5 w-5 text-violet-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{dictionary.step3Title}</h2>
                  <p className="text-sm text-slate-500">{dictionary.helperStep3}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label={dictionary.labelDocumentNo} value={receipt.document_no} />
                <SummaryCard label={dictionary.labelWarehouse} value={warehouseName} />
                <SummaryCard label={dictionary.labelSupplier} value={supplierName} />
                <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
                <SummaryCard label={dictionary.labelSubtotal} value={formatCurrency(receipt.subtotal_amount)} />
                <SummaryCard label={dictionary.labelDiscount} value={formatCurrency(receipt.discount_amount)} />
                <SummaryCard label={dictionary.labelNetAmount} value={formatCurrency(receipt.net_amount)} />
                <SummaryCard label={dictionary.labelTotal} value={formatCurrency(receipt.total_amount)} />
              </div>

              <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{dictionary.labelItems}</p>
                    <p className="mt-1 text-sm text-slate-600">{receipt.items.length} {dictionary.itemCountLabel}</p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                    href={stepLinks.step2}
                  >
                    {dictionary.actionEditDraft}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {receipt.items.length ? (
                <div className="mt-4 space-y-3">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-violet-100 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <SummaryCard label={dictionary.labelProduct} value={item.product_name} />
                        <SummaryCard label={dictionary.labelQuantity} value={formatNumber(item.quantity)} />
                        <SummaryCard label={dictionary.labelLocation} value={item.location_name ?? item.location_id} />
                        <SummaryCard label={dictionary.labelUnitPrice} value={formatCurrency(item.unit_price)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
                  {dictionary.emptyProducts}
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                <p className="text-sm font-semibold text-slate-900">{dictionary.labelStockPreview}</p>
                {stockImpactQuery.isLoading ? (
                  <div className="mt-3 rounded-2xl border border-violet-200 bg-white px-4 py-8 text-center text-sm text-violet-700">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                    {dictionary.stateLoadingStockPreview}
                  </div>
                ) : stockImpactQuery.isError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
                    {stockImpactQuery.error instanceof Error ? stockImpactQuery.error.message : dictionary.emptyStockPreview}
                  </div>
                ) : stockPreview.length ? (
                  <>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {dictionary.stateStockImpactSummary.replace("{count}", String(stockPreview.length))}
                    </p>
                    <div className="mt-3 space-y-3">
                      {stockPreview.map((preview) => (
                        <div key={preview.item_id} className="rounded-2xl border border-violet-100 bg-white p-4">
                          <div className="grid gap-3 md:grid-cols-5">
                            <SummaryCard label={dictionary.labelProduct} value={preview.product_name} />
                            <SummaryCard label={dictionary.labelLocation} value={preview.location_name} />
                            <SummaryCard label={dictionary.stockBefore} value={formatNumber(preview.before_quantity)} />
                            <SummaryCard label={dictionary.stockAfter} value={formatNumber(preview.after_quantity)} />
                            <SummaryCard label={dictionary.stockChange} value={formatSignedNumber(preview.quantity)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    {dictionary.emptyStockPreview}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{dictionary.labelAttachment}</p>
                    <p className="mt-1 text-sm text-slate-500">{dictionary.helperUploadAttachment}</p>
                  </div>
                  {!isView ? (
                    <>
                      <input
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        disabled={isUploadingAttachment}
                        onChange={handleAttachmentChange}
                        ref={fileInputRef}
                        type="file"
                      />
                      <button
                        aria-busy={isUploadingAttachment}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUploadingAttachment}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        {isUploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isUploadingAttachment ? dictionary.actionUploadingAttachment : dictionary.actionUploadAttachment}
                      </button>
                    </>
                  ) : null}
                </div>

                {isUploadingAttachment ? (
                  <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                    {dictionary.stateUploadingAttachmentProgress}
                  </div>
                ) : null}

                <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{receipt.attachment_name ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatFileSize(receipt.attachment_size)}</p>
                </div>

                {uploadMessage ? (
                  <div
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                      uploadMessage.tone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {uploadMessage.value}
                  </div>
                ) : null}
              </div>

              {!isView ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      onClick={() => router.push(stepLinks.step2)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {dictionary.actionBack}
                    </button>
                    <div className="group relative">
                      <button
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
                        disabled
                        type="button"
                      >
                        <Printer className="h-4 w-4" />
                        {dictionary.actionPrint}
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {dictionary.statePrintAfterConfirm}
                      </div>
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
                    disabled={isPending || receipt.status === "confirmed"}
                    onClick={() => setIsConfirmDialogOpen(true)}
                    type="button"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {dictionary.actionConfirm}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{dictionary.summaryTitle}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-violet-50/60 px-4 py-3">
                <span>{dictionary.labelDocumentNo}</span>
                <span className="font-semibold text-slate-900">{receipt.document_no}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-violet-50/60 px-4 py-3">
                <span>{dictionary.labelWarehouse}</span>
                <span className="font-semibold text-slate-900">{warehouseName}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-violet-50/60 px-4 py-3">
                <span>{dictionary.labelItems}</span>
                <span className="font-semibold text-slate-900">{receipt.items.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-violet-50/60 px-4 py-3">
                <span>{dictionary.labelTotal}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(receipt.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              {receipt.status === "confirmed" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {receipt.status === "confirmed" ? dictionary.badgeConfirmed : dictionary.badgeDraft}
                </p>
                <p className="text-sm text-slate-500">
                  {receipt.status === "confirmed" ? dictionary.helperConfirmedView : dictionary.helperDraft}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        cancelLabel={dictionary.confirmCancel}
        confirmLabel={dictionary.actionClose}
        isOpen={isCancelDialogOpen}
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={() => {
          setIsCancelDialogOpen(false);
          router.push(`/${locale}/warehouse/receive`);
        }}
        title={dictionary.confirmLeaveTitle}
      >
        <p className="text-sm text-slate-600">{dictionary.confirmLeaveBody}</p>
      </ConfirmDialog>

      <ConfirmDialog
        cancelLabel={dictionary.confirmCancel}
        confirmLabel={dictionary.actionConfirm}
        isOpen={isConfirmDialogOpen}
        onCancel={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirm}
        title={dictionary.confirmTitle}
      >
        <p className="text-sm text-slate-600">{dictionary.confirmBody}</p>
      </ConfirmDialog>
    </div>
  );
}
