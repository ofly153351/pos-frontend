"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Printer,
  ReceiptText,
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
import { listLocations } from "@/services/locations";
import { listProducts } from "@/services/products";
import { getPurchaseOrder, listPurchaseOrders } from "@/services/purchases";
import { listSuppliers } from "@/services/suppliers";
import { listWarehouses } from "@/services/warehouses";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { Product } from "@/types/product";

import {
  buildDraftItemsPayload,
  buildHeaderForm,
  buildHeaderPayload,
  buildItemRows,
  clearSessionValue,
  ensureArray,
  formatDateTimeInput,
  formatDateTimeLabel,
  formatCurrency,
  formatNumber,
  getEditableReceiptStep,
  getReceiptRoute,
  normalizeGoodsReceiptDraft,
  normalizeGoodsReceiptDraftList,
  readSessionValue,
  writeSessionValue,
  type AutosaveState,
  type HeaderForm,
  type ItemFormRow,
  type ReceiveDictionary,
} from "./receive-shared";
import { ReceiptStatusBadge, SummaryCard } from "./receive-cards";
import { ReceiveStep1 } from "./receive-step1";
import { ReceiveStep2 } from "./receive-step2";
import { ReceiveStep3 } from "./receive-step3";

export { SummaryCard } from "./receive-cards";

type ReceivePageProps = {
  dictionary: ReceiveDictionary;
  locale: string;
};

type ReceiveWizardProps = {
  dictionary: ReceiveDictionary;
  locale: string;
  receiptId: string;
  step: 1 | 2 | 3 | "view";
};

type StepMeta = {
  description: string;
  href: string;
  key: 1 | 2 | 3;
};

