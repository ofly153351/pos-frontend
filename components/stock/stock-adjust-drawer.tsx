"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Equal, Loader2, Lock, MapPin, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";
import { addStock, adjustStock, removeStock } from "@/services/stock-movements";
import { listLocations, type Location } from "@/services/locations";
import { listWarehouses } from "@/services/warehouses";
import { getProductStockByLocation } from "@/services/warehouse-inventory";
import { getCurrentStoreId } from "@/lib/store-storage";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";
import type { Product } from "@/types/product";

type AdjustType = "receive" | "decrease" | "set";

// Stable reason codes per mode (must match the backend's per-operation reason-code sets:
// opAdd / opSubtract / opSetActual). The label shown comes from dict.reasonLabels[code];
// the CODE is what is sent and validated server-side.
const REASON_CODES: Record<AdjustType, string[]> = {
  receive: ["FOUND_EXTRA", "RETURN_TO_STOCK", "OPENING_BALANCE", "DATA_CORRECTION", "OTHER"],
  decrease: ["DAMAGED", "LOST", "EXPIRED", "INTERNAL_USE", "WRITE_OFF", "DATA_CORRECTION", "OTHER"],
  set: ["SPOT_COUNT", "SYSTEM_MISMATCH", "DATA_CORRECTION", "OTHER"],
};

// A high variance on a Set Actual is allowed but flagged for an explicit second look. We warn
// on EITHER a large absolute swing OR a large proportional swing, so both "1,000 → 950" (small
// %, ignore) and "5 → 80" (huge %, warn) are handled. current === 0 is divide-safe (pct rule
// is gated on current > 0; a first count of an empty location only warns past the absolute bar).
const HIGH_VARIANCE_ABS = 100;
const HIGH_VARIANCE_PCT = 0.5; // 50% of the location's current on-hand

// Session-only "keep this location" memory. Lives at module scope so it survives the drawer
// unmounting between products, and is keyed by STORE + context (selected warehouse, or "store"
// for the Inventory entry point) so it clears when the store or warehouse changes and can never
// carry a location across stores. An invalid lock falls back to adaptive selection.
let lockedLocationMemo: { key: string; locationId: string } | null = null;

// One enriched, selectable location candidate: active location metadata + this product's
// live on-hand quantity AT that location (never an aggregate).
type LocationOption = Location & { quantity: number; isDefault: boolean };

type Props = {
  product: Product | null;
  // When provided (Warehouse entry point) the candidate locations are restricted to this
  // warehouse. Absent (Inventory entry point) → every active location in the store.
  warehouseId?: string;
  dict: InventoryAdjustDictionary;
  onClose: () => void;
  onSuccess: () => void;
};

