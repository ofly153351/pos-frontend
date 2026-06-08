"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ClipboardCheck, Download, Plus, ScanLine, Trash2, X,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { getCurrentStoreId } from "@/lib/store-storage";
import { listProducts, listProductTypes } from "@/services/products";
import { listWarehouses } from "@/services/warehouses";
import { adjustStock } from "@/services/stock-movements";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import type { CountDictionary } from "@/components/stock/inventory-types";

type CountStatus = "draft" | "counting" | "review" | "completed" | "cancelled";
type CountItem = { productId: string; name: string; sku: string; barcode: string; systemQty: number; counted: number | null; note: string };
type CountSession = {
  id: string; name: string; warehouseName: string | null; zone: string | null; categoryId: string | null;
  note: string; status: CountStatus; createdAt: string; items: CountItem[];
};

type Props = { dictionary: CountDictionary; locale: string };
type View = "list" | "create" | "count";

function parseWarehouse(s?: string | null): { warehouse: string | null; zone: string | null } {
  const raw = s?.trim();
  if (!raw) return { warehouse: null, zone: null };
  const parts = raw.split(/[·>/]/).map((x) => x.trim()).filter(Boolean);
  return { warehouse: parts[0] ?? null, zone: parts[1] ?? null };
}
function variance(it: CountItem): number { return it.counted == null ? 0 : it.counted - it.systemQty; }
function vStatus(it: CountItem): "match" | "short" | "over" | "notCounted" {
  if (it.counted == null) return "notCounted";
  const v = it.counted - it.systemQty;
  return v === 0 ? "match" : v < 0 ? "short" : "over";
}
const V_BADGE: Record<string, string> = {
  match: "bg-emerald-100 text-emerald-700", short: "bg-rose-100 text-rose-700",
  over: "bg-indigo-100 text-indigo-700", notCounted: "bg-slate-100 text-slate-500",
};

