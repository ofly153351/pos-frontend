"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import {
  cancelGoodsReceipt,
  confirmGoodsReceipt,
  getGoodsReceipt,
  getGoodsReceiptStockImpact,
  reopenGoodsReceipt,
  submitGoodsReceipt,
  updateGoodsReceipt,
  upsertGoodsReceiptItems,
} from "@/services/goods-receipts";
import { listLocations } from "@/services/locations";
import { listProducts } from "@/services/products";
import { getPurchaseOrder, listPurchaseOrders } from "@/services/purchases";
import { listSuppliers } from "@/services/suppliers";
import { listWarehouses } from "@/services/warehouses";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import type { Product } from "@/types/product";

import {
  buildEditorItemsPayload,
  buildEditorRows,
  buildHeaderForm,
  buildHeaderPayload,
  ensureArray,
  formatCurrency,
  formatNumber,
  normalizeGoodsReceiptDraft,
  receiveRowKey,
  receiveRowStatus,
  type HeaderForm,
  type LocationResolveStatus,
  type ReceiveDictionary,
  type ReceiveItemRow,
} from "./receive-shared";
import { ReceiveDocumentSection } from "./receive-document-section";
import { ReceiveProductSearch } from "./receive-product-search";
import { ReceiveItemsTable, type EditorRowView } from "./receive-items-table";
import { ReceiveInspectionSummary, type InspectionCounts, type InspectionMismatch } from "./receive-inspection-summary";
import { ReceiveStockPreview } from "./receive-stock-preview";
import { ReceiveFinancialSummary } from "./receive-financial-summary";
import { ReceiveActionBar } from "./receive-action-bar";

type Props = { dictionary: ReceiveDictionary; locale: string; receiptId: string };

