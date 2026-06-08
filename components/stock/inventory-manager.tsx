"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes, ClipboardCheck, ExternalLink, History, MapPin, Package, PackageX, Search, SlidersHorizontal, TrendingDown, X,
} from "lucide-react";

import { listProducts } from "@/services/products";
import { listMovements, type StockMovement } from "@/services/stock-movements";
import { StockAdjustDrawer } from "@/components/stock/stock-adjust-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryDictionary } from "@/components/stock/inventory-types";
import type { Product } from "@/types/product";

type Props = { dictionary: InventoryDictionary; locale: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { currency: "THB", maximumFractionDigits: 0, style: "currency" }).format(value);
}

type Health = "ready" | "low" | "out" | "over" | "inactive";
function getHealth(p: Product): Health {
  if (!p.is_active) return "inactive";
  const s = p.total_stock ?? 0;
  if (s <= 0) return "out";
  if (p.min_stock != null && p.min_stock > 0 && s <= p.min_stock) return "low";
  if (p.max_stock != null && p.max_stock > 0 && s > p.max_stock) return "over";
  return "ready";
}
function getStockPercent(p: Product): number {
  const s = p.total_stock ?? 0;
  if (s <= 0) return 0;
  if (p.max_stock != null && p.max_stock > 0) return Math.max(4, Math.min(100, Math.round((s / p.max_stock) * 100)));
  if (p.min_stock != null && p.min_stock > 0) return Math.max(4, Math.min(100, Math.round((s / (p.min_stock * 2)) * 100)));
  return 100;
}
const HEALTH_BAR: Record<Exclude<Health, "inactive">, string> = {
  ready: "bg-emerald-500", low: "bg-amber-500", out: "bg-rose-400", over: "bg-indigo-500",
};

function parseStorage(s?: string | null) {
  const raw = s?.trim();
  if (!raw) return null;
  const parts = raw.split(/[·>/]/).map((x) => x.trim()).filter(Boolean);
  return { warehouse: parts[0] ?? null, zone: parts[1] ?? null, location: parts.slice(2).join(" · ") || null };
}

const MOVEMENT_TONE: Record<string, string> = {
  receive: "bg-emerald-100 text-emerald-700", sale: "bg-indigo-100 text-indigo-700",
  adjust: "bg-amber-100 text-amber-700", transfer: "bg-violet-100 text-violet-700", return: "bg-rose-100 text-rose-700",
};

