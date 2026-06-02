"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Warehouse,
  Settings,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Activity,
} from "lucide-react";
import { getActivityLogs, type ActivityLogEntry } from "@/services/activity-logs";

type Dict = {
  title: string;
  subtitle: string;
  refreshButton: string;
  filterLabel: string;
  allModules: string;
  allActions: string;
  clearFilters: string;
  dateFrom: string;
  dateTo: string;
  colUser: string;
  colModule: string;
  colAction: string;
  colTime: string;
  loading: string;
  empty: string;
  showing: string;
  modules: Record<string, string>;
  actions: Record<string, string>;
};

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── module config (icons + colors stay in code; labels come from dict) ────────

const MODULE_ICON: Record<string, React.ElementType> = {
  product:       Package,
  sale:          ShoppingCart,
  document:      FileText,
  customer:      Users,
  warehouse:     Warehouse,
  stock:         Package,
  purchasing:    Truck,
  location:      Warehouse,
  invoice:       FileText,
  "parked-bill": FileText,
  settings:      Settings,
};

const MODULE_COLOR: Record<string, string> = {
  product:       "bg-blue-50 text-blue-700 border-blue-200",
  sale:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  document:      "bg-violet-50 text-violet-700 border-violet-200",
  customer:      "bg-orange-50 text-orange-700 border-orange-200",
  warehouse:     "bg-cyan-50 text-cyan-700 border-cyan-200",
  stock:         "bg-amber-50 text-amber-700 border-amber-200",
  purchasing:    "bg-pink-50 text-pink-700 border-pink-200",
  location:      "bg-teal-50 text-teal-700 border-teal-200",
  invoice:       "bg-indigo-50 text-indigo-700 border-indigo-200",
  "parked-bill": "bg-slate-50 text-slate-700 border-slate-200",
  settings:      "bg-slate-50 text-slate-600 border-slate-200",
};

const ACTION_COLOR: Record<string, string> = {
  create:               "bg-emerald-100 text-emerald-800",
  update:               "bg-blue-100 text-blue-800",
  delete:               "bg-red-100 text-red-800",
  pay:                  "bg-green-100 text-green-800",
  cancel:               "bg-orange-100 text-orange-800",
  convert:              "bg-purple-100 text-purple-800",
  adjust:               "bg-amber-100 text-amber-800",
  transfer:             "bg-cyan-100 text-cyan-800",
  receive:              "bg-teal-100 text-teal-800",
  void:                 "bg-red-100 text-red-800",
  "manage-members":     "bg-slate-100 text-slate-800",
  "manage-bank-accounts": "bg-slate-100 text-slate-800",
  print:                "bg-slate-100 text-slate-700",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

function ModuleBadge({ module, t }: { module: string; t: Dict }) {
  const Icon = MODULE_ICON[module] ?? Activity;
  const label = t.modules[module] ?? module;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      MODULE_COLOR[module] ?? "bg-slate-50 text-slate-600 border-slate-200"
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ActionBadge({ action, t }: { action: string; t: Dict }) {
  const label = t.actions[action] ?? action;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
      ACTION_COLOR[action] ?? "bg-slate-100 text-slate-700"
    )}>
      {label}
    </span>
  );
}

function LogRow({ log, t }: { log: ActivityLogEntry; t: Dict }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-slate-100 px-5 py-3 text-sm hover:bg-violet-50/30 transition-colors">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{log.user_name || "—"}</p>
        <p className="truncate text-xs text-slate-400">{log.ip_address}</p>
      </div>
      <ModuleBadge module={log.module} t={t} />
      <ActionBadge action={log.action} t={t} />
      <p className="whitespace-nowrap text-xs text-slate-400 tabular-nums">{formatTime(log.created_at)}</p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const LIMIT = 50;

export function ActivityLogsClient({ t }: { t: Dict }) {
  const [page, setPage] = useState(1);
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["activity-logs", page, filterModule, filterAction, dateFrom, dateTo],
    queryFn: () =>
      getActivityLogs({
        page,
        limit: LIMIT,
        module: filterModule || undefined,
        action: filterAction || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo ? `${dateTo}T23:59:59Z` : undefined,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const hasFilter = !!(filterModule || filterAction || dateFrom || dateTo);

  const moduleOptions = [
    { value: "", label: t.allModules },
    ...Object.keys(MODULE_ICON).map((k) => ({ value: k, label: t.modules[k] ?? k })),
  ];

  const actionOptions = [
    { value: "", label: t.allActions },
    ...Object.keys(ACTION_COLOR).map((k) => ({ value: k, label: t.actions[k] ?? k })),
  ];

  function showingText() {
    if (!data || data.total === 0) return "";
    const from = ((page - 1) * LIMIT + 1).toLocaleString();
    const to = Math.min(page * LIMIT, data.total).toLocaleString();
    const total = data.total.toLocaleString();
    return t.showing.replace("{from}", from).replace("{to}", to).replace("{total}", total);
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-violet-50 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
            <ScrollText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">{t.title}</h1>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          {t.refreshButton}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          {t.filterLabel}
        </div>
        <select
          value={filterModule}
          onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          {moduleOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          {actionOptions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            aria-label={t.dateFrom}
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            aria-label={t.dateTo}
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setFilterModule(""); setFilterAction(""); setDateFrom(""); setDateTo(""); setPage(1); }}
            className="text-xs font-medium text-violet-600 underline hover:text-violet-800"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-slate-100 bg-violet-50/40 px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span>{t.colUser}</span>
        <span>{t.colModule}</span>
        <span>{t.colAction}</span>
        <span>{t.colTime}</span>
      </div>

      {/* Rows */}
      <div className="min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            {t.loading}
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Activity className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">{t.empty}</p>
          </div>
        ) : (
          data.items.map((log) => <LogRow key={log.id} log={log} t={t} />)
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-xs text-slate-500">{showingText()}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium text-slate-700 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