export function ReceiveEditor({ dictionary: t, locale, receiptId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role } = useStoreRole();
  const canManage = canManageStore(role);
  const [isPending, startTransition] = useTransition();

  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [itemRows, setItemRows] = useState<Record<string, ReceiveItemRow>>({});
  const [search, setSearch] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ tone: "error" | "success"; value: string } | null>(null);
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<keyof HeaderForm, string>>>({});
  const [error, setError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const headerInitRef = useRef(false);
  const itemsInitRef = useRef(false);
  const poImportedRef = useRef(false);
  const headerSigRef = useRef("");
  const itemsSigRef = useRef("");

  const receiptQuery = useQuery({
    queryKey: ["warehouse", "receive-editor", receiptId],
    queryFn: async () => normalizeGoodsReceiptDraft((await getGoodsReceipt(receiptId)).data),
  });
  const warehousesQuery = useQuery({ queryKey: ["warehouse", "receive", "warehouses"], queryFn: async () => (await listWarehouses()).data ?? [] });
  const suppliersQuery = useQuery({ queryKey: ["warehouse", "receive", "suppliers"], queryFn: async () => (await listSuppliers()).data ?? [] });
  const productsQuery = useQuery({ queryKey: ["warehouse", "receive", "products"], queryFn: async () => (await listProducts({ limit: 1000, page: 1 })).data.items ?? [] });
  const purchaseOrdersQuery = useQuery({ queryKey: ["warehouse", "receive", "purchase-orders"], queryFn: async () => (await listPurchaseOrders()).data ?? [] });

  const receipt = receiptQuery.data;
  const selectedWarehouseId = headerForm?.warehouseId || receipt?.warehouse_id || "";
  // All store locations (one fetch): used to resolve each product's authoritative
  // default location and validate it against the receipt warehouse.
  const locationsQuery = useQuery({
    queryKey: ["warehouse", "receive", "all-locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data?.items ?? [],
  });
  const purchaseOrderId = receipt?.purchase_order_id ?? "";
  const poDetailQuery = useQuery({
    enabled: Boolean(purchaseOrderId),
    queryKey: ["warehouse", "receive", "po-detail", purchaseOrderId],
    queryFn: async () => (await getPurchaseOrder(purchaseOrderId)).data,
  });
  const stockImpactQuery = useQuery({
    enabled: Boolean(receiptId) && (receipt?.items.length ?? 0) > 0,
    queryKey: ["warehouse", "receive-editor", receiptId, "stock-impact"],
    queryFn: async () => ensureArray((await getGoodsReceiptStockImpact(receiptId)).data),
  });

  const products = useMemo(() => (productsQuery.data ?? []) as Product[], [productsQuery.data]);
  const allLocations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);
  const locationById = useMemo(() => new Map(allLocations.map((l) => [l.id, l] as const)), [allLocations]);
  const warehouseNameById = useMemo(() => new Map((warehousesQuery.data ?? []).map((w) => [w.id, w.name] as const)), [warehousesQuery.data]);
  const status = receipt?.status ?? "draft";
  const editable = status === "draft";
  const hasPo = Boolean(purchaseOrderId);
  const productEditHref = `/${locale}/stock`;

  // Resolve a product's authoritative default receiving location and validate it
  // against the current receipt warehouse — mirrors the backend resolution rules.
  const resolveLocation = useMemo(() => {
    return (
      productId: string,
    ): { locationName: string; status: LocationResolveStatus; warning: string } => {
      const product = productById.get(productId);
      const defId = (product?.default_location_id ?? "").trim();
      if (!defId) return { locationName: "", status: "missing", warning: t.itemNoLocation };
      const loc = locationById.get(defId);
      if (!loc || !loc.is_active || loc.is_sale_point) {
        return { locationName: loc?.name ?? "", status: "unavailable", warning: t.itemLocationUnavailable };
      }
      if (selectedWarehouseId && loc.warehouse_id !== selectedWarehouseId) {
        return { locationName: loc.name, status: "wrong_warehouse", warning: t.itemLocationWrongWarehouse };
      }
      const parts = [warehouseNameById.get(loc.warehouse_id), loc.zone_name, loc.code ? `${loc.code} — ${loc.name}` : loc.name].filter(Boolean);
      return { locationName: parts.join(" · "), status: "ok", warning: "" };
    };
  }, [productById, locationById, warehouseNameById, selectedWarehouseId, t]);

  // Location resolution is only meaningful once the product + location lists have
  // loaded. While they load (or if a fetch fails) we render a neutral "resolving"
  // state instead of falsely flagging valid rows as blocked — the backend remains
  // the authoritative gate at submit/confirm.
  const locationDataReady =
    !productsQuery.isLoading && !locationsQuery.isLoading && !productsQuery.isError && !locationsQuery.isError;
  const prereqError = productsQuery.isError || locationsQuery.isError;

  // ── Init form + rows from the loaded receipt (backend = source of truth) ──
  useEffect(() => {
    if (!receipt || headerInitRef.current) return;
    const initial = buildHeaderForm(receipt);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync of form state from the loaded receipt
    setHeaderForm(initial);
    headerSigRef.current = JSON.stringify(buildHeaderPayload(initial));
    headerInitRef.current = true;
  }, [receipt]);

  useEffect(() => {
    if (!receipt || itemsInitRef.current) return;
    const rows = buildEditorRows(receipt);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync of item rows from the loaded receipt
    setItemRows(rows);
    itemsSigRef.current = JSON.stringify(buildEditorItemsPayload(rows));
    itemsInitRef.current = true;
  }, [receipt]);

  // ── Auto-import PO lines (remaining qty) once, when a PO is linked and empty ──
  useEffect(() => {
    if (!editable || !poDetailQuery.data || poImportedRef.current || !itemsInitRef.current) return;
    if (Object.keys(itemRows).length > 0) { poImportedRef.current = true; return; }
    const poItems = poDetailQuery.data.items ?? [];
    if (!poItems.length) { poImportedRef.current = true; return; }
    const byId = new Map(products.map((p) => [p.id, p]));
    const next: Record<string, ReceiveItemRow> = {};
    for (const it of poItems) {
      const remaining = Math.max(0, it.quantity - it.received_quantity);
      if (remaining <= 0) continue;
      const product = byId.get(it.product_id);
      const key = receiveRowKey(it.product_id);
      next[key] = {
        key,
        productId: it.product_id,
        productName: product?.name ?? it.product_name ?? it.product_id,
        sku: product?.sku ?? "",
        barcode: product?.barcode ?? "",
        unitName: product?.product_unit_name ?? "",
        quantity: String(remaining),
        unitPrice: String(it.unit_cost ?? product?.cost_price ?? 0),
        discountValue: "0",
      };
    }
    poImportedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time import of PO lines after the PO detail loads
    if (Object.keys(next).length) setItemRows(next);
  }, [editable, poDetailQuery.data, products, itemRows]);

  // ── Debounced autosave (no sessionStorage; backend authoritative) ──
  useEffect(() => {
    if (!editable || !headerForm || !headerForm.warehouseId || !headerForm.receivedAt) return;
    const payload = buildHeaderPayload(headerForm);
    const sig = JSON.stringify(payload);
    if (sig === headerSigRef.current) return;
    const id = window.setTimeout(async () => {
      try {
        await updateGoodsReceipt(receiptId, payload);
        headerSigRef.current = sig;
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive-editor", receiptId] });
      } catch { /* surfaced on explicit save */ }
    }, 800);
    return () => window.clearTimeout(id);
  }, [editable, headerForm, queryClient, receiptId]);

  useEffect(() => {
    if (!editable) return;
    const items = buildEditorItemsPayload(itemRows);
    const sig = JSON.stringify(items);
    if (sig === itemsSigRef.current) return;
    const id = window.setTimeout(async () => {
      try {
        await upsertGoodsReceiptItems(receiptId, { items, replace_existing: true });
        itemsSigRef.current = sig;
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive-editor", receiptId, "stock-impact"] });
      } catch { /* surfaced on explicit save */ }
    }, 800);
    return () => window.clearTimeout(id);
  }, [editable, itemRows, queryClient, receiptId]);

  // ── Derived: PO comparison, rows view, inspection, financials ──
  const poMap = useMemo(() => {
    const m = new Map<string, { ordered: number; prevReceived: number }>();
    for (const it of poDetailQuery.data?.items ?? []) m.set(it.product_id, { ordered: it.quantity, prevReceived: it.received_quantity });
    return m;
  }, [poDetailQuery.data]);

  const receivedByProduct = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of Object.values(itemRows)) m[row.productId] = (m[row.productId] ?? 0) + Number(row.quantity || 0);
    return m;
  }, [itemRows]);

  const qtyByProduct = receivedByProduct;

  const editorRows: EditorRowView[] = useMemo(() => {
    return Object.values(itemRows)
      .map((row) => {
        const po = poMap.get(row.productId);
        const ordered = po?.ordered ?? 0;
        const prevReceived = po?.prevReceived ?? 0;
        const remaining = Math.max(0, ordered - prevReceived);
        const productReceived = receivedByProduct[row.productId] ?? 0;
        const qty = Number(row.quantity || 0);
        const unit = Number(row.unitPrice || 0);
        const disc = Number(row.discountValue || 0);
        const overReceipt = hasPo && productReceived > remaining;
        const loc = locationDataReady
          ? resolveLocation(row.productId)
          : { locationName: "", status: "resolving" as LocationResolveStatus, warning: "" };
        return {
          key: row.key,
          productId: row.productId,
          productName: row.productName,
          sku: row.sku,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          discountValue: row.discountValue,
          hasPo,
          ordered,
          prevReceived,
          remaining,
          difference: hasPo ? productReceived - remaining : 0,
          status: receiveRowStatus(hasPo, productReceived, remaining),
          lineTotal: qty * unit - disc,
          overReceipt,
          error: overReceipt ? t.overReceiptInline.replace("{remaining}", String(remaining)) : "",
          locationName: loc.locationName,
          locationStatus: loc.status,
          locationWarning: loc.warning,
          productEditHref,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [itemRows, poMap, receivedByProduct, hasPo, t, resolveLocation, productEditHref, locationDataReady]);

  const inspection = useMemo<{ counts: InspectionCounts; mismatches: InspectionMismatch[]; hasOver: boolean }>(() => {
    const productIds = new Set<string>([...poMap.keys(), ...Object.keys(receivedByProduct)]);
    let totalOrdered = 0, totalReceived = 0, complete = 0, short = 0, over = 0, notReceived = 0;
    const mismatches: InspectionMismatch[] = [];
    for (const pid of productIds) {
      const po = poMap.get(pid);
      const ordered = po?.ordered ?? 0;
      const remaining = Math.max(0, ordered - (po?.prevReceived ?? 0));
      const received = receivedByProduct[pid] ?? 0;
      totalOrdered += remaining;
      totalReceived += received;
      const st = receiveRowStatus(hasPo, received, remaining);
      if (st === "complete") complete += 1;
      else if (st === "short") { short += 1; mismatches.push({ productId: pid, productName: editorRows.find((r) => r.productId === pid)?.productName ?? pid, ordered: remaining, received, difference: received - remaining, kind: "short" }); }
      else if (st === "over") { over += 1; mismatches.push({ productId: pid, productName: editorRows.find((r) => r.productId === pid)?.productName ?? pid, ordered: remaining, received, difference: received - remaining, kind: "over" }); }
      else if (st === "not_received") notReceived += 1;
    }
    const totalLines = Object.keys(itemRows).length;
    return { counts: { totalLines, totalOrdered, totalReceived, complete, short, over, notReceived }, mismatches, hasOver: over > 0 };
  }, [poMap, receivedByProduct, hasPo, editorRows, itemRows]);

  const financials = useMemo(() => {
    let subtotal = 0, discount = 0;
    for (const row of Object.values(itemRows)) {
      subtotal += Number(row.quantity || 0) * Number(row.unitPrice || 0);
      discount += Number(row.discountValue || 0);
    }
    const net = subtotal - discount;
    const vp = Number(headerForm?.vatPercent || 0);
    const vatIncluded = headerForm?.vatIncluded ?? true;
    let vatAmount = 0;
    let total = net;
    if (vp > 0) {
      if (vatIncluded) vatAmount = (net * vp) / (100 + vp);
      else { vatAmount = (net * vp) / 100; total = net + vatAmount; }
    }
    return { subtotal, discount, vatAmount, total };
  }, [itemRows, headerForm]);

  const hasItems = editorRows.some((r) => Number(r.quantity || 0) > 0);
  // Block submit/confirm if any item has an over-receipt, a negative qty, or a
  // product whose default location is definitively missing/invalid/wrong-warehouse.
  // "resolving" (data still loading) is NOT a block — the backend re-validates.
  const hasBlockingError = inspection.hasOver || editorRows.some((r) =>
    Number(r.quantity || 0) < 0 ||
    r.locationStatus === "missing" ||
    r.locationStatus === "unavailable" ||
    r.locationStatus === "wrong_warehouse");

  // ── Mutations / handlers ──
  function setHeaderField<K extends keyof HeaderForm>(field: K, value: HeaderForm[K]) {
    setHeaderForm((cur) => ({ ...(cur ?? buildHeaderForm(receipt)), [field]: value }));
    setHeaderErrors((cur) => ({ ...cur, [field]: undefined }));
  }

  function addProduct(product: Product) {
    if (!editable) return;
    const key = receiveRowKey(product.id);
    setItemRows((cur) => {
      const existing = cur[key];
      if (existing) return { ...cur, [key]: { ...existing, quantity: String(Number(existing.quantity || 0) + 1) } };
      return {
        ...cur,
        [key]: {
          key, productId: product.id, productName: product.name, sku: product.sku ?? "", barcode: product.barcode ?? "",
          unitName: product.product_unit_name ?? "", quantity: "1",
          unitPrice: String(product.cost_price ?? product.effective_price ?? 0), discountValue: "0",
        },
      };
    });
  }

  function stepProduct(product: Product, delta: number) {
    if (!editable) return;
    const key = Object.keys(itemRows).find((k) => itemRows[k].productId === product.id);
    if (!key) { if (delta > 0) addProduct(product); return; }
    setItemRows((cur) => {
      const row = cur[key];
      const next = Math.max(0, Number(row.quantity || 0) + delta);
      if (next <= 0) { const copy = { ...cur }; delete copy[key]; return copy; }
      return { ...cur, [key]: { ...row, quantity: String(next) } };
    });
  }

  function setRowQty(key: string, value: string) {
    setItemRows((cur) => (cur[key] ? { ...cur, [key]: { ...cur[key], quantity: value } } : cur));
  }
  function normalizeRowQty(key: string) {
    setItemRows((cur) => {
      const row = cur[key];
      if (!row) return cur;
      const n = Math.max(0, Math.floor(Number(row.quantity) || 0));
      return { ...cur, [key]: { ...row, quantity: String(n) } };
    });
  }
  function stepRow(key: string, delta: number) {
    setItemRows((cur) => {
      const row = cur[key];
      if (!row) return cur;
      const next = Math.max(0, Number(row.quantity || 0) + delta);
      return { ...cur, [key]: { ...row, quantity: String(next) } };
    });
  }
  function setRowUnitCost(key: string, value: string) {
    setItemRows((cur) => (cur[key] ? { ...cur, [key]: { ...cur[key], unitPrice: value } } : cur));
  }
  function removeRow(key: string) {
    setItemRows((cur) => { const copy = { ...cur }; delete copy[key]; return copy; });
  }

  function handleScanSubmit() {
    const keyword = scanCode.trim().toLowerCase();
    if (!keyword) return;
    const matched = products.find((p) => (p.sku ?? "").trim().toLowerCase() === keyword || (p.barcode ?? "").trim().toLowerCase() === keyword);
    if (!matched) { setScanFeedback({ tone: "error", value: t.stateNoMatchingProduct }); return; }
    addProduct(matched);
    setScanCode("");
    setScanFeedback({ tone: "success", value: t.stateScanMatched });
  }

  async function persistAll() {
    if (headerForm && headerForm.warehouseId && headerForm.receivedAt) {
      const payload = buildHeaderPayload(headerForm);
      await updateGoodsReceipt(receiptId, payload);
      headerSigRef.current = JSON.stringify(payload);
    }
    const items = buildEditorItemsPayload(itemRows);
    await upsertGoodsReceiptItems(receiptId, { items, replace_existing: true });
    itemsSigRef.current = JSON.stringify(items);
  }

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["warehouse", "receive-editor", receiptId] });
  }

  function validateHeader() {
    const errs: Partial<Record<keyof HeaderForm, string>> = {};
    if (!headerForm?.warehouseId) errs.warehouseId = t.validationWarehouseRequired;
    if (!headerForm?.receivedAt) errs.receivedAt = t.validationReceivedAtRequired;
    setHeaderErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSaveDraft() {
    setError("");
    if (!validateHeader()) return;
    startTransition(async () => {
      try { await persistAll(); await refresh(); toast.success(t.helperAutosaveSaved); }
      catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  function handleSubmit() {
    setError("");
    if (!validateHeader()) return;
    if (!hasItems) { setError(t.validationItemsRequired); return; }
    if (hasBlockingError) { setError(t.inspectionOverWarning); return; }
    startTransition(async () => {
      try { await persistAll(); await submitGoodsReceipt(receiptId); await refresh(); toast.success(t.badgePendingReview); }
      catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  function handleReopen() {
    setError("");
    startTransition(async () => {
      try { await reopenGoodsReceipt(receiptId); poImportedRef.current = true; await refresh(); toast.success(t.actionReopen); }
      catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  function handleConfirm() {
    setIsConfirmOpen(false);
    setError("");
    if (!hasItems) { setError(t.validationItemsRequired); return; }
    if (hasBlockingError) { setError(t.inspectionOverWarning); return; }
    startTransition(async () => {
      try {
        if (status === "draft") await persistAll();
        await confirmGoodsReceipt(receiptId);
        await refresh();
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", "index"] });
        toast.success(t.badgeConfirmed);
      } catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  function handleCancel() {
    setIsCancelOpen(false);
    startTransition(async () => {
      try { await cancelGoodsReceipt(receiptId); await refresh(); toast.success(t.badgeCancelled); router.push(`/${locale}/warehouse/receive`); }
      catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  async function handlePurchaseOrderChange(poId: string) {
    if (!poId || !editable) return;
    setError("");
    startTransition(async () => {
      try {
        const po = (await getPurchaseOrder(poId)).data;
        await updateGoodsReceipt(receiptId, { purchase_order_id: poId, supplier_id: po.supplier_id || undefined });
        poImportedRef.current = false;
        await refresh();
      } catch (e) { const m = e instanceof Error ? e.message : t.stateSaving; setError(m); toast.error(m); }
    });
  }

  // ── Render ──
  if (receiptQuery.isLoading || (!headerForm && !receiptQuery.isError)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />{t.stateLoading}
        </div>
      </div>
    );
  }
  if (receiptQuery.isError || !receipt || !headerForm) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{receiptQuery.error instanceof Error ? receiptQuery.error.message : t.stateNoReceipt}</p>
        <Link className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-100" href={`/${locale}/warehouse/receive`}>{t.actionBackToList}</Link>
      </div>
    );
  }

  const statusBadge =
    status === "confirmed" ? { cls: "bg-emerald-100 text-emerald-700", label: t.badgeConfirmed }
    : status === "cancelled" ? { cls: "bg-rose-100 text-rose-700", label: t.badgeCancelled }
    : status === "pending_review" ? { cls: "bg-amber-100 text-amber-700", label: t.badgePendingReview }
    : { cls: "bg-violet-100 text-violet-700", label: t.badgeDraft };
  const stockPreview = stockImpactQuery.data ?? receipt.stock_preview ?? [];
  const warehouseUsableLocations = allLocations.filter((l) => l.warehouse_id === selectedWarehouseId && l.is_active && !l.is_sale_point);
  const locationsWarning = selectedWarehouseId && !locationsQuery.isLoading && warehouseUsableLocations.length === 0
    ? (allLocations.some((l) => l.warehouse_id === selectedWarehouseId) ? t.validationWarehouseOnlySalePoints : t.validationWarehouseWithoutLocations)
    : null;

  return (
    <div className="flex w-full flex-col gap-5 xl:px-2 2xl:px-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{receipt.document_no}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{t.editorTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.editorSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.cls}`}>{statusBadge.label}</span>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50" href={`/${locale}/warehouse/receive`}>
            <ArrowLeft className="h-4 w-4" />{t.actionBackToList}
          </Link>
        </div>
      </div>

      {error ? <Alert onDismiss={() => setError("")} tone="error">{error}</Alert> : null}
      {prereqError ? <Alert tone="error">{t.statePrereqError}</Alert> : null}

      <ReceiveDocumentSection
        dictionary={t}
        documentNo={receipt.document_no}
        editable={editable}
        headerForm={headerForm}
        errors={headerErrors}
        warehouses={warehousesQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        purchaseOrders={purchaseOrdersQuery.data ?? []}
        purchaseOrderId={purchaseOrderId}
        purchaseOrderNo={receipt.purchase_order_no ?? poDetailQuery.data?.order_number ?? ""}
        locationsWarning={locationsWarning}
        onFieldChange={setHeaderField}
        onPurchaseOrderChange={handlePurchaseOrderChange}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <ReceiveItemsTable
            dictionary={t}
            rows={editorRows}
            hasPo={hasPo}
            editable={editable}
            onQtyChange={setRowQty}
            onQtyBlur={normalizeRowQty}
            onStep={stepRow}
            onUnitCostChange={setRowUnitCost}
            onRemove={removeRow}
          />
          <ReceiveInspectionSummary dictionary={t} hasPo={hasPo} counts={inspection.counts} mismatches={inspection.mismatches} hasOver={inspection.hasOver} />
        </div>

        {editable ? (
          <ReceiveProductSearch
            dictionary={t}
            products={products}
            search={search}
            scanCode={scanCode}
            scanFeedback={scanFeedback}
            qtyByProduct={qtyByProduct}
            disabled={!editable}
            onSearchChange={setSearch}
            onScanChange={(v) => { setScanCode(v); setScanFeedback(null); }}
            onScanSubmit={handleScanSubmit}
            onAdd={addProduct}
            onStep={stepProduct}
          />
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ReceiveStockPreview dictionary={t} stockPreview={stockPreview} isLoading={stockImpactQuery.isLoading} isError={stockImpactQuery.isError} error={stockImpactQuery.error} />
        <ReceiveFinancialSummary dictionary={t} subtotal={financials.subtotal} discount={financials.discount} vatAmount={financials.vatAmount} total={financials.total} />
      </div>

      <ReceiveActionBar
        dictionary={t}
        status={status}
        canManage={canManage}
        busy={isPending}
        hasItems={hasItems}
        hasBlockingError={hasBlockingError}
        totalLines={inspection.counts.totalLines}
        totalQty={inspection.counts.totalReceived}
        totalCost={financials.total}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onReopen={handleReopen}
        onConfirm={() => setIsConfirmOpen(true)}
        onCancel={() => setIsCancelOpen(true)}
        onPrint={() => { /* print available on confirmed view */ }}
      />

      <ConfirmDialog
        cancelLabel={t.confirmCancel}
        confirmLabel={t.actionConfirmReceipt}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={t.confirmTitle}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>{t.confirmBody}</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-violet-50/60 p-3 text-xs">
            <span>{t.labelDocumentNo}: <strong className="text-slate-800">{receipt.document_no}</strong></span>
            <span>{t.labelWarehouse}: <strong className="text-slate-800">{warehousesQuery.data?.find((w) => w.id === headerForm.warehouseId)?.name ?? "-"}</strong></span>
            <span>{t.itemCountLabel}: <strong className="text-slate-800">{formatNumber(inspection.counts.totalLines)}</strong></span>
            <span>{t.colActualReceived}: <strong className="text-slate-800">{formatNumber(inspection.counts.totalReceived)}</strong></span>
            <span>{t.statusComplete}: <strong className="text-emerald-700">{formatNumber(inspection.counts.complete)}</strong></span>
            <span>{t.statusShort}: <strong className="text-amber-700">{formatNumber(inspection.counts.short)}</strong></span>
            <span>{t.statusOver}: <strong className="text-violet-700">{formatNumber(inspection.counts.over)}</strong></span>
            <span>{t.labelTotal}: <strong className="text-slate-800">{formatCurrency(financials.total)}</strong></span>
          </div>
          {inspection.mismatches.length > 0 ? <p className="font-medium text-amber-700">{t.inspectionReceivedNote}</p> : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        cancelLabel={t.confirmCancel}
        confirmLabel={t.actionCancel}
        danger
        isOpen={isCancelOpen}
        onCancel={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        title={t.confirmLeaveTitle}
      >
        <p className="text-sm text-slate-600">{t.confirmLeaveBody}</p>
      </ConfirmDialog>
    </div>
  );
}
