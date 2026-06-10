"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeftRight,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Eye,
  History,
  Layers,
  MoreVertical,
  PackagePlus,
  PackageX,
  RotateCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  TrendingDown,
  X,
} from "lucide-react";

import { listProducts } from "@/services/products";
import { listMovements } from "@/services/stock-movements";
import { StockAdjustDrawer } from "@/components/stock/stock-adjust-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryDictionary } from "@/components/stock/inventory-types";
import type { Product } from "@/types/product";

type Props = { dictionary: InventoryDictionary; locale: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { currency: "THB", maximumFractionDigits: 0, style: "currency" }).format(value);
}

// ── Status system (4 states) ──────────────────────────────────────────────────
type Status = "ready" | "low" | "out" | "inactive";

function getStatus(p: Product): Status {
  if (!p.is_active) return "inactive";
  const s = p.total_stock ?? 0;
  if (s <= 0) return "out";
  if (p.min_stock != null && s <= p.min_stock) return "low";
  return "ready";
}

function getStockPercent(p: Product): number {
  const s = p.total_stock ?? 0;
  if (s <= 0) return 0;
  if (p.max_stock != null && p.max_stock > 0) return Math.max(4, Math.min(100, Math.round((s / p.max_stock) * 100)));
  if (p.min_stock != null && p.min_stock > 0) return Math.max(4, Math.min(100, Math.round((s / (p.min_stock * 2)) * 100)));
  return 100;
}

const STATUS_BAR: Record<Status, string> = {
  ready: "bg-emerald-500", low: "bg-amber-500", out: "bg-rose-500", inactive: "bg-slate-300",
};

function productValue(p: Product): number {
  return (p.cost_price ?? p.base_price ?? 0) * (p.total_stock ?? 0);
}

// ── Movement type → label / tone / icon ──────────────────────────────────────
type MovementKind = "receive" | "sale" | "adjust" | "transfer" | "countCorrection" | "return";

function movementKind(type: string): MovementKind {
  const k = (type ?? "").toLowerCase();
  if (k.includes("count")) return "countCorrection";
  if (k.includes("receive") || k.includes("add") || k === "in") return "receive";
  if (k.includes("sale") || k.includes("sell")) return "sale";
  if (k.includes("transfer")) return "transfer";
  if (k.includes("return")) return "return";
  // Backend "OUT" = manual non-sale stock issue → falls under the Adjustment bucket.
  return "adjust";
}

const MOVEMENT_TONE: Record<MovementKind, string> = {
  receive: "bg-emerald-100 text-emerald-700",
  sale: "bg-indigo-100 text-indigo-700",
  adjust: "bg-amber-100 text-amber-700",
  transfer: "bg-violet-100 text-violet-700",
  countCorrection: "bg-teal-100 text-teal-700",
  return: "bg-rose-100 text-rose-700",
};

const MOVEMENT_ICON: Record<MovementKind, typeof PackagePlus> = {
  receive: PackagePlus,
  sale: ShoppingCart,
  adjust: SlidersHorizontal,
  transfer: ArrowLeftRight,
  countCorrection: ClipboardCheck,
  return: RotateCcw,
};

// Localize common backend movement notes to Thai (retail-staff readable).
function localizeNote(note: string | undefined, locale: string): string {
  const s = (note ?? "").trim();
  if (!s || locale !== "th") return s;
  const adj = s.match(/adjusted from\s+(\d+)\s+to\s+(\d+)/i);
  if (adj) return `ปรับจาก ${adj[1]} เป็น ${adj[2]}`;
  if (/^sale deduction$/i.test(s)) return ""; // type label already says "ขายสินค้า"
  if (/^stock addition$/i.test(s) || /^received/i.test(s)) return "รับสินค้าเข้า";
  return s;
}

