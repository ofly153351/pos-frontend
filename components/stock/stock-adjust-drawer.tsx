"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, Equal, MapPin, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";
import { addStock, adjustStock, removeStock } from "@/services/stock-movements";
import { listLocations } from "@/services/locations";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";
import type { Product } from "@/types/product";

type AdjustType = "receive" | "decrease" | "set";

// Stable reason codes per mode (must match the backend's reason-code sets). The label
// shown comes from dict.reasonLabels[code]; the CODE is what is sent and validated.
const REASON_CODES: Record<AdjustType, string[]> = {
  receive: ["FOUND_EXTRA", "RETURN_TO_STOCK", "OPENING_BALANCE", "DATA_CORRECTION", "OTHER"],
  decrease: ["DAMAGED", "LOST", "EXPIRED", "INTERNAL_USE", "WRITE_OFF", "DATA_CORRECTION", "OTHER"],
  set: ["SPOT_COUNT", "SYSTEM_MISMATCH", "DATA_CORRECTION", "OTHER"],
};

type Props = {
  product: Product | null;
  dict: InventoryAdjustDictionary;
  onClose: () => void;
  onSuccess: () => void;
};

export function StockAdjustDrawer({ product, dict, onClose, onSuccess }: Props) {
  const [type, setType] = useState<AdjustType>("receive");
  const [qty, setQty] = useState(0);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [isPending, startTransition] = useTransition();
  const qtyRef = useRef<HTMLInputElement>(null);
  // One idempotency key per finalized submit (set when entering the confirm step), so a
  // double-click / retry of Save re-uses it and the backend applies the change once.
  const idemRef = useRef<string>("");

  useEffect(() => {
    if (!product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType("receive"); setQty(0); setReasonCode(""); setNote(""); setStep("edit");
    const id = window.setTimeout(() => qtyRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  // Resolve the product's authoritative default storage location → human name.
  const locationsQuery = useQuery({
    enabled: Boolean(product),
    queryKey: ["inventory", "locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data.items,
  });
  const targetLocationId = (product?.default_location_id ?? "").trim();
  const hasDefaultLocation = targetLocationId !== "";
  const targetLocationName = useMemo(
    () => (locationsQuery.data ?? []).find((l) => l.id === targetLocationId)?.name ?? "",
    [locationsQuery.data, targetLocationId],
  );

  if (!product) return null;

  const unit = product.product_unit_name ?? "";
  // The inventory page manages TOTAL store stock — adjust against the same basis.
  const current = product.warehouse_stock ?? product.total_stock ?? 0;
  const newStock = type === "receive" ? current + qty : type === "decrease" ? current - qty : qty;
  const diff = newStock - current;
  const invalidNegative = newStock < 0;
  const reasonMissing = reasonCode === "";
  const noteMissingForOther = reasonCode === "OTHER" && note.trim() === "";
  // Set-exact may be 0; receive/decrease require a positive quantity.
  const qtyOk = type === "set" ? qty >= 0 : qty > 0;
  const canProceed = qtyOk && !invalidNegative && !reasonMissing && !noteMissingForOther && hasDefaultLocation;

  const TYPES: Array<{ key: AdjustType; label: string; icon: typeof Equal; tone: string }> = [
    { key: "receive", label: dict.typeReceive, icon: ArrowUpCircle, tone: "emerald" },
    { key: "decrease", label: dict.typeDecrease, icon: ArrowDownCircle, tone: "rose" },
    { key: "set", label: dict.typeSet, icon: Equal, tone: "violet" },
  ];

  function chooseType(key: AdjustType) {
    setType(key);
    setReasonCode(""); // reason codes differ per mode
  }

  function goConfirm() {
    idemRef.current = (globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`);
    setStep("confirm");
  }

  function submit() {
    if (!product || !canProceed) return;
    const key = idemRef.current;
    const trimmedNote = note.trim() || undefined;
    const delta = newStock - current;
    startTransition(async () => {
      try {
        if (type === "set") {
          // SET_ACTUAL posts a single signed-delta correction at the default location.
          if (delta === 0) { toast.success(dict.success); onSuccess(); onClose(); return; }
          await adjustStock({ productId: product.id, physicalQty: newStock, locationId: targetLocationId, reason: reasonCode, idempotencyKey: key, note: trimmedNote });
        } else if (delta > 0) {
          await addStock({ items: [{ product_id: product.id, quantity: delta, location_id: targetLocationId, reason: reasonCode, idempotency_key: key, note: trimmedNote }] });
        } else if (delta < 0) {
          await removeStock({ product_id: product.id, location_id: targetLocationId, quantity: -delta, reason: reasonCode, idempotency_key: key, note: trimmedNote });
        }
        toast.success(dict.success);
        onSuccess();
        onClose();
      } catch (e) {
        // Surface the backend's (Thai) domain message when present.
        toast.error(e instanceof Error && e.message ? e.message : dict.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true" aria-label={dict.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up">
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
          <div className="space-y-4 p-5">
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

            {/* Current */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">{dict.currentStock}</span>
              <span className="text-lg font-bold text-slate-800">{current}{unit ? ` ${unit}` : ""}</span>
            </div>

            {/* Target location — adjustments post to the product's default location */}
            {hasDefaultLocation ? (
              <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{dict.targetLocation}</p>
                  <p className="truncate text-sm font-bold text-slate-800">{targetLocationName || targetLocationId}</p>
                  <p className="mt-0.5 text-[11px] text-violet-600">{dict.useDefaultLocation}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs font-medium text-amber-700">{dict.noDefaultLocation}</p>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dict.quantity}</label>
              <input ref={qtyRef} type="number" min={0} value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-center text-lg font-bold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>

            {/* Preview */}
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${invalidNegative ? "border-rose-200 bg-rose-50" : "border-violet-100 bg-violet-50/50"}`}>
              <span className="text-sm text-slate-500">{dict.newStock}</span>
              <span className={`text-lg font-bold ${invalidNegative ? "text-rose-600" : diff > 0 ? "text-emerald-600" : diff < 0 ? "text-amber-600" : "text-slate-700"}`}>
                {newStock}{unit ? ` ${unit}` : ""}
                {diff !== 0 ? <span className="ml-2 text-xs font-semibold">({diff > 0 ? "+" : ""}{diff})</span> : null}
              </span>
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
          <div className="space-y-4 p-5">
            <p className="text-sm font-bold text-slate-700">{dict.preview}</p>
            <div className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <Row label={dict.currentStock} value={`${current}${unit ? ` ${unit}` : ""}`} />
              <Row label={dict.newStock} value={`${newStock}${unit ? ` ${unit}` : ""}`} strong />
              <Row label={dict.difference} value={`${diff > 0 ? "+" : ""}${diff}`} tone={diff > 0 ? "emerald" : diff < 0 ? "amber" : undefined} />
              <Row label={dict.targetLocation} value={targetLocationName || targetLocationId} />
              <Row label={dict.reason} value={dict.reasonLabels[reasonCode] ?? reasonCode} />
              {note.trim() ? <Row label={dict.note} value={note.trim()} /> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("edit")} className="h-11 flex-1 rounded-xl border border-violet-200 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">{dict.back}</button>
              <button type="button" disabled={isPending} onClick={submit}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">{isPending ? dict.saving : dict.save}</button>
            </div>
          </div>
        )}
      </div>
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
