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
  cancelGoodsReceipt,
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
import { createLocation, listLocations } from "@/services/locations";
import { listProducts } from "@/services/products";
import { getPurchaseOrder, listPurchaseOrders } from "@/services/purchases";
import { listSuppliers } from "@/services/suppliers";
import { listWarehouses } from "@/services/warehouses";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
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
import { ReceiveStep3, type PendingAttachment } from "./receive-step3";

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
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const draftsQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "drafts"],
    queryFn: async () => normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 6, page: 1, status: "draft" })).data.items),
  });
  const recentQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "recent"],
    queryFn: async () => {
      const items = normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 20, page: 1 })).data.items);
      return items
        .filter((r) => r.status !== "cancelled")
        .sort((a, b) => {
          const aTime = new Date(a.confirmed_at ?? a.updated_at).getTime();
          const bTime = new Date(b.confirmed_at ?? b.updated_at).getTime();
          return bTime - aTime;
        })
        .slice(0, 8);
    },
  });

  const drafts = draftsQuery.data ?? [];
  const recentReceipts = recentQuery.data ?? [];
  const resumeDraft = drafts[0] ?? null;

  function handleDeleteDraft(id: string) {
    startDeleteTransition(async () => {
      try {
        await cancelGoodsReceipt(id);
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", "index"] });
        toast.success(dictionary.badgeCancelled);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.stateSaving);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-6 xl:px-2 2xl:px-4">
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
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
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
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        disabled={isPendingDelete}
                        onClick={() => setDeletingId(receipt.id)}
                        type="button"
                      >
                        {dictionary.actionCancel}
                      </button>
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
        </aside>
      </div>

      <ConfirmDialog
        confirmLabel={dictionary.actionCancel}
        danger
        isOpen={!!deletingId}
        title={dictionary.confirmTitle}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteDraft(deletingId)}
      >
        {dictionary.confirmCancel}
      </ConfirmDialog>
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
    select: (data) => data,
  });

  const warehouses = warehousesQuery.data ?? [];
  const effectiveWarehouseId = warehouseId || warehouses[0]?.id || "";

  useEffect(() => {
    if (!warehouseId && warehouses[0]?.id) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouseId, warehouses]);

  async function handleCreateDraft() {
    setError("");
    if (!effectiveWarehouseId) { setError(dictionary.validationWarehouseRequired); return; }

    startTransition(async () => {
      try {
        const docRes = await generateGoodsReceiptDocumentNo();
        const res = await createGoodsReceiptDraft({
          document_no: docRes.data.document_no,
          received_at: new Date(receivedAt).toISOString(),
          vat_included: true,
          vat_percent: 7,
          warehouse_id: effectiveWarehouseId,
        });
        router.replace(`/${locale}/warehouse/receive/${res.data.id}/step-1`);
      } catch (e) {
        setError(e instanceof Error ? e.message : dictionary.stateSaving);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 xl:px-2 2xl:px-4">
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
              value={effectiveWarehouseId}
            >
              <option value="">{dictionary.placeholderSelectWarehouse}</option>
              {warehouses.map((w) => (
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
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
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
  const [globalLocationId, setGlobalLocationId] = useState("");
  const [sessionLocationIds, setSessionLocationIds] = useState<string[]>([]);
  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [itemRows, setItemRows] = useState<Record<string, ItemFormRow>>({});
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<keyof HeaderForm, string>>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
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
    queryFn: async () => (await listLocations({ warehouseId: selectedWarehouseId })).data?.items ?? [],
  });

  const receipt = receiptQuery.data;
  const stockImpactQuery = useQuery({
    enabled: Boolean(receiptId) && (step === 3 || step === "view"),
    queryKey: ["warehouse", "receive", receiptId, "stock-impact"],
    queryFn: async () => ensureArray((await getGoodsReceiptStockImpact(receiptId)).data),
  });

  const allLocations = locationsQuery.data ?? [];
  const locations = allLocations.filter((loc) => !loc.is_sale_point);
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

  // Auto-init globalLocationId + sessionLocationIds when locations load
  useEffect(() => {
    if (!locations.length) return;
    setGlobalLocationId((prev) => {
      const valid = locations.some((l) => l.id === prev);
      return valid ? prev : locations[0].id;
    });
    setSessionLocationIds((prev) => {
      if (prev.length > 0 && prev.every((id) => locations.some((l) => l.id === id))) return prev;
      return [locations[0].id];
    });
  }, [locations]);

  // When warehouse changes, fix any item rows pointing to invalid locations
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

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (products as Product[]).filter((product) => {
      if (!keyword) return true;
      const haystack = [product.name, product.sku, product.barcode, product.brand_name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [products, search]);

  const selectedItemsCount = useMemo(
    () => Object.values(itemRows).filter((row) => Number(row.quantity) > 0).length,
    [itemRows],
  );

  // Fire toast when autosave completes or fails
  const prevAutosaveRef = useRef<AutosaveState>("idle");
  useEffect(() => {
    if (autosaveState === prevAutosaveRef.current) return;
    prevAutosaveRef.current = autosaveState;
    if (autosaveState === "saved") toast.success(dictionary.helperAutosaveSaved);
    else if (autosaveState === "error") toast.error(dictionary.helperAutosaveError);
  }, [autosaveState, dictionary.helperAutosaveSaved, dictionary.helperAutosaveError]);

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
        locationId: globalLocationId || (locations[0]?.id ?? ""),
        quantity: "",
        unitPrice: String(matched?.cost_price ?? matched?.effective_price ?? 0),
      };
      return { ...current, [productId]: { ...existing, [field]: value } };
    });
    setAutosaveState("idle");
    setRowErrors((current) => ({ ...current, [productId]: "" }));
  }

  function handleGlobalLocationChange(locationId: string) {
    setGlobalLocationId(locationId);
  }

  function handleAddLocationSession(locationId: string) {
    setSessionLocationIds((prev) => prev.includes(locationId) ? prev : [...prev, locationId]);
    setGlobalLocationId(locationId);
  }

  function handleRemoveLocationSession(locationId: string) {
    setSessionLocationIds((prev) => {
      const next = prev.filter((id) => id !== locationId);
      if (next.length === 0) return prev; // keep at least one
      return next;
    });
    setGlobalLocationId((prev) => {
      if (prev !== locationId) return prev;
      const remaining = sessionLocationIds.filter((id) => id !== locationId);
      return remaining[0] ?? locations[0]?.id ?? "";
    });
  }

  async function handleAddLocation(name: string, code: string) {
    const warehouseId = headerForm?.warehouseId || receipt?.warehouse_id;
    if (!warehouseId) return;
    const loc = await createLocation({ warehouse_id: warehouseId, name: name.trim(), code: code.trim() || undefined, is_sale_point: false, is_active: true });
    await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", "locations", warehouseId] });
    handleAddLocationSession(loc.data.id);
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
            locationId: next[item.product_id]?.locationId || globalLocationId || locations[0]?.id || "",
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
    if (!locations.length) {
      setError(allLocations.length > 0 ? dictionary.validationWarehouseOnlySalePoints : dictionary.validationWarehouseWithoutLocations);
      return false;
    }
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
        if (pendingAttachments.length) {
          setIsUploadingAttachment(true);
          for (const attachment of pendingAttachments) {
            await uploadGoodsReceiptAttachment(receiptId, attachment.file);
          }
          toast.success(dictionary.stateUploadSuccess);
        }
        await confirmGoodsReceipt(receiptId);
        clearSessionValue(headerStorageKey);
        clearSessionValue(itemsStorageKey);
        setPendingAttachments([]);
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", receiptId] });
        router.replace(stepLinks.view);
      } catch (e) {
        const message = e instanceof Error ? e.message : dictionary.stateSaving;
        toast.error(message);
        setError(message);
      } finally {
        setIsUploadingAttachment(false);
      }
    });
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    if (isUploadingAttachment) return;
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      toast.error(dictionary.stateAttachmentMissing);
      return;
    }

    const validMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const nextAttachments: PendingAttachment[] = [];
    let hasInvalidFile = false;

    for (const file of files) {
      const isValidType = validMimeTypes.includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValidType || !isValidSize) {
        hasInvalidFile = true;
        continue;
      }
      nextAttachments.push({
        id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
        file,
        isImage: file.type.startsWith("image/"),
        isPdf: file.type === "application/pdf",
      });
    }

    if (hasInvalidFile) {
      toast.error(dictionary.stateUploadingFailed);
    }

    if (nextAttachments.length) {
      setPendingAttachments((current) => [...current, ...nextAttachments]);
      toast.success(dictionary.stateUploadSuccess);
    }

    event.target.value = "";
  }

  function handleRemovePendingAttachment(attachmentId: string) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  async function handlePrintReceipt() {
    if (isPrinting) return;
    setError("");
    toast.info(dictionary.statePrintPreparing, 2500);
    setIsPrinting(true);
    try {
      const doc = await fetchGoodsReceiptPrintDocument(receiptId);
      const html = doc.data.html?.trim();
      if (!html) { toast.error(dictionary.statePrintMissingContent); return; }

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

      toast.success(dictionary.statePrintSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : dictionary.statePrintBlocked);
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
    <div className="flex w-full flex-col gap-6 xl:px-2 2xl:px-4">
      {isView ? (
        receipt.status === "cancelled" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">{dictionary.badgeCancelled}</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{receipt.document_no}</h1>
                <p className="mt-2 text-sm text-slate-600">{dictionary.confirmCancel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
        )
      ) : (
        <Stepper currentStep={step as 1 | 2 | 3} dictionary={dictionary} locale={locale} maxAvailableStep={maxAvailableStep} receiptId={receiptId} />
      )}

      {error && <Alert onDismiss={() => setError("")} tone="error">{error}</Alert>}

      <div className="space-y-6">
          {(isStep1 || isView) ? (
            <ReceiveStep1
              dictionary={dictionary}
              headerErrors={headerErrors}
              headerForm={headerForm}
              isPending={isPending}
              isView={isView}
              allLocationsCount={allLocations.length}
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
              filteredProducts={filteredProducts}
              globalLocationId={globalLocationId}
              isPending={isPending}
              isView={isView}
              allLocationsCount={allLocations.length}
              itemRows={itemRows}
              locale={locale}
              locations={locations}
              locationsQueryError={locationsQuery.error}
              locationsQueryIsError={locationsQuery.isError}
              locationsQueryIsLoading={locationsQuery.isLoading}
              products={products}
              purchaseOrders={purchaseOrdersQuery.data ?? []}
              receipt={receipt}
              receiptId={receiptId}
              rowErrors={rowErrors}
              scanCode={scanCode}
              scanFeedback={scanFeedback}
              search={search}
              selectedItemsCount={selectedItemsCount}
              selectedPoId={selectedPoId}
              stepLinks={{ step1: stepLinks.step1, step3: stepLinks.step3 }}
              supplierName={supplierName}
              warehouseName={warehouseName}
              sessionLocationIds={sessionLocationIds}
              onAddLocation={handleAddLocation}
              onAddLocationSession={handleAddLocationSession}
              onRemoveLocationSession={handleRemoveLocationSession}
              onBack={() => router.push(stepLinks.step1)}
              onGlobalLocationChange={handleGlobalLocationChange}
              onImportPo={handleImportFromPo}
              onItemField={setItemField}
              onPoIdChange={setSelectedPoId}
              onSave={handleSaveStep2}
              onScanChange={(v) => { setScanCode(v); setScanFeedback(null); }}
              onScanSubmit={handleScanSubmit}
              onSearchChange={setSearch}
            />
          ) : null}

          {(isStep3 || isView) ? (
            <ReceiveStep3
              dictionary={dictionary}
              fileInputRef={fileInputRef}
              isPending={isPending}
              isUploadingAttachment={isUploadingAttachment}
              isView={isView}
              pendingAttachments={pendingAttachments}
              receipt={receipt}
              stockImpactError={stockImpactQuery.error}
              stockImpactIsError={stockImpactQuery.isError}
              stockImpactIsLoading={stockImpactQuery.isLoading}
              stockPreview={stockPreview}
              stepLinks={{ step2: stepLinks.step2 }}
              supplierName={supplierName}
              warehouseName={warehouseName}
              onAttachmentChange={handleAttachmentChange}
              onBack={() => router.push(stepLinks.step2)}
              onOpenConfirmDialog={() => setIsConfirmDialogOpen(true)}
              onRemovePendingAttachment={handleRemovePendingAttachment}
            />
          ) : null}
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