export function InventoryManager({ dictionary, locale }: Props) {
  const t = dictionary;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const dtf = useMemo(() => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), [locale]);

  const productsQuery = useQuery({
    queryKey: ["inventory", "products"],
    queryFn: async () => (await listProducts({ limit: 9999, page: 1 })).data,
  });
  const movementsQuery = useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: async () => (await listMovements(undefined, 1, 300)).data,
  });

  const products = productsQuery.data?.items ?? [];
  const lastByProduct = useMemo(() => {
    const m = new Map<string, StockMovement>();
    for (const mv of movementsQuery.data?.items ?? []) if (!m.has(mv.product_id)) m.set(mv.product_id, mv);
    return m;
  }, [movementsQuery.data]);

  const kpis = useMemo(() => {
    let low = 0, out = 0, value = 0;
    for (const p of products) {
      const h = getHealth(p);
      if (h === "low") low++;
      if (h === "out") out++;
      value += (p.cost_price ?? p.base_price ?? 0) * (p.total_stock ?? 0);
    }
    const today = new Date().toDateString();
    const movesToday = (movementsQuery.data?.items ?? []).filter((mv) => {
      try { return new Date(mv.created_at).toDateString() === today; } catch { return false; }
    }).length;
    return { total: productsQuery.data?.total ?? products.length, low, out, value, movesToday };
  }, [products, movementsQuery.data, productsQuery.data]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(kw) || (p.sku ?? "").toLowerCase().includes(kw) || (p.barcode ?? "").toLowerCase().includes(kw));
  }, [products, search]);

  function statusBadge(p: Product) {
    const h = getHealth(p);
    const map: Record<Health, { label: string; cls: string; dot: string }> = {
      ready: { label: t.status.ready, cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
      low: { label: t.status.low, cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
      out: { label: t.status.out, cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
      over: { label: t.status.over, cls: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
      inactive: { label: t.status.inactive, cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    };
    return map[h];
  }

  const KPIS = [
    { label: t.kpi.totalProducts, value: kpis.total.toLocaleString(), icon: Boxes, tone: "bg-violet-100 text-violet-600" },
    { label: t.kpi.lowStock, value: kpis.low, icon: TrendingDown, tone: "bg-amber-100 text-amber-600" },
    { label: t.kpi.outOfStock, value: kpis.out, icon: PackageX, tone: "bg-rose-100 text-rose-600" },
    { label: t.kpi.stockValue, value: formatCurrency(kpis.value), icon: Package, tone: "bg-emerald-100 text-emerald-600" },
    { label: t.kpi.movementsToday, value: kpis.movesToday, icon: History, tone: "bg-indigo-100 text-indigo-600" },
  ];

  const isPending = productsQuery.isPending;

  return (
    <div className="w-full xl:px-2 2xl:px-4">
      {/* Header */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <Link href={`/${locale}/inventory/counts`}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700">
          <ClipboardCheck className="h-4 w-4" /> {t.openCount}
        </Link>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.tone}`}><k.icon className="h-4 w-4" /></span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.label}</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search}
            className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
      </div>

      {/* Table */}
      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-auto rounded-2xl" style={{ maxHeight: "68vh" }}>
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "24%" }} /><col style={{ width: "15%" }} /><col style={{ width: "9%" }} />
              <col style={{ width: "11%" }} /><col style={{ width: "15%" }} /><col style={{ width: "14%" }} /><col style={{ width: "12%" }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 font-bold">{t.col.product}</th>
                <th className="px-4 py-3.5 font-bold">{t.col.currentStock}</th>
                <th className="px-3 py-3.5 font-bold">{t.col.minStock}</th>
                <th className="px-4 py-3.5 font-bold">{t.col.status}</th>
                <th className="px-4 py-3.5 font-bold">{t.col.location}</th>
                <th className="px-4 py-3.5 font-bold">{t.col.lastMovement}</th>
                <th className="px-2 py-3.5 text-right font-bold">{t.col.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg bg-slate-200" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32 bg-slate-200" /><Skeleton className="h-3 w-20 bg-slate-100" /></div></div></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-full bg-slate-100" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-10 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 bg-slate-100" /></td>
                    <td className="px-2 py-3"><Skeleton className="ml-auto h-8 w-24 bg-slate-100" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">{t.empty}</td></tr>
              ) : filtered.map((p, i) => {
                const health = getHealth(p);
                const unit = p.product_unit_name ?? "";
                const loc = parseStorage(p.storage_location);
                const sb = statusBadge(p);
                const mv = lastByProduct.get(p.id);
                return (
                  <tr key={p.id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} transition hover:bg-violet-50/40`}>
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {p.image_url ? <img alt={p.name} className="h-full w-full object-cover" loading="lazy" src={p.image_url} />
                            : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">{p.name.slice(0, 2).toUpperCase()}</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900" title={p.name}>{p.name}</p>
                          <p className="truncate font-mono text-[11px] text-slate-400">{p.sku ?? "-"}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    {/* Current stock + bar */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-bold ${health === "out" ? "text-rose-700" : health === "low" ? "text-amber-700" : "text-slate-900"}`}>{p.total_stock ?? 0}{unit ? ` ${unit}` : ""}</span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${health === "inactive" ? "bg-slate-300" : HEALTH_BAR[health]}`} style={{ width: `${getStockPercent(p)}%` }} /></div>
                      </div>
                    </td>
                    {/* Min */}
                    <td className="px-3 py-3 text-sm font-medium text-slate-500">{p.min_stock != null ? p.min_stock : "—"}</td>
                    {/* Status */}
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sb.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${sb.dot}`} />{sb.label}</span></td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      {loc ? (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-mono text-xs font-bold text-slate-700">{loc.location ?? loc.zone ?? loc.warehouse}</span>
                            <span className="truncate text-[11px] text-slate-400">{[loc.warehouse, loc.zone].filter(Boolean).join(" · ")}</span>
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-300">{t.unassigned}</span>}
                    </td>
                    {/* Last movement */}
                    <td className="px-4 py-3">
                      {mv ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center gap-1">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${MOVEMENT_TONE[mv.type?.toLowerCase()] ?? "bg-slate-100 text-slate-600"}`}>{mv.type}</span>
                            <span className={`text-xs font-bold ${mv.quantity_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{mv.quantity_change >= 0 ? "+" : ""}{mv.quantity_change}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">{dtf.format(new Date(mv.created_at))}</span>
                        </div>
                      ) : <span className="text-xs text-slate-300">{t.noMovement}</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title={t.action.adjust} aria-label={t.action.adjust} onClick={() => setAdjusting(p)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                          <SlidersHorizontal className="h-[18px] w-[18px]" />
                        </button>
                        <button type="button" title={t.action.history} aria-label={t.action.history} onClick={() => setHistoryProduct(p)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                          <History className="h-[18px] w-[18px]" />
                        </button>
                        <button type="button" title={t.action.viewProduct} aria-label={t.action.viewProduct} onClick={() => router.push(`/${locale}/stock`)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
                          <ExternalLink className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <StockAdjustDrawer
        product={adjusting}
        dict={t.adjust}
        onClose={() => setAdjusting(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
          queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
        }}
      />

      <HistoryModal product={historyProduct} dtf={dtf} dict={t} onClose={() => setHistoryProduct(null)} />
    </div>
  );
}

// ── Inline movement-history modal ─────────────────────────────────────────────

function HistoryModal({ product, dtf, dict, onClose }: { product: Product | null; dtf: Intl.DateTimeFormat; dict: InventoryDictionary; onClose: () => void }) {
  const q = useQuery({
    enabled: Boolean(product),
    queryKey: ["inventory", "history", product?.id],
    queryFn: async () => (await listMovements(product!.id, 1, 50)).data,
  });
  if (!product) return null;
  const items = q.data?.items ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
          <div className="flex items-center gap-2"><History className="h-5 w-5 text-violet-600" /><h3 className="text-base font-bold text-slate-900">{dict.action.history}</h3>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{product.name}</span></div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {q.isPending ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-100" />)}</div>
            : items.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">{dict.noMovement}</p>
              : <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-50">
                  {items.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${MOVEMENT_TONE[m.type?.toLowerCase()] ?? "bg-slate-100 text-slate-600"}`}>{m.type}</span></td>
                      <td className={`py-2.5 pr-2 text-right font-bold tabular-nums ${m.quantity_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.quantity_change >= 0 ? "+" : ""}{m.quantity_change}</td>
                      <td className="py-2.5 pr-2 text-slate-500">{dtf.format(new Date(m.created_at))}</td>
                      <td className="py-2.5 text-slate-500">{m.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      </div>
    </div>
  );
}