export function StockCountManager({ dictionary, locale }: Props) {
  const t = dictionary;
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [reviewing, setReviewing] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const storageKey = useMemo(() => `pos-count-sessions-${getCurrentStoreId() ?? "default"}`, []);
  const counterRef = useRef(0);

  // create-form state
  const [fName, setFName] = useState("");
  const [fWarehouse, setFWarehouse] = useState("");
  const [fZone, setFZone] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fNote, setFNote] = useState("");
  const [scan, setScan] = useState("");

  const dtf = useMemo(() => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }), [locale]);

  // Load / persist sessions
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSessions(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);
  function persist(next: CountSession[]) {
    setSessions(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // If the active session disappears (deleted) while in count view, fall back to list.
  useEffect(() => {
    if (view === "count" && !sessions.some((s) => s.id === activeId)) setView("list");
  }, [view, activeId, sessions]);

  const productsQuery = useQuery({ queryKey: ["count", "products"], queryFn: async () => (await listProducts({ limit: 9999, page: 1 })).data });
  const warehousesQuery = useQuery({ queryKey: ["count", "warehouses"], queryFn: async () => (await listWarehouses()).data });
  const categoriesQuery = useQuery({ queryKey: ["count", "categories"], queryFn: async () => (await listProductTypes()).data });

  const active = sessions.find((s) => s.id === activeId) ?? null;

  function newId() {
    counterRef.current += 1;
    return `cs-${Date.now().toString(36)}-${counterRef.current}`;
  }

  function startSession() {
    const all = productsQuery.data?.items ?? [];
    const whName = fWarehouse || null;
    const items: CountItem[] = all
      .filter((p) => {
        if (fCategory && p.product_type_id !== fCategory) return false;
        if (whName) {
          const w = parseWarehouse(p.storage_location);
          if (w.warehouse !== whName) return false;
          if (fZone && w.zone !== fZone) return false;
        }
        return true;
      })
      .map((p) => ({
        productId: p.id, name: p.name, sku: p.sku ?? "", barcode: p.barcode ?? "",
        systemQty: p.total_stock ?? 0, counted: null, note: "",
      }));
    const session: CountSession = {
      id: newId(), name: fName.trim() || t.create.title, warehouseName: whName, zone: fZone || null,
      categoryId: fCategory || null, note: fNote.trim(), status: "counting", createdAt: new Date().toISOString(), items,
    };
    persist([session, ...sessions]);
    setActiveId(session.id);
    setFName(""); setFWarehouse(""); setFZone(""); setFCategory(""); setFNote("");
    setReviewing(false);
    setView("count");
  }

  function updateActive(mut: (s: CountSession) => CountSession) {
    if (!active) return;
    persist(sessions.map((s) => (s.id === active.id ? mut(s) : s)));
  }
  function setCounted(productId: string, value: number | null) {
    updateActive((s) => ({ ...s, items: s.items.map((it) => (it.productId === productId ? { ...it, counted: value } : it)) }));
  }
  function setItemNote(productId: string, note: string) {
    updateActive((s) => ({ ...s, items: s.items.map((it) => (it.productId === productId ? { ...it, note } : it)) }));
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scan.trim().toLowerCase();
    if (!code || !active) return;
    const it = active.items.find((x) => x.barcode.toLowerCase() === code || x.sku.toLowerCase() === code);
    if (!it) { toast.error(t.scanNotFound); setScan(""); return; }
    setCounted(it.productId, (it.counted ?? 0) + 1);
    setScan("");
  }

  function exportSheet() {
    if (!active) return;
    const rows = active.items.map((it) => ({
      [t.col.product]: it.name, [t.col.sku]: it.sku, [t.col.barcode]: it.barcode,
      [t.col.systemQty]: it.systemQty, [t.col.countedQty]: it.counted ?? "", [t.col.variance]: variance(it),
      [t.col.note]: it.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Count");
    XLSX.writeFile(wb, `count-${active.name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function applyCorrection() {
    if (!active) return;
    const varianceItems = active.items.filter((it) => it.counted != null && it.counted !== it.systemQty);
    startTransition(async () => {
      let ok = 0;
      for (const it of varianceItems) {
        try { await adjustStock(it.productId, it.counted!, `${t.review.applyNote} · ${active.name}`); ok++; } catch { /* keep going */ }
      }
      updateActive((s) => ({ ...s, status: "completed" }));
      toast.success(t.review.applied.replace("{n}", String(ok)));
      if (ok < varianceItems.length) toast.error(t.review.applyError);
      setConfirmApply(false);
      setReviewing(false);
      setView("list");
    });
  }

  const statusBadge = (st: CountStatus) => {
    const map: Record<CountStatus, { label: string; cls: string }> = {
      draft: { label: t.status.draft, cls: "bg-slate-100 text-slate-600" },
      counting: { label: t.status.counting, cls: "bg-violet-100 text-violet-700" },
      review: { label: t.status.review, cls: "bg-amber-100 text-amber-700" },
      completed: { label: t.status.completed, cls: "bg-emerald-100 text-emerald-700" },
      cancelled: { label: t.status.cancelled, cls: "bg-rose-100 text-rose-700" },
    };
    return map[st];
  };

  // ── Summary for active session ──────────────────────────────────────────────
  const summary = useMemo(() => {
    const items = active?.items ?? [];
    let counted = 0, matched = 0, short = 0, over = 0, totalVar = 0;
    for (const it of items) {
      const st = vStatus(it);
      if (it.counted != null) counted++;
      if (st === "match") matched++; else if (st === "short") short++; else if (st === "over") over++;
      totalVar += variance(it);
    }
    return { total: items.length, counted, matched, short, over, totalVar };
  }, [active]);

  // ── Render: list ────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="w-full xl:px-2 2xl:px-4">
        <div className="my-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/inventory`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><ArrowLeft className="h-4 w-4" /></Link>
            <div><h2 className="text-lg font-bold text-slate-900">{t.title}</h2><p className="text-sm text-slate-500">{t.subtitle}</p></div>
          </div>
          <button type="button" onClick={() => setView("create")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"><Plus className="h-4 w-4" />{t.newSession}</button>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-16 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-violet-300" />
            <p className="mt-3 text-sm text-slate-500">{t.noSessions}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => {
              const sb = statusBadge(s.status);
              return (
                <div key={s.id} className="group flex flex-col rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => { setActiveId(s.id); setReviewing(false); setView("count"); }} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{dtf.format(new Date(s.createdAt))}</p>
                    </button>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${sb.cls}`}>{sb.label}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{s.items.length} {t.items}{s.warehouseName ? ` · ${s.warehouseName}` : ""}</span>
                    <button type="button" aria-label={t.deleteSession} title={t.deleteSession} onClick={() => setConfirmCancelId(s.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <ConfirmDialog cancelLabel={t.action.cancel} confirmLabel={t.deleteSession} danger icon={<Trash2 className="h-5 w-5 text-rose-600" />}
          isOpen={confirmCancelId !== null} onCancel={() => setConfirmCancelId(null)}
          onConfirm={() => { persist(sessions.filter((s) => s.id !== confirmCancelId)); setConfirmCancelId(null); }} title={t.deleteSession}>
          <p className="text-sm text-slate-600">{t.cancelConfirm}</p>
        </ConfirmDialog>
      </div>
    );
  }

  // ── Render: create ──────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="mx-auto w-full max-w-xl px-2 py-4">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={() => setView("list")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><ArrowLeft className="h-4 w-4" /></button>
          <h2 className="text-lg font-bold text-slate-900">{t.create.title}</h2>
        </div>
        <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <Field label={t.create.name} required>
            <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder={t.create.namePlaceholder} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.create.warehouse}>
              <select value={fWarehouse} onChange={(e) => setFWarehouse(e.target.value)} className={inputCls}>
                <option value="">{t.create.allWarehouses}</option>
                {(warehousesQuery.data ?? []).map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </Field>
            <Field label={t.create.zone}>
              <input value={fZone} onChange={(e) => setFZone(e.target.value)} placeholder={t.create.zonePlaceholder} className={inputCls} />
            </Field>
          </div>
          <Field label={t.create.category}>
            <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={inputCls}>
              <option value="">{t.create.allCategories}</option>
              {(categoriesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t.create.note}>
            <textarea rows={2} value={fNote} onChange={(e) => setFNote(e.target.value)} className={`${inputCls} resize-none`} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setView("list")} className="h-11 flex-1 rounded-xl border border-violet-200 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">{t.create.cancel}</button>
            <button type="button" disabled={!fName.trim() || productsQuery.isPending} onClick={startSession} className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">{t.create.start}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: count / review ──────────────────────────────────────────────────
  if (!active) return null; // the sync effect will switch back to the list view
  const rows = reviewing ? active.items.filter((it) => it.counted != null && it.counted !== it.systemQty) : active.items;
  const sb = statusBadge(active.status);
  const done = active.status === "completed";

  const SUMMARY = [
    { label: t.summary.totalItems, value: summary.total },
    { label: t.summary.counted, value: summary.counted },
    { label: t.summary.matched, value: summary.matched, tone: "text-emerald-600" },
    { label: t.summary.short, value: summary.short, tone: "text-rose-600" },
    { label: t.summary.over, value: summary.over, tone: "text-indigo-600" },
    { label: t.summary.totalVariance, value: `${summary.totalVar > 0 ? "+" : ""}${summary.totalVar}`, tone: summary.totalVar < 0 ? "text-rose-600" : summary.totalVar > 0 ? "text-indigo-600" : "text-slate-700" },
  ];

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Header */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setView("list")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h2 className="truncate text-lg font-bold text-slate-900">{active.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sb.cls}`}>{sb.label}</span></div>
            <p className="text-sm text-slate-500">{reviewing ? t.review.subtitle : t.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportSheet} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><Download className="h-4 w-4" />{t.action.export}</button>
          {!done && (reviewing
            ? <>
                <button type="button" onClick={() => setReviewing(false)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.action.continue}</button>
                <button type="button" disabled={summary.short + summary.over === 0} onClick={() => setConfirmApply(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"><ClipboardCheck className="h-4 w-4" />{t.action.apply}</button>
              </>
            : <button type="button" onClick={() => setReviewing(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700">{t.action.review}</button>)}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
        {SUMMARY.map((s) => (
          <div key={s.label} className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-0.5 text-xl font-black ${s.tone ?? "text-slate-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Scan */}
      {!reviewing && !done ? (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
            <input value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={handleScan} placeholder={t.scanPlaceholder}
              className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
        </div>
      ) : null}

      {/* Count table */}
      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-auto rounded-2xl" style={{ maxHeight: "62vh" }}>
          <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
            <colgroup><col style={{ width: "30%" }} /><col style={{ width: "13%" }} /><col style={{ width: "11%" }} /><col style={{ width: "15%" }} /><col style={{ width: "12%" }} /><col style={{ width: "19%" }} /></colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">{t.col.product}</th>
                <th className="px-3 py-3 font-bold">{t.col.barcode}</th>
                <th className="px-3 py-3 text-right font-bold">{t.col.systemQty}</th>
                <th className="px-3 py-3 font-bold">{t.col.countedQty}</th>
                <th className="px-3 py-3 font-bold">{t.col.variance}</th>
                <th className="px-3 py-3 font-bold">{t.col.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">{reviewing ? t.review.noVariance : t.empty}</td></tr>
              ) : rows.map((it, i) => {
                const v = variance(it); const st = vStatus(it);
                const vLabel = st === "match" ? t.variance.match : st === "short" ? t.variance.short : st === "over" ? t.variance.over : t.variance.notCounted;
                return (
                  <tr key={it.productId} className={i % 2 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="px-4 py-2.5"><p className="truncate text-sm font-semibold text-slate-800" title={it.name}>{it.name}</p><p className="truncate font-mono text-[11px] text-slate-400">{it.sku || "-"}</p></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{it.barcode || "—"}</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700">{it.systemQty}</td>
                    <td className="px-3 py-2.5">
                      <input type="number" min={0} disabled={done} value={it.counted ?? ""} placeholder="—"
                        onChange={(e) => setCounted(it.productId, e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-10 w-20 rounded-lg border border-violet-200 px-2 text-center text-sm font-bold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50" />
                    </td>
                    <td className={`px-3 py-2.5 text-sm font-bold tabular-nums ${v < 0 ? "text-rose-600" : v > 0 ? "text-indigo-600" : "text-slate-400"}`}>{it.counted == null ? "—" : `${v > 0 ? "+" : ""}${v}`}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${V_BADGE[st]}`}>{vLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog cancelLabel={t.action.cancel} confirmLabel={isPending ? t.action.applying : t.action.apply} danger={false} icon={<ClipboardCheck className="h-5 w-5 text-violet-600" />}
        isOpen={confirmApply} onCancel={() => setConfirmApply(false)} onConfirm={applyCorrection}
        title={t.action.apply}>
        <p className="text-sm text-slate-600">{t.review.applyConfirm.replace("{n}", String(active.items.filter((it) => it.counted != null && it.counted !== it.systemQty).length))}</p>
      </ConfirmDialog>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required ? <span className="text-rose-500"> *</span> : null}</label>
      {children}
    </div>
  );
}
