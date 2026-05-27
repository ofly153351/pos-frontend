"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Package, Plus, Search,
  ShoppingBag, TrendingUp, X, XCircle,
} from "lucide-react";

import { ReceiveModal } from "@/components/purchasing/receive-modal";
import { cancelPurchaseOrder, listPurchaseOrders, type PurchaseOrder } from "@/services/purchases";
import { toast } from "@/components/ui/toast";

type StatusFilter = "all" | "pending" | "partial" | "completed" | "cancelled";

type Dict = {
  purchaseOrders: string;
  createOrder: string;
  orderNumber: string;
  supplierName: string;
  date: string;
  totalCost: string;
  status: string;
  pending: string;
  partial: string;
  completed: string;
  cancelled: string;
  receiveStock: string;
  cancelOrder: string;
  emptyOrders: string;
  loading: string;
  tableActions: string;
  receiveConfirm: string;
  receiveQuantity: string;
  product: string;
  quantity: string;
  unitCost: string;
  cancel: string;
  saving: string;
  stockUpdated: string;
  filterAll: string;
  searchOrders: string;
  itemsUnit: string;
  kpiTotalOrders: string;
  kpiTotalValue: string;
  viewOrder: string;
  emptyFilteredOrders: string;
  confirmCancelOrder: string;
  requestFailed: string;
  noProducts?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60",
  partial:   "bg-violet-100 text-violet-700 ring-1 ring-violet-200/60",
  completed: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60",
  cancelled: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60",
};

const FILTER_TABS: { key: StatusFilter; color: string }[] = [
  { key: "all",       color: "" },
  { key: "pending",   color: "text-amber-600" },
  { key: "partial",   color: "text-violet-600" },
  { key: "completed", color: "text-emerald-600" },
  { key: "cancelled", color: "text-slate-500" },
];

function supplierInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600",
  "bg-rose-500", "bg-amber-500", "bg-cyan-600",
  "bg-indigo-600", "bg-pink-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
}

function SupplierCell({ name, logoUrl, size = "sm" }: { name?: string; logoUrl?: string; size?: "sm" | "md" }) {
  if (!name) return <span className="text-slate-400">—</span>;
  const dim = size === "md" ? "h-10 w-10 rounded-xl text-sm" : "h-8 w-8 rounded-lg text-[11px]";
  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className={`${dim} shrink-0 object-cover`} src={logoUrl} />
      ) : (
        <div className={`flex shrink-0 items-center justify-center font-bold text-white ${dim} ${avatarColor(name)}`}>
          {supplierInitials(name)}
        </div>
      )}
      <span className="truncate font-medium text-slate-800">{name}</span>
    </div>
  );
}

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB", minimumFractionDigits: 2, style: "currency",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(dateStr));
}

type KpiCardProps = { icon: React.ReactNode; label: string; value: string; accent?: string };
function KpiCard({ icon, label, value, accent }: KpiCardProps) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent ?? "bg-violet-100 text-violet-600"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="font-mono text-lg font-bold leading-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}

const statusLabels = (d: Dict): Record<StatusFilter, string> => ({
  all: d.filterAll, pending: d.pending, partial: d.partial,
  completed: d.completed, cancelled: d.cancelled,
});