export function InventoryManager({ dictionary, locale }: Props) {
  const t = dictionary;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "ready" | "low" | "out">("all");
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

  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const movements = useMemo(() => movementsQuery.data?.items ?? [], [movementsQuery.data]);

  // KPIs — Total SKU · Available Units · Inventory Value · Low Stock · Out Of Stock
  const kpis = useMemo(() => {
    let availableUnits = 0, value = 0, low = 0, out = 0;
    for (const p of products) {
      const st = getStatus(p);
      if (st === "low") low++;
      if (st === "out") out++;
      // Disabled products aren't available for sale — exclude from units & value.
      if (st === "inactive") continue;
      availableUnits += Math.max(0, p.total_stock ?? 0);
      value += productValue(p);
    }
    return { totalSku: productsQuery.data?.total ?? products.length, availableUnits, value, low, out };
  }, [products, productsQuery.data]);

  // Status counts for filter tabs
  const counts = useMemo(() => {
    let ready = 0, low = 0, out = 0;
    for (const p of products) {
      const st = getStatus(p);
      if (st === "ready") ready++;
      else if (st === "low") low++;
      else if (st === "out") out++;
    }
    return { all: products.length, ready, low, out };
  }, [products]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return products.filter((p) => {
      if (tab !== "all" && getStatus(p) !== tab) return false;
      if (!kw) return true;
      return (
        p.name.toLowerCase().includes(kw) ||
        (p.sku ?? "").toLowerCase().includes(kw) ||
        (p.barcode ?? "").toLowerCase().includes(kw)
      );
    });
  }, [products, search, tab]);

  function statusBadge(st: Status) {
    const map: Record<Status, { label: string; cls: string; dot: string }> = {
      ready: { label: t.status.ready, cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
      low: { label: t.status.low, cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
      out: { label: t.status.out, cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
      inactive: { label: t.status.inactive, cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    };
    return map[st];
  }

  const KPIS = [
    { label: t.kpi.totalSku, value: kpis.totalSku.toLocaleString(), icon: Layers, tone: "bg-violet-100 text-violet-600" },
    { label: t.kpi.availableUnits, value: kpis.availableUnits.toLocaleString(), icon: Boxes, tone: "bg-indigo-100 text-indigo-600" },
    { label: t.kpi.stockValue, value: formatCurrency(kpis.value), icon: Coins, tone: "bg-emerald-100 text-emerald-600" },
    { label: t.kpi.lowStock, value: kpis.low.toLocaleString(), icon: TrendingDown, tone: "bg-amber-100 text-amber-600" },
    { label: t.kpi.outOfStock, value: kpis.out.toLocaleString(), icon: PackageX, tone: "bg-rose-100 text-rose-600" },
  ];

  const TABS: Array<{ key: "all" | "ready" | "low" | "out"; label: string; count: number; active: string }> = [
    { key: "all", label: t.filter.all, count: counts.all, active: "border-violet-500 bg-violet-50 text-violet-700" },
    { key: "ready", label: t.filter.ready, count: counts.ready, active: "border-emerald-500 bg-emerald-50 text-emerald-700" },
    { key: "low", label: t.filter.low, count: counts.low, active: "border-amber-500 bg-amber-50 text-amber-700" },
    { key: "out", label: t.filter.out, count: counts.out, active: "border-rose-500 bg-rose-50 text-rose-700" },
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
        <CountMenu locale={locale} openLabel={t.openCount} startLabel={t.countMenu.start} historyLabel={t.countMenu.history} />
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

      {/* Filter tabs + search */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tb) => (
            <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
                tab === tb.key ? tb.active : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}>
              {tb.label}
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                tab === tb.key ? "bg-white/70 text-slate-700" : "bg-slate-100 text-slate-500"
              }`}>{tb.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search}
            className="h-10 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
      </div>

      {/* Main grid: table (left) + activity feed (right) */}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Table */}
        <section className="min-w-0 rounded-2xl bg-white shadow-sm">
          <div className="overflow-auto rounded-2xl" style={{ maxHeight: "70vh" }}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 font-bold">{t.col.product}</th>
                  <th className="px-4 py-3.5 font-bold">{t.col.available}</th>
                  <th className="hidden px-3 py-3.5 font-bold sm:table-cell">{t.col.minStock}</th>
                  <th className="px-4 py-3.5 font-bold">{t.col.status}</th>
                  <th className="hidden px-4 py-3.5 text-right font-bold md:table-cell">{t.col.stockValue}</th>
                  <th className="px-3 py-3.5 text-right font-bold">{t.col.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg bg-slate-200" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32 bg-slate-200" /><Skeleton className="h-3 w-20 bg-slate-100" /></div></div></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20 bg-slate-100" /></td>
                      <td className="hidden px-3 py-3 sm:table-cell"><Skeleton className="h-4 w-8 bg-slate-100" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full bg-slate-100" /></td>
                      <td className="hidden px-4 py-3 md:table-cell"><Skeleton className="ml-auto h-4 w-16 bg-slate-100" /></td>
                      <td className="px-3 py-3"><Skeleton className="ml-auto h-8 w-20 bg-slate-100" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">{t.empty}</td></tr>
                ) : filtered.map((p, i) => {
                  const st = getStatus(p);
                  const unit = p.product_unit_name ?? "";
                  const sb = statusBadge(st);
                  return (
                    <tr key={p.id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} transition hover:bg-violet-50/40`}>
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {p.image_url ? // eslint-disable-next-line @next/next/no-img-element
                              <img alt={p.name} className="h-full w-full object-cover" loading="lazy" src={p.image_url} />
                              : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">{p.name.slice(0, 2).toUpperCase()}</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900" title={p.name}>{p.name}</p>
                            <p className="truncate font-mono text-[11px] text-slate-400">{p.sku ?? "-"}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      {/* Stock + subtle bar */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-bold ${st === "out" ? "text-rose-700" : st === "low" ? "text-amber-700" : "text-slate-900"}`}>{p.total_stock ?? 0}{unit ? ` ${unit}` : ""}</span>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${STATUS_BAR[st]} opacity-70`} style={{ width: `${getStockPercent(p)}%` }} /></div>
                        </div>
                      </td>
                      {/* Min stock */}
                      <td className="hidden px-3 py-3 text-sm font-medium text-slate-500 sm:table-cell">{p.min_stock != null ? p.min_stock : "—"}</td>
                      {/* Status */}
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sb.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${sb.dot}`} />{sb.label}</span></td>
                      {/* Stock value */}
                      <td className="hidden px-4 py-3 text-right text-sm font-bold tabular-nums text-slate-800 md:table-cell">{formatCurrency(productValue(p))}</td>
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <RowActions
                          labels={t.action}
                          onAdjust={() => setAdjusting(p)}
                          onHistory={() => setHistoryProduct(p)}
                          onViewProduct={() => router.push(`/${locale}/stock?product=${p.id}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity feed */}
        <aside className="min-w-0 rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Activity className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{t.activity.title}</p>
              <p className="truncate text-xs text-slate-400">{t.activity.subtitle}</p>
            </div>
          </div>
          <div className="overflow-y-auto p-2" style={{ maxHeight: "calc(70vh - 60px)" }}>
            {movementsQuery.isPending ? (
              <div className="space-y-2 p-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl bg-slate-100" />)}</div>
            ) : movements.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t.activity.empty}</p>
            ) : (
              <ul className="space-y-1">
                {movements.slice(0, 50).map((mv) => {
                  const kind = movementKind(mv.type);
                  const Icon = MOVEMENT_ICON[kind];
                  const positive = mv.quantity_change >= 0;
                  return (
                    <li key={mv.id} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${MOVEMENT_TONE[kind]}`}><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800" title={mv.product_name}>{mv.product_name || "—"}</span>
                          <span className={`shrink-0 text-sm font-bold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>{positive ? "+" : ""}{mv.quantity_change}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {t.activity.types[kind]}{mv.created_by_name ? ` · ${mv.created_by_name}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{dtf.format(new Date(mv.created_at))}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <StockAdjustDrawer
        product={adjusting}
        dict={t.adjust}
        onClose={() => setAdjusting(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
          queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
        }}
      />

      <HistoryModal product={historyProduct} dtf={dtf} dict={t} locale={locale} onClose={() => setHistoryProduct(null)} />
    </div>
  );
}

// ── Stock-count split button (Start Count / Count History) ────────────────────

function CountMenu({ locale, openLabel, startLabel, historyLabel }: { locale: string; openLabel: string; startLabel: string; historyLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700">
        <ClipboardCheck className="h-4 w-4" /> {openLabel}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-52 overflow-hidden rounded-xl border border-violet-100 bg-white p-1 shadow-2xl">
          <Link href={`/${locale}/inventory/counts?new=1`} role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-violet-50">
            <ClipboardCheck className="h-4 w-4 text-violet-500" /> {startLabel}
          </Link>
          <Link href={`/${locale}/inventory/counts`} role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-violet-50">
            <History className="h-4 w-4 text-violet-500" /> {historyLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// ── Row actions: light [Adjust] + ... dropdown (View History / View Details) ──

function RowActions({
  labels, onAdjust, onHistory, onViewProduct,
}: {
  labels: InventoryDictionary["action"];
  onAdjust: () => void;
  onHistory: () => void;
  onViewProduct: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      // Menu is a fixed-positioned sibling of the trigger — exclude BOTH from the
      // outside-close check, else mousedown on a menu item closes it before onClick fires.
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" onClick={onAdjust}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <SlidersHorizontal className="h-3.5 w-3.5" /> {labels.adjust}
      </button>
      <button ref={btnRef} type="button" onClick={toggle} title={labels.more} aria-label={labels.more} aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && pos ? (
        <div ref={menuRef} role="menu" style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 60 }}
          className="w-44 overflow-hidden rounded-xl border border-violet-100 bg-white p-1 shadow-2xl">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onHistory(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50">
            <History className="h-4 w-4 text-violet-500" /> {labels.history}
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onViewProduct(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50">
            <Eye className="h-4 w-4 text-violet-500" /> {labels.viewProduct}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Movement-history modal — Thai-localized, list format ──────────────────────

function HistoryModal({ product, dtf, dict, locale, onClose }: { product: Product | null; dtf: Intl.DateTimeFormat; dict: InventoryDictionary; locale: string; onClose: () => void }) {
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
      <div className="my-8 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2"><History className="h-5 w-5 shrink-0 text-violet-600" /><h3 className="text-base font-bold text-slate-900">{dict.action.history}</h3>
            <span className="truncate rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{product.name}</span></div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {q.isPending ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-100" />)}</div>
            : items.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">{dict.noMovement}</p>
              : <ul className="space-y-3">
                {items.map((m) => {
                  const kind = movementKind(m.type);
                  const note = localizeNote(m.note, locale);
                  const positive = m.quantity_change >= 0;
                  return (
                    <li key={m.id} className="flex flex-col gap-0.5 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-800">{dict.activity.types[kind]}</span>
                        <span className={`text-sm font-bold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>{positive ? "+" : ""}{m.quantity_change}</span>
                      </div>
                      <span className="text-xs text-slate-400">{dtf.format(new Date(m.created_at))}</span>
                      {note ? <span className="text-xs text-slate-500">{note}</span> : null}
                    </li>
                  );
                })}
              </ul>}
        </div>
      </div>
    </div>
  );
}
