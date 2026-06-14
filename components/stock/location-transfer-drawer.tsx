"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, X } from "lucide-react";

import { listLocations, listLocationProducts, type Location } from "@/services/locations";
import { listProducts } from "@/services/products";
import { listWarehouses } from "@/services/warehouses";
import {
  transferStockLocation,
  type StockTransferReason,
} from "@/services/warehouses";

// Canonical W4A reason codes (stable; sent to the backend, NOT the localized label).
const REASONS: StockTransferReason[] = [
  "REPLENISH_SALE_POINT",
  "RETURN_TO_STORAGE",
  "WAREHOUSE_REBALANCE",
  "LOCATION_REORGANIZATION",
  "OTHER",
];

export type LocationTransferDict = {
  ltTitle: string; ltProduct: string; ltSource: string; ltSourceQty: string;
  ltDestination: string; ltAmount: string; ltReason: string; ltNote: string;
  ltSelectSource: string; ltSelectDestination: string; ltConfirm: string;
  ltSubmitting: string; ltCancel: string; ltSuccess: string; ltForbidden: string;
  ltSalePointTag: string; ltStorageTag: string; ltDefaultSaleHint: string;
  ltReadyLabel: string; ltWarehouseStockLabel: string; ltTotalLabel: string; ltPreviewTitle: string;
  ltReasonReplenish: string; ltReasonReturnStorage: string; ltReasonRebalance: string;
  ltReasonReorganize: string; ltReasonOther: string;
  ltValSourceRequired: string; ltValDestRequired: string; ltValSameLocation: string;
  ltValInsufficient: string; ltValReasonRequired: string; ltValNoteRequired: string; ltNoSourceStock: string;
};