export function PurchaseList({ dictionary: d, onCreateOrder }: { dictionary: Dict; onCreateOrder: () => void }) {
  const queryClient = useQueryClient();
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: orders = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryFn: async () => (await listPurchaseOrders()).data ?? [],
    queryKey: ["purchase-orders"],
  });

  const kpi = useMemo(() => ({
    total:     orders.length,
    pending:   orders.filter((o) => o.status === "pending").length,
    partial:   orders.filter((o) => o.status === "partial").length,
    totalValue: orders.reduce((s, o) => s + o.total_cost, 0),
  }), [orders]);

  const tabCount = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.supplier?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  async function handleCancel(po: PurchaseOrder) {
    if (!window.confirm(d.confirmCancelOrder)) return;
    setCancellingId(po.id);
    try {
      await cancelPurchaseOrder(po.id);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(`${d.cancelOrder} — ${po.order_number}`);
    } catch {
      toast.error(d.requestFailed);
    } finally {
      setCancellingId(null);
    }
  }

  function handleReceiveDone() {
    setReceivePO(null);
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  const isEmpty = visible.length === 0 && !isLoading;
  const isFiltered = statusFilter !== "all" || search !== "";
  const labels = statusLabels(d);

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-0">

        {/* ── KPI row: 2×2 on mobile, single row on desktop ── */}
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-3">
          <KpiCard
            accent="bg-violet-600 text-white"
            icon={<FileText className="h-5 w-5" />}
            label={d.kpiTotalOrders}
            value={String(kpi.total)}
          />
          <KpiCard
            accent="bg-amber-100 text-amber-600"
            icon={<Package className="h-5 w-5" />}
            label={d.pending}
            value={String(kpi.pending)}
          />
          <KpiCard
            accent="bg-violet-100 text-violet-600"
            icon={<ShoppingBag className="h-5 w-5" />}
            label={d.partial}
            value={String(kpi.partial)}
          />
          <KpiCard
            accent="bg-emerald-100 text-emerald-600"
            icon={<TrendingUp className="h-5 w-5" />}
            label={d.kpiTotalValue}
            value={formatTHB(kpi.totalValue)}
          />
        </div>

        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50/80 to-white px-4 py-4 md:px-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">{d.purchaseOrders}</h3>
              <p className="text-xs text-slate-500">{visible.length} {d.itemsUnit}</p>
            </div>
            {/* Desktop create button — hidden on mobile (use FAB) */}
            <button
              className="hidden items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-md md:inline-flex"
              onClick={onCreateOrder}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {d.createOrder}
            </button>
          </div>

          {/* Filter tabs */}
          <div className="border-b border-violet-50 px-4 pt-3 md:px-6">
            <div className="flex gap-1 overflow-x-auto pb-3">
              {FILTER_TABS.map(({ key, color }) => {
                const isActive = statusFilter === key;
                const count = tabCount[key] ?? 0;
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    type="button"
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-violet-600 text-white"
                        : `bg-transparent ${color || "text-slate-600"} hover:bg-violet-50`
                    }`}
                  >
                    {labels[key]}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                        isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search — full width on mobile, right-aligned on desktop */}
          <div className="border-b border-violet-50 px-4 py-3 md:px-6">
            <div className="relative md:ml-auto md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-violet-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => setSearch(e.target.value)}
                placeholder={d.searchOrders}
                type="text"
                value={search}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setSearch("")}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mx-4 my-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 md:mx-6">
              {d.requestFailed}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">{d.loading}</div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-100">
                  <ShoppingBag className="h-9 w-9 text-violet-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 shadow-md shadow-violet-200">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  {isFiltered ? d.emptyFilteredOrders : d.emptyOrders}
                </p>
                {!isFiltered && (
                  <button
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    onClick={onCreateOrder}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {d.createOrder}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50/40 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">{d.orderNumber}</th>
                      <th className="px-4 py-3">{d.supplierName}</th>
                      <th className="px-4 py-3 text-center">{d.product}</th>
                      <th className="px-4 py-3 text-right">{d.totalCost}</th>
                      <th className="px-4 py-3">{d.date}</th>
                      <th className="px-4 py-3">{d.status}</th>
                      <th className="px-6 py-3 text-right">{d.tableActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {visible.map((order) => {
                      const isActionable = order.status === "pending" || order.status === "partial";
                      return (
                        <tr
                          key={order.id}
                          className={`group transition-colors hover:bg-violet-50/50 ${order.status === "cancelled" ? "opacity-60" : ""}`}
                        >
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-xs font-semibold text-violet-700">{order.order_number}</span>
                          </td>
                          <td className="max-w-[200px] px-4 py-3.5">
                            <SupplierCell name={order.supplier?.name} logoUrl={order.supplier?.logo_url} />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <Package className="h-3 w-3" />
                              {order.items?.length ?? 0} {d.itemsUnit}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-mono text-sm font-bold text-slate-900">{formatTHB(order.total_cost)}</span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(order.created_at)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[order.status] ?? STATUS_BADGE.cancelled}`}>
                              {{ pending: d.pending, partial: d.partial, completed: d.completed, cancelled: d.cancelled }[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              {isActionable && (
                                <button
                                  className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 shadow-sm transition-all hover:border-violet-400 hover:shadow"
                                  onClick={() => setReceivePO(order)}
                                  title={d.receiveStock}
                                  type="button"
                                >
                                  <Package className="h-3.5 w-3.5" />
                                  {d.receiveStock}
                                </button>
                              )}
                              {isActionable && (
                                <button
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                  disabled={cancellingId === order.id}
                                  onClick={() => handleCancel(order)}
                                  title={d.cancelOrder}
                                  type="button"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile card list ── */}
              <div className="divide-y divide-violet-50 md:hidden">
                {visible.map((order) => {
                  const isActionable = order.status === "pending" || order.status === "partial";
                  return (
                    <div
                      key={order.id}
                      className={`p-4 transition-colors ${order.status === "cancelled" ? "opacity-60" : ""}`}
                    >
                      {/* Top row: avatar + PO# + supplier + status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {order.supplier?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={order.supplier.name}
                              className="h-10 w-10 shrink-0 rounded-xl object-cover"
                              src={order.supplier.logo_url}
                            />
                          ) : (
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarColor(order.supplier?.name ?? "")}`}>
                              {supplierInitials(order.supplier?.name ?? "?")}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-violet-700">{order.order_number}</p>
                            <p className="truncate text-sm font-medium text-slate-800">{order.supplier?.name ?? "—"}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[order.status] ?? STATUS_BADGE.cancelled}`}>
                          {{ pending: d.pending, partial: d.partial, completed: d.completed, cancelled: d.cancelled }[order.status] ?? order.status}
                        </span>
                      </div>

                      {/* Bottom row: item count + date + total */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {order.items?.length ?? 0} {d.itemsUnit}
                          </span>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        <span className="font-mono text-base font-bold text-slate-900">{formatTHB(order.total_cost)}</span>
                      </div>

                      {/* Action buttons */}
                      {isActionable && (
                        <div className="mt-3 flex gap-2">
                          <button
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50"
                            onClick={() => setReceivePO(order)}
                            type="button"
                          >
                            <Package className="h-3.5 w-3.5" />
                            {d.receiveStock}
                          </button>
                          <button
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancel(order)}
                            type="button"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/60 transition-all hover:bg-violet-700 active:scale-95 md:hidden"
        onClick={onCreateOrder}
        type="button"
        aria-label={d.createOrder}
      >
        <Plus className="h-6 w-6" />
      </button>

      {receivePO && (
        <ReceiveModal
          dictionary={d}
          onClose={handleReceiveDone}
          purchaseOrder={receivePO}
        />
      )}
    </>
  );
}