function Stepper({
  currentStep,
  dictionary,
  locale,
  maxAvailableStep,
  receiptId,
}: {
  currentStep: 1 | 2 | 3;
  dictionary: ReceiveDictionary;
  locale: string;
  maxAvailableStep: 1 | 2 | 3;
  receiptId: string;
}) {
  const steps: StepMeta[] = [
    { description: dictionary.step1Title, href: `/${locale}/warehouse/receive/${receiptId}/step-1`, key: 1 },
    { description: dictionary.step2Title, href: `/${locale}/warehouse/receive/${receiptId}/step-2`, key: 2 },
    { description: dictionary.step3Title, href: `/${locale}/warehouse/receive/${receiptId}/step-3`, key: 3 },
  ];

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{dictionary.badgeStep}</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{dictionary.pageTitle}</h1>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-0">
          {steps.map((step, stepIndex) => {
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
                  className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
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
                    {step.key === 1 ? dictionary.stepLabel1 : step.key === 2 ? dictionary.stepLabel2 : dictionary.stepLabel3}
                  </p>
                  <p className="text-xs opacity-80">{step.description}</p>
                </div>
              </div>
            );

            return (
              <div className="flex items-center" key={step.key}>
                {stepIndex > 0 && (
                  <div className={`mx-1 hidden h-0.5 w-6 flex-shrink-0 md:block ${step.key <= currentStep ? "bg-violet-300" : "bg-slate-200"}`} />
                )}
                {isBlocked ? (
                  <div aria-disabled="true" className={stepClassName}>{stepContent}</div>
                ) : (
                  <Link className={stepClassName} href={step.href}>{stepContent}</Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContextBar({
  dictionary,
  locale,
  receipt,
  receiptId,
  step,
  supplierName,
  warehouseName,
}: {
  dictionary: ReceiveDictionary;
  locale: string;
  receipt: GoodsReceiptDraft;
  receiptId: string;
  step: 1 | 2 | 3 | "view";
  supplierName: string;
  warehouseName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-3">
      <span className="font-mono text-sm font-bold text-slate-900">{receipt.document_no}</span>
      <span className="text-sm text-slate-600">{warehouseName}</span>
      {receipt.supplier_id ? <span className="text-sm text-slate-500">{supplierName}</span> : null}
      <span className="text-sm text-slate-500">{formatDateTimeLabel(receipt.received_at)}</span>
      <ReceiptStatusBadge dictionary={dictionary} receipt={receipt} />
      {step !== "view" && step !== 1 ? (
        <Link
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          href={`/${locale}/warehouse/receive/${receiptId}/step-1`}
        >
          {dictionary.actionEditDraft}
        </Link>
      ) : null}
    </div>
  );
}

export function ReceiveIndexPage({ dictionary, locale }: ReceivePageProps) {
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
                    <Link
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      href={getReceiptRoute(locale, receipt)}
                    >
                      {dictionary.actionResumeDraft}
                    </Link>
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
        </aside>
      </div>
    </div>
  );
}

export function ReceiveNewPage({ dictionary, locale }: ReceivePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [receivedAt, setReceivedAt] = useState(formatDateTimeInput());

  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "receive", "new", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });

  useEffect(() => {
    if (!warehouseId && warehousesQuery.data?.[0]?.id) {
      setWarehouseId(warehousesQuery.data[0].id);
    }
  }, [warehouseId, warehousesQuery.data]);

  async function handleCreateDraft() {
    setError("");
    if (!warehouseId) { setError(dictionary.validationWarehouseRequired); return; }

    startTransition(async () => {
      try {
        const docRes = await generateGoodsReceiptDocumentNo();
        const res = await createGoodsReceiptDraft({
          document_no: docRes.data.document_no,
          received_at: new Date(receivedAt).toISOString(),
          vat_included: true,
          vat_percent: 7,
          warehouse_id: warehouseId,
        });
        router.replace(`/${locale}/warehouse/receive/${res.data.id}/step-1`);
      } catch (e) {
        setError(e instanceof Error ? e.message : dictionary.stateSaving);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{dictionary.badgeDraft}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{dictionary.startPageTitle}</h1>
            <p className="mt-3 text-sm text-slate-600">{dictionary.startPageDescription}</p>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            href={`/${locale}/warehouse/overview`}
          >
            <ArrowLeft className="h-4 w-4" />
            {dictionary.actionBackToOverview}
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{dictionary.labelWarehouse}</span>
            <select
              className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setWarehouseId(e.target.value)}
              value={warehouseId}
            >
              <option value="">{dictionary.placeholderSelectWarehouse}</option>
              {(warehousesQuery.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{dictionary.labelReceivedAt}</span>
            <input
              className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setReceivedAt(e.target.value)}
              type="datetime-local"
              value={receivedAt}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
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
          {warehousesQuery.isLoading ? <span className="text-sm text-slate-500">{dictionary.stateLoading}</span> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{dictionary.helperStart}</p>
        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
          {([
            { num: 1, label: dictionary.step1Title },
            { num: 2, label: dictionary.step2Title },
            { num: 3, label: dictionary.step3Title },
          ] as const).map(({ num, label }) => (
            <div key={num} className="flex items-start gap-3 rounded-2xl bg-violet-50/60 p-3">
              <span className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${num === 1 ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-600"}`}>
                {num}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReceiveWizard({ dictionary, locale, receiptId, step }: ReceiveWizardProps) {
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
    if (!receipt || headerInitializedRef.current) return;
    const storedHeader = readSessionValue<HeaderForm | null>(headerStorageKey, null);
    const initialHeader = storedHeader ?? buildHeaderForm(receipt);
    setHeaderForm(initialHeader);
    headerAutosaveSignatureRef.current = JSON.stringify(buildHeaderPayload(initialHeader));
    headerInitializedRef.current = true;
  }, [headerStorageKey, receipt]);

  useEffect(() => {
    if (!headerForm) return;
    writeSessionValue(headerStorageKey, headerForm);
  }, [headerForm, headerStorageKey]);

  useEffect(() => {
    if (!receipt || !products.length || itemsInitializedRef.current) return;
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
    if (!headerForm?.warehouseId || !locations.length) return;
    const defaultLocationId = locations[0]?.id;
    if (!defaultLocationId) return;
    setItemRows((currentRows) => {
      let changed = false;
      const nextRows: Record<string, ItemFormRow> = {};
      for (const [productId, row] of Object.entries(currentRows)) {
        const hasLocation = locations.some((loc) => loc.id === row.locationId);
        nextRows[productId] = hasLocation ? row : { ...row, locationId: defaultLocationId };
        changed = changed || !hasLocation;
      }
      return changed ? nextRows : currentRows;
    });
  }, [headerForm?.warehouseId, locations]);

  useEffect(() => {
    if (!receipt) return;
    const recommendedStep = getEditableReceiptStep(receipt);
    if (receipt.status === "confirmed" && step !== "view") { router.replace(stepLinks.view); return; }
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

  const filteredLocations = useMemo(
    () => locations.filter((loc) => {
      const zoneOk = selectedZone ? (loc.zone_name ?? "") === selectedZone : true;
      const floorOk = selectedFloor ? (loc.floor_name ?? "") === selectedFloor : true;
      return zoneOk && floorOk;
    }),
    [locations, selectedFloor, selectedZone],
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const scopedProductIds = new Set(
      Object.entries(itemRows)
        .filter(([, row]) => !selectedZone && !selectedFloor || filteredLocations.some((loc) => loc.id === row.locationId))
        .map(([productId]) => productId),
    );
    return (products as Product[]).filter((product) => {
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
    autosaveState === "saving" ? dictionary.helperAutosaveSaving
    : autosaveState === "saved" ? dictionary.helperAutosaveSaved
    : autosaveState === "error" ? dictionary.helperAutosaveError
    : "";

  function setHeaderField<K extends keyof HeaderForm>(field: K, value: HeaderForm[K]) {
    setHeaderForm((current) => ({ ...(current ?? buildHeaderForm(receipt)), [field]: value }));
    setAutosaveState("idle");
    setHeaderErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setItemField(productId: string, field: keyof ItemFormRow, value: string) {
    setItemRows((current) => {
      const matched = products.find((p) => p.id === productId) as Product | undefined;
      const existing = current[productId] ?? {
        discountValue: "0",
        locationId: locations[0]?.id ?? "",
        quantity: "",
        unitPrice: String(matched?.cost_price ?? matched?.effective_price ?? 0),
      };
      return { ...current, [productId]: { ...existing, [field]: value } };
    });
    setAutosaveState("idle");
    setRowErrors((current) => ({ ...current, [productId]: "" }));
  }

  function handleScanSubmit() {
    const keyword = scanCode.trim().toLowerCase();
    if (!keyword) return;
    const matched = products.find((p) => {
      const sku = p.sku?.trim().toLowerCase();
      const barcode = p.barcode?.trim().toLowerCase();
      return sku === keyword || barcode === keyword;
    });
    if (!matched) { setScanFeedback({ tone: "error", value: dictionary.stateNoMatchingProduct }); return; }
    const currentQty = Number(itemRows[matched.id]?.quantity || 0);
    const isDuplicate = currentQty > 0;
    setItemField(matched.id, "quantity", String(currentQty + 1));
    setScanCode("");
    setScanFeedback({
      tone: "success",
      value: isDuplicate ? dictionary.actionScanDuplicate.replace("{count}", String(currentQty + 1)) : dictionary.stateScanMatched,
    });
  }

  async function handleImportFromPo() {
    if (!selectedPoId) return;
    try {
      const po = (await getPurchaseOrder(selectedPoId)).data;
      const poItems = po.items ?? [];
      if (!poItems.length) { setScanFeedback({ tone: "error", value: dictionary.validationItemsRequired }); return; }
      const byId = new Map(products.map((p) => [p.id, p]));
      let duplicateCount = 0;
      setItemRows((current) => {
        const next = { ...current };
        for (const item of poItems) {
          const existingQty = Number(next[item.product_id]?.quantity || 0);
          if (existingQty > 0) duplicateCount += 1;
          const product = byId.get(item.product_id) as Product | undefined;
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
    } catch (e) {
      setScanFeedback({ tone: "error", value: e instanceof Error ? e.message : dictionary.stateSaving });
    }
  }

  function validateStep1() {
    const nextErrors: Partial<Record<keyof HeaderForm, string>> = {};
    if (!headerForm?.warehouseId) nextErrors.warehouseId = dictionary.validationWarehouseRequired;
    if (!headerForm?.receivedAt) nextErrors.receivedAt = dictionary.validationReceivedAtRequired;
    if (headerForm?.receivedAt && Number.isNaN(new Date(headerForm.receivedAt).getTime())) nextErrors.receivedAt = dictionary.validationReceivedAtRequired;
    setHeaderErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextRowErrors: Record<string, string> = {};
    const selectedRows = Object.entries(itemRows).filter(([, row]) => Number(row.quantity) > 0);
    if (!selectedRows.length) { setError(dictionary.validationItemsRequired); return false; }
    if (!locations.length) { setError(dictionary.validationWarehouseWithoutLocations); return false; }
    for (const [productId, row] of selectedRows) {
      if (Number(row.quantity) <= 0) nextRowErrors[productId] = dictionary.validationQuantityRequired;
      else if (!row.locationId) nextRowErrors[productId] = dictionary.validationLocationRequired;
      else if (Number(row.unitPrice) < 0) nextRowErrors[productId] = dictionary.validationUnitPriceRequired;
      else if (Number(row.discountValue) < 0) nextRowErrors[productId] = dictionary.validationUnitPriceRequired;
    }
    setRowErrors(nextRowErrors);
    setError("");
    return Object.keys(nextRowErrors).length === 0;
  }

  useEffect(() => {
    if (!isStep1 || !headerForm || !receipt || receipt.status !== "draft") return;
    if (!headerForm.warehouseId || !headerForm.receivedAt) return;
    const payload = buildHeaderPayload(headerForm);
    const signature = JSON.stringify(payload);
    if (signature === headerAutosaveSignatureRef.current) return;
    const id = window.setTimeout(async () => {
      setAutosaveState("saving");
      try {
        await updateGoodsReceipt(receiptId, payload);
        headerAutosaveSignatureRef.current = signature;
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
      } catch { setAutosaveState("error"); }
    }, 800);
    return () => window.clearTimeout(id);
  }, [headerForm, isStep1, queryClient, receipt, receiptId]);

  useEffect(() => {
    if (!isStep2 || !receipt || receipt.status !== "draft") return;
    const items = buildDraftItemsPayload(itemRows);
    if (!items.length || items.some((item) => !item.location_id || item.quantity <= 0 || item.unit_price < 0)) return;
    const signature = JSON.stringify(items);
    if (signature === itemsAutosaveSignatureRef.current) return;
    const id = window.setTimeout(async () => {
      setAutosaveState("saving");
      try {
        await upsertGoodsReceiptItems(receiptId, { items, replace_existing: true });
        itemsAutosaveSignatureRef.current = signature;
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
      } catch { setAutosaveState("error"); }
    }, 800);
    return () => window.clearTimeout(id);
  }, [isStep2, itemRows, queryClient, receipt, receiptId]);

  async function handleSaveStep1(nextHref: string) {
    setError("");
    if (!headerForm || !validateStep1()) return;
    const payload = buildHeaderPayload(headerForm);
    startTransition(async () => {
      try {
        await updateGoodsReceipt(receiptId, payload);
        headerAutosaveSignatureRef.current = JSON.stringify(payload);
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.push(nextHref);
      } catch (e) { setError(e instanceof Error ? e.message : dictionary.stateSaving); }
    });
  }

  async function handleSaveStep2(nextHref: string) {
    setError("");
    if (!validateStep2()) return;
    const items = buildDraftItemsPayload(itemRows);
    startTransition(async () => {
      try {
        await upsertGoodsReceiptItems(receiptId, { items, replace_existing: true });
        itemsAutosaveSignatureRef.current = JSON.stringify(items);
        setAutosaveState("saved");
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.push(nextHref);
      } catch (e) { setError(e instanceof Error ? e.message : dictionary.stateSaving); }
    });
  }

  async function handleConfirm() {
    if (!receipt?.items.length) { setError(dictionary.validationItemsRequired); return; }
    const withoutLocation = receipt.items.filter((item) => !item.location_id);
    if (withoutLocation.length > 0) { setError(dictionary.validationLocationRequired); return; }
    setError("");
    setIsConfirmDialogOpen(false);
    startTransition(async () => {
      try {
        await confirmGoodsReceipt(receiptId);
        clearSessionValue(headerStorageKey);
        clearSessionValue(itemsStorageKey);
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.replace(stepLinks.view);
      } catch (e) { setError(e instanceof Error ? e.message : dictionary.stateSaving); }
    });
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    if (isUploadingAttachment) return;
    const file = event.target.files?.[0];
    if (!file) { setUploadMessage({ tone: "error", value: dictionary.stateAttachmentMissing }); return; }
    if (!["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadMessage({ tone: "error", value: dictionary.stateUploadingFailed }); return;
    }
    setUploadMessage(null);
    setIsUploadingAttachment(true);
    try {
      await uploadGoodsReceiptAttachment(receiptId, file);
      setUploadMessage({ tone: "success", value: dictionary.stateUploadSuccess });
      await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
    } catch (e) {
      setUploadMessage({ tone: "error", value: e instanceof Error ? e.message : dictionary.stateUploadingFailed });
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  }

  async function handlePrintReceipt() {
    if (isPrinting) return;
    setError("");
    setPrintMessage({ tone: "success", value: dictionary.statePrintPreparing });
    setIsPrinting(true);
    try {
      const doc = await fetchGoodsReceiptPrintDocument(receiptId);
      const html = doc.data.html?.trim();
      if (!html) { setPrintMessage({ tone: "error", value: dictionary.statePrintMissingContent }); return; }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve, reject) => {
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            URL.revokeObjectURL(blobUrl);
            window.setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
          }
        };
        iframe.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error(dictionary.statePrintBlocked)); };
        iframe.src = blobUrl;
      });

      setPrintMessage({ tone: "success", value: dictionary.statePrintSuccess });
    } catch (e) {
      setPrintMessage({ tone: "error", value: e instanceof Error ? e.message : dictionary.statePrintBlocked });
    } finally {
      setIsPrinting(false);
    }
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
    if (!receipt.warehouse_id || !receipt.received_at) return 1;
    if (!receipt.items.length) return 2;
    if (receipt.items.filter((item) => !item.location_id).length > 0) return 2;
    return 3;
  })();

  const supplierName = suppliers.find((s) => s.id === (headerForm.supplierId || receipt.supplier_id))?.name ?? receipt.supplier_name ?? "-";
  const warehouseName = warehouses.find((w) => w.id === (headerForm.warehouseId || receipt.warehouse_id))?.name ?? receipt.warehouse_name ?? "-";
  const stockPreview = stockImpactQuery.data ?? receipt.stock_preview ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {isView ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{dictionary.badgeConfirmed}</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{dictionary.stepConfirmedTitle}</h1>
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
        <Stepper currentStep={step as 1 | 2 | 3} dictionary={dictionary} locale={locale} maxAvailableStep={maxAvailableStep} receiptId={receiptId} />
      )}

      {(isStep2 || isStep3 || isView) ? (
        <ContextBar dictionary={dictionary} locale={locale} receipt={receipt} receiptId={receiptId} step={step} supplierName={supplierName} warehouseName={warehouseName} />
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {printMessage ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${printMessage.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>
          {printMessage.value}
        </div>
      ) : null}

      {!isView && autosaveMessage ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${autosaveState === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : autosaveState === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>
          {autosaveMessage}
        </div>
      ) : null}

      {isView && receipt.status !== "confirmed" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{dictionary.viewNotConfirmed}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {(isStep1 || isView) ? (
            <ReceiveStep1
              dictionary={dictionary}
              headerErrors={headerErrors}
              headerForm={headerForm}
              isPending={isPending}
              isView={isView}
              locations={locations}
              locationsQueryError={locationsQuery.error}
              locationsQueryIsError={locationsQuery.isError}
              locationsQueryIsLoading={locationsQuery.isLoading}
              receipt={receipt}
              selectedWarehouseId={selectedWarehouseId}
              stepLinks={{ step2: stepLinks.step2 }}
              suppliers={suppliers}
              warehouses={warehouses}
              onCancel={() => setIsCancelDialogOpen(true)}
              onFieldChange={setHeaderField}
              onSave={handleSaveStep1}
            />
          ) : null}

          {(isStep2 || isView) ? (
            <ReceiveStep2
              dictionary={dictionary}
              filteredLocations={filteredLocations}
              filteredProducts={filteredProducts}
              isPending={isPending}
              isView={isView}
              itemRows={itemRows}
              locations={locations}
              locationsQueryError={locationsQuery.error}
              locationsQueryIsError={locationsQuery.isError}
              locationsQueryIsLoading={locationsQuery.isLoading}
              products={products}
              purchaseOrders={purchaseOrdersQuery.data ?? []}
              receipt={receipt}
              rowErrors={rowErrors}
              scanCode={scanCode}
              scanFeedback={scanFeedback}
              search={search}
              selectedFloor={selectedFloor}
              selectedItemsCount={selectedItemsCount}
              selectedPoId={selectedPoId}
              selectedZone={selectedZone}
              stepLinks={{ step1: stepLinks.step1, step3: stepLinks.step3 }}
              onBack={() => router.push(stepLinks.step1)}
              onFloorChange={setSelectedFloor}
              onImportPo={handleImportFromPo}
              onItemField={setItemField}
              onPoIdChange={setSelectedPoId}
              onSave={handleSaveStep2}
              onScanChange={(v) => { setScanCode(v); setScanFeedback(null); }}
              onScanSubmit={handleScanSubmit}
              onSearchChange={setSearch}
              onZoneChange={setSelectedZone}
            />
          ) : null}

          {(isStep3 || isView) ? (
            <ReceiveStep3
              dictionary={dictionary}
              fileInputRef={fileInputRef}
              isPending={isPending}
              isUploadingAttachment={isUploadingAttachment}
              isView={isView}
              receipt={receipt}
              stockImpactError={stockImpactQuery.error}
              stockImpactIsError={stockImpactQuery.isError}
              stockImpactIsLoading={stockImpactQuery.isLoading}
              stockPreview={stockPreview}
              stepLinks={{ step2: stepLinks.step2 }}
              supplierName={supplierName}
              uploadMessage={uploadMessage}
              warehouseName={warehouseName}
              onAttachmentChange={handleAttachmentChange}
              onBack={() => router.push(stepLinks.step2)}
              onOpenConfirmDialog={() => setIsConfirmDialogOpen(true)}
            />
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
        onConfirm={() => { setIsCancelDialogOpen(false); router.push(`/${locale}/warehouse/receive`); }}
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