export function StockAdjustDrawer({ product, warehouseId, dict, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<AdjustType>("receive");
  const [qty, setQty] = useState(0);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [lockOn, setLockOn] = useState(false);
  const [stale, setStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [varianceAck, setVarianceAck] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);
  // One idempotency key per finalized submit (set when entering the confirm step), so a
  // double-click / retry of Save re-uses it and the backend applies the change once.
  const idemRef = useRef<string>("");

  // Lock memory is scoped to the current store AND warehouse context, so switching store or
  // warehouse (or logging in as another user in a different store) never reuses a stale lock.
  const ctxKey = `${getCurrentStoreId() ?? ""}|${warehouseId ? `wh:${warehouseId}` : "store"}`;
  const productId = product?.id ?? "";

  // ── Data: per-location on-hand for THIS product + location/warehouse metadata ──────────
  const stockQuery = useQuery({
    enabled: Boolean(product),
    queryKey: ["stock-adjust", "by-location", productId],
    queryFn: async () => (await getProductStockByLocation(productId)).data,
  });
  const locationsQuery = useQuery({
    enabled: Boolean(product),
    queryKey: ["stock-adjust", "locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data.items,
  });
  const warehousesQuery = useQuery({
    enabled: Boolean(product),
    queryKey: ["stock-adjust", "warehouses"],
    queryFn: async () => (await listWarehouses()).data,
  });

  const dataReady = stockQuery.isSuccess && locationsQuery.isSuccess && warehousesQuery.isSuccess;
  const dataLoading = stockQuery.isLoading || locationsQuery.isLoading || warehousesQuery.isLoading;

  // Authoritative store-wide aggregate (read-only context only — never the mutation basis).
  const aggregateTotal = stockQuery.data?.total_quantity ?? product?.warehouse_stock ?? product?.total_stock ?? 0;

  // Live per-location quantity map for this product.
  const qtyByLoc = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of stockQuery.data?.locations ?? []) m.set(l.location_id, l.quantity);
    return m;
  }, [stockQuery.data]);

  const defaultLocationId = (product?.default_location_id ?? "").trim();

  // Candidate locations: active locations in active warehouses, scoped to the warehouse
  // context when present, restricted to the locations relevant to this product (it already
  // has a stock row there, or it is the product's default location). Each is annotated with
  // the product's live quantity at that location.
  const candidates = useMemo<LocationOption[]>(() => {
    const activeWh = new Set((warehousesQuery.data ?? []).filter((w) => w.is_active).map((w) => w.id));
    return (locationsQuery.data ?? [])
      .filter((l) => l.is_active && activeWh.has(l.warehouse_id))
      .filter((l) => !warehouseId || l.warehouse_id === warehouseId)
      .filter((l) => qtyByLoc.has(l.id) || l.id === defaultLocationId)
      .map((l) => ({ ...l, quantity: qtyByLoc.get(l.id) ?? 0, isDefault: l.id === defaultLocationId }))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (a.is_sale_point !== b.is_sale_point) return a.is_sale_point ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [locationsQuery.data, warehousesQuery.data, qtyByLoc, warehouseId, defaultLocationId]);

  // Reset the form whenever the drawer opens for a (different) product.
  useEffect(() => {
    if (!product) return;
    setType("receive"); setQty(0); setReasonCode(""); setNote(""); setStep("edit"); setStale(false); setVarianceAck(false);
    const id = window.setTimeout(() => qtyRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [product]);

  // Resolve the initial location ONCE per (product, context): a still-valid session-locked
  // location wins; otherwise auto-select the only candidate or preselect a valid default;
  // otherwise leave empty so the user must choose explicitly. Guarded by initRef so a later
  // refetch (e.g. the stale-count reload) never clobbers the user's manual choice.
  const initRef = useRef("");
  useEffect(() => {
    if (!product || !dataReady) return;
    const initKey = `${productId}|${ctxKey}`;
    if (initRef.current === initKey) return;
    const ids = new Set(candidates.map((c) => c.id));
    let next = "";
    let locked = false;
    if (lockedLocationMemo && lockedLocationMemo.key === ctxKey && ids.has(lockedLocationMemo.locationId)) {
      next = lockedLocationMemo.locationId; locked = true;
    } else if (candidates.length === 1) {
      next = candidates[0].id;
    } else if (defaultLocationId && ids.has(defaultLocationId)) {
      next = defaultLocationId;
    }
    initRef.current = initKey;
    setSelectedLocationId(next); setLockOn(locked);
  }, [product, dataReady, productId, ctxKey, defaultLocationId, candidates]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const unit = product.product_unit_name ?? "";
  const selected = candidates.find((c) => c.id === selectedLocationId) ?? null;
  // THE authoritative adjustment basis: the SELECTED location's live on-hand (never an aggregate).
  const current = selected ? selected.quantity : 0;
  const newStock = type === "receive" ? current + qty : type === "decrease" ? current - qty : qty;
  const diff = newStock - current;
  const invalidNegative = newStock < 0;
  const reasonMissing = reasonCode === "";
  const noteMissingForOther = reasonCode === "OTHER" && note.trim() === "";
  const qtyOk = type === "set" ? qty >= 0 : qty > 0;
  const hasLocation = selectedLocationId !== "" && Boolean(selected);
  const noCandidates = dataReady && candidates.length === 0;
  const canProceed = hasLocation && qtyOk && !invalidNegative && !reasonMissing && !noteMissingForOther;
  // Warn on a large absolute OR a large proportional swing (Set Actual only). Divide-safe.
  const isHighVariance =
    type === "set" &&
    diff !== 0 &&
    (Math.abs(diff) >= HIGH_VARIANCE_ABS || (current > 0 && Math.abs(diff) >= current * HIGH_VARIANCE_PCT));

  const TYPES: Array<{ key: AdjustType; label: string; icon: typeof Equal; tone: string }> = [
    { key: "receive", label: dict.typeReceive, icon: ArrowUpCircle, tone: "emerald" },
    { key: "decrease", label: dict.typeDecrease, icon: ArrowDownCircle, tone: "rose" },
    { key: "set", label: dict.typeSet, icon: Equal, tone: "violet" },
  ];

  function chooseType(key: AdjustType) {
    setType(key);
    setReasonCode(""); // reason codes differ per mode
  }

  function locationContext(l: LocationOption) {
    const zone = l.zone_name ? `${l.zone_name} › ` : "";
    const code = l.code ? ` (${l.code})` : "";
    return `${l.warehouse_name ?? ""} › ${zone}${l.name}${code}`.replace(/^ › /, "");
  }

  function goConfirm() {
    idemRef.current = (globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`);
    setStale(false);
    setStep("confirm");
  }

  function persistLock() {
    if (lockOn && selectedLocationId) lockedLocationMemo = { key: ctxKey, locationId: selectedLocationId };
    else if (lockedLocationMemo?.key === ctxKey) lockedLocationMemo = null;
  }

  function afterSubmit() {
    // Canonical invalidation: one adjustment must refresh every inventory surface that derives
    // from this product's stock — the per-location cache, the Inventory page, the Warehouse
    // inventory page, and the Inventory Value report — without refetching unrelated app data.
    // (The parent's onSuccess also invalidates its own page; this covers the cross-page surfaces
    // so a stale KPI can never linger on a screen the user navigates to next.)
    for (const key of [["stock-adjust", "by-location"], ["inventory"], ["wh-inv"], ["reports", "inventory-value"]]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    onClose();
  }

  async function submit() {
    if (!product || !canProceed || submitting) return;
    const key = idemRef.current;
    const trimmedNote = note.trim() || undefined;
    const delta = newStock - current;
    const locationId = selectedLocationId;
    setSubmitting(true);
    try {
      if (type === "set") {
        // SET_ACTUAL: the backend recomputes the delta server-side and rejects the write
        // unless expectedQuantity matches this location's live on-hand (optimistic lock).
        if (delta === 0) { persistLock(); toast.success(dict.success); onSuccess(); afterSubmit(); return; }
        await adjustStock({ productId: product.id, physicalQty: newStock, expectedQuantity: current, locationId, reason: reasonCode, idempotencyKey: key, note: trimmedNote });
      } else if (delta > 0) {
        await addStock({ items: [{ product_id: product.id, quantity: delta, location_id: locationId, reason: reasonCode, idempotency_key: key, note: trimmedNote }] });
      } else if (delta < 0) {
        await removeStock({ product_id: product.id, location_id: locationId, quantity: -delta, reason: reasonCode, idempotency_key: key, note: trimmedNote });
      }
      persistLock();
      toast.success(dict.success);
      onSuccess();
      afterSubmit();
    } catch (e) {
      // Distinguish a stale-count conflict (stock at this location changed after we loaded it)
      // from any other error by reloading the live location quantity. On a real change we keep
      // the user's entered values, refresh the preview, and ask them to confirm again — never
      // silently retry an absolute Set.
      const fresh = await stockQuery.refetch();
      const latest = (fresh.data?.locations ?? []).find((l) => l.location_id === locationId)?.quantity ?? 0;
      if (latest !== current) {
        setStale(true);
        setStep("edit");
      } else {
        toast.error(e instanceof Error && e.message ? e.message : dict.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const numFmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true" aria-label={dict.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-violet-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{dict.title}</h3>
            <p className="truncate text-sm text-slate-500">{product.name}{product.sku ? ` · ${product.sku}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={dict.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "edit" ? (
          <div className="space-y-4 overflow-y-auto p-5">
            {/* Store-wide aggregate — read-only context, never the mutation basis */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
              <span className="text-xs font-medium text-slate-500">{dict.storeTotal}</span>
              <span className="text-sm font-bold tabular-nums text-slate-700">{numFmt(aggregateTotal)}{unit ? ` ${unit}` : ""}</span>
            </div>

            {/* Location resolution */}
            {dataLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> {dict.loadingLocations}
              </div>
            ) : noCandidates ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs font-medium text-amber-700">{dict.noValidLocation}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">{dict.selectedLocationLabel}</label>
                {candidates.length > 1 ? (
                  <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                    <option value="">{dict.selectLocationPrompt}</option>
                    {candidates.map((l) => (
                      <option key={l.id} value={l.id}>
                        {locationContext(l)} · {dict.locationQty} {numFmt(l.quantity)}{l.is_sale_point ? ` · ${dict.salePointTag}` : ""}{l.isDefault ? ` · ${dict.defaultTag}` : ""}
                      </option>
                    ))}
                  </select>
                ) : null}

                {selected ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-violet-500" />
                        <p className="truncate text-sm font-bold text-slate-800">{locationContext(selected)}</p>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-500">
                          {selected.is_sale_point ? dict.salePointTag : dict.storageTag}
                        </span>
                        {selected.isDefault ? <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-600">{dict.defaultTag}</span> : null}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-slate-400">{dict.locationQty}</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">{numFmt(current)}{unit ? ` ${unit}` : ""}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{dict.selectLocationRequired}</p>
                )}

                {candidates.length > 1 && selected ? (
                  <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-slate-500">
                    <input type="checkbox" checked={lockOn} onChange={(e) => setLockOn(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-300" />
                    <Lock className="h-3 w-3 text-violet-400" /> {dict.useContinuously}
                  </label>
                ) : null}
              </div>
            )}

            {/* Stale-count notice (location quantity changed under us) */}
            {stale ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs font-medium text-amber-700">{dict.staleNotice}</p>
              </div>
            ) : null}

            {/* Type segmented */}
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ key, label, icon: Icon, tone }) => (
                <button key={key} type="button" onClick={() => chooseType(key)}
                  className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-semibold transition ${
                    type === key
                      ? tone === "emerald" ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : tone === "rose" ? "border-rose-400 bg-rose-50 text-rose-700"
                          : "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{type === "set" ? dict.countedQty : dict.quantity}</label>
              <input ref={qtyRef} type="number" min={0} inputMode="numeric" value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-center text-lg font-bold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>

            {/* Preview */}
            <div className={`space-y-1.5 rounded-xl border px-4 py-3 ${invalidNegative ? "border-rose-200 bg-rose-50" : "border-violet-100 bg-violet-50/50"}`}>
              <PreviewLine label={type === "set" ? dict.systemQty : dict.currentStock} value={`${numFmt(current)}${unit ? ` ${unit}` : ""}`} />
              {type === "set" ? (
                <PreviewLine label={dict.variance} value={`${diff > 0 ? "+" : ""}${numFmt(diff)}`} tone={diff > 0 ? "emerald" : diff < 0 ? "amber" : undefined} />
              ) : (
                <PreviewLine label={dict.difference} value={`${diff > 0 ? "+" : ""}${numFmt(diff)}`} tone={diff > 0 ? "emerald" : diff < 0 ? "amber" : undefined} />
              )}
              <PreviewLine label={dict.newStock} value={`${numFmt(newStock)}${unit ? ` ${unit}` : ""}`} strong tone={invalidNegative ? "rose" : undefined} />
            </div>
            {invalidNegative ? <p className="text-xs text-rose-500">{dict.invalidNegative}</p> : null}

            {/* Reason (required, coded per mode) */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dict.reason} <span className="text-rose-500">*</span></label>
              <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                <option value="">{dict.selectReason}</option>
                {REASON_CODES[type].map((code) => (
                  <option key={code} value={code}>{dict.reasonLabels[code] ?? code}</option>
                ))}
              </select>
              {reasonMissing ? <p className="mt-1 text-xs text-slate-400">{dict.reasonRequired}</p> : null}
            </div>

            {/* Note (required when reason is OTHER) */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {dict.note}{reasonCode === "OTHER" ? <span className="text-rose-500"> *</span> : null}
              </label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={dict.notePlaceholder}
                className="w-full resize-none rounded-xl border border-violet-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              {noteMissingForOther ? <p className="mt-1 text-xs text-rose-500">{dict.noteRequired}</p> : null}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-violet-200 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">{dict.cancel}</button>
              <button type="button" disabled={!canProceed} onClick={goConfirm}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">{dict.confirm}</button>
            </div>
          </div>
        ) : (
          /* Confirm step */
          <div className="space-y-4 overflow-y-auto p-5">
            <p className="text-sm font-bold text-slate-700">{dict.preview}</p>
            <div className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <Row label={dict.selectedLocationLabel} value={selected ? locationContext(selected) : "—"} />
              <Row label={type === "set" ? dict.systemQty : dict.currentStock} value={`${numFmt(current)}${unit ? ` ${unit}` : ""}`} />
              {type === "set" ? <Row label={dict.countedQty} value={`${numFmt(newStock)}${unit ? ` ${unit}` : ""}`} /> : null}
              <Row label={type === "set" ? dict.variance : dict.difference} value={`${diff > 0 ? "+" : ""}${numFmt(diff)}`} tone={diff > 0 ? "emerald" : diff < 0 ? "amber" : undefined} />
              <Row label={dict.newStock} value={`${numFmt(newStock)}${unit ? ` ${unit}` : ""}`} strong />
              <Row label={dict.reason} value={dict.reasonLabels[reasonCode] ?? reasonCode} />
              {note.trim() ? <Row label={dict.note} value={note.trim()} /> : null}
            </div>

            {isHighVariance ? (
              <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs font-medium text-amber-700">{dict.highVarianceWarning}</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 pl-6 text-xs font-medium text-amber-800">
                  <input type="checkbox" checked={varianceAck} onChange={(e) => setVarianceAck(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-300" />
                  {dict.varianceConfirm}
                </label>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("edit")} className="h-11 flex-1 rounded-xl border border-violet-200 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">{dict.back}</button>
              <button type="button" disabled={submitting || (isHighVariance && !varianceAck)} onClick={submit}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />{dict.saving}</> : dict.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewLine({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "emerald" | "amber" | "rose" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? "text-lg font-bold" : "text-sm font-semibold"} ${tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "emerald" | "amber" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm ${strong ? "font-bold" : "font-semibold"} ${tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-slate-800"} text-right`}>{value || "—"}</span>
    </div>
  );
}
