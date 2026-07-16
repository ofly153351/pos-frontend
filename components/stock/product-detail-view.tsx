"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Barcode as BarcodeIcon, History, Info, Layers, MapPin, Package, Pencil,
  Trash2, Warehouse,
} from "lucide-react";

import { generateBarcodeSvgByType } from "@/lib/barcode";
import { getCurrentStoreId } from "@/lib/store-storage";
import { listMovements } from "@/services/stock-movements";
import { getStoreById } from "@/services/stores";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockManagerDictionary } from "@/components/stock/types";
import type { Product } from "@/types/product";

type Tab = "general" | "barcode" | "inventory" | "movements";

type ProductDetailViewProps = {
  product: Product | null;
  dictionary: StockManagerDictionary;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onBarcode: (product: Product) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB", maximumFractionDigits: 0, minimumFractionDigits: 0, style: "currency",
  }).format(value);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseStorage(s?: string | null): { warehouse: string | null; zone: string | null; location: string | null } {
  const raw = s?.trim();
  if (!raw) return { warehouse: null, zone: null, location: null };
  const parts = raw.split(/[·>/]/).map((x) => x.trim()).filter(Boolean);
  return {
    warehouse: parts[0] ?? null,
    zone: parts[1] ?? null,
    location: parts.slice(2).join(" · ") || null,
  };
}