type Props = {
  open: boolean;
  productId: string;
  productName: string;
  presetSourceLocationId?: string;
  canManage: boolean;
  dict: LocationTransferDict;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function reasonLabel(d: LocationTransferDict, r: StockTransferReason) {
  switch (r) {
    case "REPLENISH_SALE_POINT": return d.ltReasonReplenish;
    case "RETURN_TO_STORAGE": return d.ltReasonReturnStorage;
    case "WAREHOUSE_REBALANCE": return d.ltReasonRebalance;
    case "LOCATION_REORGANIZATION": return d.ltReasonReorganize;
    case "OTHER": return d.ltReasonOther;
  }
}

export function LocationTransferDrawer({
  open, productId, productName, presetSourceLocationId, canManage, dict, onClose, onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState<StockTransferReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Idempotency: one key per user intent; reused on retry of the unchanged intent,
  // regenerated when a business-significant field changes (Phase W4A §7).
  const keyRef = useRef("");
  const sigRef = useRef("");

  const locationsQ = useQuery({ queryKey: ["lt", "locations"], queryFn: async () => (await listLocations({ limit: 500 })).data?.items ?? [], enabled: open });
  const warehousesQ = useQuery({ queryKey: ["lt", "warehouses"], queryFn: async () => (await listWarehouses()).data ?? [], enabled: open });

  const activeWarehouseIds = useMemo(
    () => new Set((warehousesQ.data ?? []).filter((w) => w.is_active).map((w) => w.id)),
    [warehousesQ.data],
  );
  // Active locations sitting in an active warehouse (same store — listLocations is store-scoped).
  const activeLocations = useMemo<Location[]>(
    () => (locationsQ.data ?? []).filter((l) => l.is_active && activeWarehouseIds.has(l.warehouse_id)),
    [locationsQ.data, activeWarehouseIds],
  );
  const activeIdsKey = useMemo(() => activeLocations.map((l) => l.id).sort().join(","), [activeLocations]);

  // Per-location on-hand quantity for THIS product (no dedicated endpoint → one call per
  // active location, in parallel). Never aggregates; never picks a location automatically.
  const qtyQ = useQuery({
    queryKey: ["lt", "qty", productId, activeIdsKey],
    enabled: open && activeLocations.length > 0 && Boolean(productId),
    queryFn: async () => {
      const entries = await Promise.all(
        activeLocations.map(async (l) => {
          const res = await listLocationProducts(l.id, { limit: 500 });
          const row = (res.data?.items ?? []).find((p) => p.product_id === productId);
          return [l.id, row?.quantity ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });
  const qtyByLoc = useMemo<Record<string, number>>(() => qtyQ.data ?? {}, [qtyQ.data]);
  const locById = useMemo(() => new Map(activeLocations.map((l) => [l.id, l] as const)), [activeLocations]);
  // Authoritative product aggregate (total/warehouse stock across ALL locations, incl. inactive).
  const productAggQ = useQuery({
    queryKey: ["lt", "product-agg", productId],
    enabled: open && Boolean(productId),
    queryFn: async () => (await listProducts({ limit: 1000 })).data.items.find((p) => p.id === productId) ?? null,
  });

  // Reset form each time the drawer opens for a product; preselect an explicit source only
  // when the caller provides one (a Product×Location row). Never default to the first row.
  useEffect(() => {
    if (!open) return;
    setSourceId(presetSourceLocationId && locById.has(presetSourceLocationId) ? presetSourceLocationId : "");
    setDestId(""); setAmount("1"); setReason(""); setNote(""); setError("");
    keyRef.current = ""; sigRef.current = "";
  }, [open, productId, presetSourceLocationId, locById]);

  const ctx = (l: Location) => `${l.zone_name ? l.zone_name + " · " : ""}${l.name} · ${l.is_sale_point ? dict.ltSalePointTag : dict.ltStorageTag}`;
  const sourceOptions = activeLocations.filter((l) => (qtyByLoc[l.id] ?? 0) > 0);
  const destOptions = activeLocations.filter((l) => l.id !== sourceId);
  const defaultSaleId = useMemo(() => activeLocations.find((l) => l.is_sale_point && l.id !== sourceId)?.id ?? "", [activeLocations, sourceId]);

  const src = sourceId ? locById.get(sourceId) : undefined;
  const dst = destId ? locById.get(destId) : undefined;
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  const srcBefore = sourceId ? (qtyByLoc[sourceId] ?? 0) : 0;
  const dstBefore = destId ? (qtyByLoc[destId] ?? 0) : 0;
  // Authoritative preview baseline (Phase W4A Blocker 2): use the product API's aggregate
  // total/warehouse stock across EVERY location (including inactive ones), NOT a sum of the
  // selectable active options. Inactive-location stock stays counted in the totals; it just
  // is not selectable as a transfer endpoint. Falls back to the active-location sum only if
  // the aggregate has not loaded yet.
  const activeSum = useMemo(() => Object.values(qtyByLoc).reduce((a, b) => a + b, 0), [qtyByLoc]);
  const activeWhSum = useMemo(
    () => activeLocations.filter((l) => !l.is_sale_point).reduce((a, l) => a + (qtyByLoc[l.id] ?? 0), 0),
    [activeLocations, qtyByLoc],
  );
  // NOTE on product_view field naming (legacy, intentionally mapped here):
  //   product.warehouse_stock = SUM(quantity) across EVERY location  → grand TOTAL
  //   product.total_stock      = SUM(quantity) where is_sale_point    → READY/sellable
  // So totalBefore uses warehouse_stock and readyBefore uses total_stock; warehouseBefore is
  // the non-sale remainder. Authoritative across all locations incl. inactive (Blocker 2).
  const totalBefore = productAggQ.data?.warehouse_stock ?? activeSum;
  const readyBefore = productAggQ.data?.total_stock ?? (activeSum - activeWhSum);
  const warehouseBefore = totalBefore - readyBefore;
  const readyDelta = (dst?.is_sale_point ? amt : 0) - (src?.is_sale_point ? amt : 0);

  async function handleSubmit() {
    setError("");
    if (!sourceId) { setError(dict.ltValSourceRequired); return; }
    if (!destId) { setError(dict.ltValDestRequired); return; }
    if (sourceId === destId) { setError(dict.ltValSameLocation); return; }
    if (!reason) { setError(dict.ltValReasonRequired); return; }
    if (reason === "OTHER" && !note.trim()) { setError(dict.ltValNoteRequired); return; }
    if (amt <= 0) { setError(dict.ltValInsufficient); return; }
    if (amt > srcBefore) { setError(dict.ltValInsufficient); return; }

    const sig = JSON.stringify({ productId, sourceId, destId, amt, reason, note: note.trim() });
    if (sig !== sigRef.current) {
      keyRef.current = globalThis.crypto?.randomUUID?.() ?? `lt-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      sigRef.current = sig;
    }
    setSubmitting(true);
    try {
      await transferStockLocation(
        { product_id: productId, source_location_id: sourceId, dest_location_id: destId, quantity: amt, reason, note: note.trim() || undefined },
        keyRef.current,
      );
      keyRef.current = ""; sigRef.current = ""; // success → next intent uses a fresh key
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["stock", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["stock", "movements"] }),
        queryClient.invalidateQueries({ queryKey: ["warehouse"] }),
        queryClient.invalidateQueries({ queryKey: ["warehouse-products"] }),
        queryClient.invalidateQueries({ queryKey: ["all-products"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["location-products"] }),
        queryClient.invalidateQueries({ queryKey: ["managed-locations"] }),
        queryClient.invalidateQueries({ queryKey: ["lt"] }),
      ]);
      onSuccess(dict.ltSuccess);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  if (!canManage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" onClick={onClose}>
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-sm text-rose-700 shadow-2xl">{dict.ltForbidden}</div>
      </div>
    );
  }
  const loading = locationsQ.isLoading || warehousesQ.isLoading || qtyQ.isLoading;
  const numFmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/45" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-violet-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{dict.ltTitle}</h3>
          <button aria-label={dict.ltCancel} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" onClick={onClose} type="button"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-slate-500">{dict.ltProduct}</p>
            <p className="font-semibold text-slate-900">{productName}</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-violet-600" />…</div>
          ) : sourceOptions.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{dict.ltNoSourceStock}</p>
          ) : (
            <>
              {/* Source */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.ltSource}</label>
                <select className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">{dict.ltSelectSource}</option>
                  {sourceOptions.map((l) => (
                    <option key={l.id} value={l.id}>{ctx(l)} · {dict.ltSourceQty} {numFmt(qtyByLoc[l.id] ?? 0)}</option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.ltDestination}</label>
                <select className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" value={destId} onChange={(e) => setDestId(e.target.value)}>
                  <option value="">{dict.ltSelectDestination}</option>
                  {destOptions.map((l) => (
                    <option key={l.id} value={l.id}>{ctx(l)}{l.id === defaultSaleId ? ` · ${dict.ltDefaultSaleHint}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.ltAmount}</label>
                <input className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" inputMode="numeric" min={1} max={srcBefore || undefined} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.ltReason}</label>
                <select className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" value={reason} onChange={(e) => setReason(e.target.value as StockTransferReason)}>
                  <option value="">—</option>
                  {REASONS.map((r) => <option key={r} value={r}>{reasonLabel(dict, r)}</option>)}
                </select>
              </div>

              {/* Note (required for OTHER) */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.ltNote}{reason === "OTHER" ? " *" : ""}</label>
                <textarea className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm outline-none focus:border-violet-400" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {/* Preview */}
              {sourceId && destId && amt > 0 ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-3 text-xs">
                  <p className="mb-1 font-semibold text-violet-700">{dict.ltPreviewTitle}</p>
                  <PreviewRow label={src ? ctx(src) : dict.ltSource} a={srcBefore} b={srcBefore - amt} />
                  <PreviewRow label={dst ? ctx(dst) : dict.ltDestination} a={dstBefore} b={dstBefore + amt} />
                  <PreviewRow label={dict.ltReadyLabel} a={readyBefore} b={readyBefore + readyDelta} />
                  <PreviewRow label={dict.ltWarehouseStockLabel} a={warehouseBefore} b={warehouseBefore - readyDelta} />
                  <PreviewRow label={dict.ltTotalLabel} a={totalBefore} b={totalBefore} strong />
                </div>
              ) : null}

              {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-violet-100 px-6 py-4">
          <button className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button" disabled={submitting}>{dict.ltCancel}</button>
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            onClick={handleSubmit}
            type="button"
            disabled={submitting || loading || sourceOptions.length === 0}
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />{dict.ltSubmitting}</> : <><ArrowRight className="h-4 w-4" />{dict.ltConfirm}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, a, b, strong }: { label: string; a: number; b: number; strong?: boolean }) {
  const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
  return (
    <div className={`flex items-center justify-between py-0.5 ${strong ? "mt-1 border-t border-violet-200 pt-1 font-semibold text-slate-800" : "text-slate-600"}`}>
      <span className="truncate pr-2">{label}</span>
      <span className="tabular-nums">{fmt(a)} → {fmt(b)}</span>
    </div>
  );
}