const MOVEMENT_TONE: Record<string, string> = {
  receive: "bg-emerald-100 text-emerald-700",
  sale: "bg-indigo-100 text-indigo-700",
  adjust: "bg-amber-100 text-amber-700",
  transfer: "bg-violet-100 text-violet-700",
  return: "bg-rose-100 text-rose-700",
};
function movementTone(type: string): string {
  return MOVEMENT_TONE[type?.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// ── Presentational cards ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-violet-200 bg-violet-50/50" : "border-slate-100 bg-slate-50"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black leading-tight ${accent ? "text-violet-700" : "text-slate-900"}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs font-medium text-slate-400">{sub}</p> : null}
    </div>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm leading-[1.5] text-slate-800 ${mono ? "" : ""}`}>
        {value ?? <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

function StatPill({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone ?? "bg-violet-100 text-violet-600"}`}>{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="truncate text-sm font-bold text-slate-800">{value}</span>
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductDetailView({ product, dictionary, onClose, onEdit, onDelete, onBarcode }: ProductDetailViewProps) {
  const t = dictionary.table;
  const f = dictionary.form;
  const [tab, setTab] = useState<Tab>("general");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setTab("general"); setConfirmDelete(false); }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [product, onClose]);

  const movementsQuery = useQuery({
    enabled: Boolean(product) && tab === "movements",
    queryKey: ["stock", "movements", product?.id],
    queryFn: async () => (await listMovements(product!.id, 1, 50)).data,
  });

  const storeQuery = useQuery({
    enabled: Boolean(product) && tab === "barcode",
    queryKey: ["store", "detail-current"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const id = getCurrentStoreId();
      if (!id) return null;
      return (await getStoreById(id)).data;
    },
  });

  if (!product) return null;

  const categoryName = product.product_type_name ?? product.product_type?.name ?? null;
  const brandName = product.brand_name ?? null;
  const unitName = product.product_unit_name ?? null;
  const location = product.storage_location?.trim() || null;
  const storage = parseStorage(location);
  const code = (product.barcode ?? product.sku ?? "").trim();
  const barcodeSvg = code ? generateBarcodeSvgByType(code, "code128", true) : "";
  const storeName = storeQuery.data?.name ?? null;

  const stock = product.total_stock ?? 0;
  const reserved = 0;
  const damaged = 0;
  const available = Math.max(0, stock - reserved);
  const cost = product.cost_price != null ? Number(product.cost_price) : null;
  const selling = Number(product.base_price ?? 0);
  const profit = cost != null ? selling - cost : null;
  const margin = cost != null && selling > 0 ? Math.round((selling - cost) / selling * 100) : null;

  const health: "ready" | "low" | "out" | "unknown" =
    product.total_stock == null ? "unknown"
      : stock <= 0 ? "out"
        : product.min_stock != null && product.min_stock > 0 && stock <= product.min_stock ? "low"
          : "ready";
  const status = !product.is_active
    ? { label: t.statusInactive, cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" }
    : health === "out" ? { label: t.statusOut, cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" }
      : health === "low" ? { label: t.statusLow, cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" }
        : { label: t.statusReady, cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  const stockTone = health === "out" ? "bg-rose-100 text-rose-600" : health === "low" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600";

  const TABS: Array<{ key: Tab; label: string; icon: typeof Info }> = [
    { key: "general", label: t.detailTabGeneral, icon: Info },
    { key: "barcode", label: t.detailTabBarcode, icon: BarcodeIcon },
    { key: "inventory", label: t.detailTabInventory, icon: Package },
    { key: "movements", label: t.detailTabMovements, icon: History },
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">

        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <ArrowLeft className="h-4 w-4" /> {t.detailBack}
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onBarcode(product)} disabled={!code}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
              <BarcodeIcon className="h-4 w-4" /> {t.barcodeAction}
            </button>
            <button type="button" onClick={() => onEdit(product)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
              <Pencil className="h-4 w-4" /> {t.editAction}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
              <Trash2 className="h-4 w-4" /> {t.deleteAction}
            </button>
          </div>
        </div>

        {/* Hero — image + identity + dense stat strip */}
        <div className="mb-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-slate-100">
                {product.image_url ? (
                  <img alt={product.name} className="h-full w-full object-cover" src={product.image_url} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-violet-400">{product.name.slice(0, 2).toUpperCase()}</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold leading-[1.5] text-slate-900">{product.name}</h1>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-400">
                  {product.sku ? <span className="">{t.sku}: <span className="text-slate-600">{product.sku}</span></span> : null}
                  {code ? <span className="">{t.barcode}: <span className="text-slate-600">{code}</span></span> : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {categoryName ? <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{categoryName}</span> : null}
                  {brandName ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{brandName}</span> : null}
                </div>
              </div>
            </div>
            {/* Stat strip */}
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
              <StatPill icon={<span className="text-sm font-black">฿</span>} label={t.sellingPrice} value={formatCurrency(selling)} />
              <StatPill icon={<Package className="h-4 w-4" />} label={t.stock} value={`${stock}${unitName ? ` ${unitName}` : ""}`} tone={stockTone} />
              <StatPill icon={<Layers className="h-4 w-4" />} label={f.minStockLabel} value={product.min_stock ?? "—"} />
              <StatPill icon={<MapPin className="h-4 w-4" />} label={t.location} value={storage.location ?? storage.warehouse ?? "—"} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-violet-100 bg-white p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-violet-50"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── General ───────────────────────────────────────────────────────── */}
        {tab === "general" ? (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label={t.stock} value={<>{stock}<span className="ml-1 text-sm font-medium text-slate-400">{unitName ?? ""}</span></>} sub={product.min_stock != null ? `${f.minStockLabel} ${product.min_stock}` : undefined} />
              <KpiCard label={t.costPrice} value={cost != null ? formatCurrency(cost) : "—"} />
              <KpiCard label={t.sellingPrice} value={formatCurrency(selling)} />
              <KpiCard label={t.detailProfit} value={profit != null ? formatCurrency(profit) : "—"} sub={margin != null ? `${margin}%` : undefined} accent />
            </div>
            {/* Product information */}
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-800">{t.detailProductInfo}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label={f.nameLabel} value={product.name} />
                <InfoCard label={t.sku} value={product.sku} mono />
                <InfoCard label={t.barcode} value={code || null} mono />
                <InfoCard label={t.category} value={categoryName} />
                <InfoCard label={f.brandLabel} value={brandName} />
                <InfoCard label={f.unitTypeLabel} value={unitName} />
                <InfoCard label={t.status} value={status.label} />
                <InfoCard label={t.location} value={location} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoCard label={f.descriptionLabel} value={product.description?.trim() || null} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Barcode ───────────────────────────────────────────────────────── */}
        {tab === "barcode" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              {barcodeSvg ? (
                <>
                  <img alt={code} className="max-h-40 max-w-full" src={`data:image/svg+xml;utf8,${encodeURIComponent(barcodeSvg)}`} />
                  <p className="text-sm font-semibold text-violet-700">{code}</p>
                  <button type="button" onClick={() => onBarcode(product)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
                    <BarcodeIcon className="h-4 w-4" /> {t.barcodePreviewTitle}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <BarcodeIcon className="h-10 w-10 opacity-30" />
                  <p className="text-sm">{t.noBarcodeLabel}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard label={t.barcode} value={code || null} mono />
              <InfoCard label={t.barcodeTypeLabel} value={t.barcodeTypeCode128} />
              <InfoCard label={t.barcodeTemplateLabel} value={t.barcodeTemplateMedium} />
              <InfoCard label={t.barcodeShowStoreName} value={storeName} />
              <InfoCard label={t.detailLastPrinted} value={<span className="text-slate-400">{t.detailNever}</span>} />
              <InfoCard label={t.detailPrintCount} value={<span className="text-slate-400">0</span>} />
            </div>
          </div>
        ) : null}

        {/* ── Inventory ─────────────────────────────────────────────────────── */}
        {tab === "inventory" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <KpiCard label={t.stock} value={stock} accent />
              <KpiCard label={t.detailReserved} value={<span className="text-slate-300">{reserved}</span>} />
              <KpiCard label={t.detailDamaged} value={<span className="text-slate-300">{damaged}</span>} />
              <KpiCard label={t.detailAvailable} value={available} />
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.status}</p>
                <p className="mt-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span></p>
              </div>
            </div>
            {/* Storage hierarchy */}
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-800">{t.detailStorageHierarchy}</p>
              {storage.warehouse ? (
                <div className="flex flex-wrap items-stretch gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
                    <Warehouse className="h-4 w-4 text-violet-500" />
                    <span className="flex flex-col"><span className="text-[10px] font-semibold uppercase text-slate-400">{t.detailWarehouse}</span><span className="text-sm font-bold text-slate-800">{storage.warehouse}</span></span>
                  </div>
                  {storage.zone ? (
                    <>
                      <span className="self-center text-slate-300">›</span>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <Layers className="h-4 w-4 text-violet-500" />
                        <span className="flex flex-col"><span className="text-[10px] font-semibold uppercase text-slate-400">{t.detailZone}</span><span className="text-sm font-bold text-slate-800">{storage.zone}</span></span>
                      </div>
                    </>
                  ) : null}
                  {storage.location ? (
                    <>
                      <span className="self-center text-slate-300">›</span>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <MapPin className="h-4 w-4 text-violet-500" />
                        <span className="flex flex-col"><span className="text-[10px] font-semibold uppercase text-slate-400">{t.location}</span><span className="text-sm font-bold text-slate-800">{storage.location}</span></span>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t.noLocation}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Movement history ──────────────────────────────────────────────── */}
        {tab === "movements" ? (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            {movementsQuery.isPending ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-100" />)}</div>
            ) : (movementsQuery.data?.items?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <History className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t.detailNoMovements}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2.5 font-bold">{t.detailMovementType}</th>
                      <th className="px-3 py-2.5 text-right font-bold">{t.detailMovementQty}</th>
                      <th className="px-3 py-2.5 font-bold">{t.detailMovementDate}</th>
                      <th className="px-3 py-2.5 font-bold">{t.detailMovementBy}</th>
                      <th className="px-3 py-2.5 font-bold">{t.detailMovementNote}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {movementsQuery.data!.items.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5"><span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${movementTone(m.type)}`}>{m.type}</span></td>
                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${m.quantity_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.quantity_change >= 0 ? "+" : ""}{m.quantity_change}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{formatDate(m.created_at)}</td>
                        <td className="px-3 py-2.5 text-slate-500">{m.created_by_name || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-500">{m.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        cancelLabel={t.cancel}
        confirmLabel={t.deleteAction}
        danger
        icon={<Trash2 className="h-5 w-5 text-rose-600" />}
        isOpen={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(product.id); onClose(); }}
        title={t.deleteConfirmTitle}
      >
        <p className="text-sm text-slate-600">{t.deleteConfirmBody}</p>
      </ConfirmDialog>
    </div>
  );
}
