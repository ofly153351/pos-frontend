"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, RefreshCw, Search, Filter, Activity, ChevronLeft, ChevronRight, X } from "lucide-react";
import { getActivityLogs, type ActivityLogEntry } from "@/services/activity-logs";
import type { ActivityDict } from "@/components/activity-logs/types";
import { cn, MODULE_ICON, ACTION_COLOR, SEVERITY_ORDER } from "@/components/activity-logs/activity-config";
import { ActivitySummaryHeader } from "@/components/activity-logs/activity-summary-header";
import { ActivityTimelineCard } from "@/components/activity-logs/activity-timeline-card";
import { ActivityDetailDrawer } from "@/components/activity-logs/activity-detail-drawer";

const LIMIT = 50;
const CATEGORY_KEYS = [
  "inventory",
  "sales",
  "purchasing",
  "customer",
  "promotion",
  "settings",
  "security",
  "finance",
] as const;

type QuickRange = "all" | "today" | "yesterday" | "7d" | "30d";

function computeRange(range: QuickRange, now: number): { date_from?: string; date_to?: string } {
  if (range === "all") return {};
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startToday = start.getTime();
  switch (range) {
    case "today":
      return { date_from: new Date(startToday).toISOString() };
    case "yesterday":
      return {
        date_from: new Date(startToday - 86400000).toISOString(),
        date_to: new Date(startToday).toISOString(),
      };
    case "7d":
      return { date_from: new Date(now - 7 * 86400000).toISOString() };
    case "30d":
      return { date_from: new Date(now - 30 * 86400000).toISOString() };
  }
}

export function ActivityLogsClient({ t, locale }: { t: ActivityDict; locale: string }) {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<QuickRange>("all");
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);

  // `now` powers relative timestamps; refreshed on an interval so the render stays
  // pure (no Date.now() during render) while "x minutes ago" stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Debounce the search box into the query param.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const dateRange = useMemo(() => computeRange(range, now), [range, now]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["activity-logs", page, filterModule, filterAction, filterSeverity, filterCategory, search, range],
    queryFn: () =>
      getActivityLogs({
        page,
        limit: LIMIT,
        module: filterModule || undefined,
        action: filterAction || undefined,
        severity: filterSeverity || undefined,
        category: filterCategory || undefined,
        q: search || undefined,
        ...dateRange,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const hasFilter = !!(filterModule || filterAction || filterSeverity || filterCategory || search || range !== "all");

  function clearFilters() {
    setFilterModule("");
    setFilterAction("");
    setFilterSeverity("");
    setFilterCategory("");
    setSearchInput("");
    setSearch("");
    setRange("all");
    setPage(1);
  }

  function showingText() {
    if (!data || data.total === 0) return "";
    const from = ((page - 1) * LIMIT + 1).toLocaleString();
    const to = Math.min(page * LIMIT, data.total).toLocaleString();
    return t.showing.replace("{from}", from).replace("{to}", to).replace("{total}", data.total.toLocaleString());
  }

  const selectCls =
    "rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

  const QUICK: { key: QuickRange; label: string }[] = [
    { key: "all", label: t.filters.allTime },
    { key: "today", label: t.filters.today },
    { key: "yesterday", label: t.filters.yesterday },
    { key: "7d", label: t.filters.last7 },
    { key: "30d", label: t.filters.last30 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <ScrollText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">{t.title}</h1>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          {t.refreshButton}
        </button>
      </div>

      {/* AI / derived business summary */}
      <ActivitySummaryHeader entries={items} t={t} loading={isLoading} />

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm sm:p-4">
        {/* Quick date + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.key}
                onClick={() => {
                  setRange(q.key);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  range === q.key
                    ? "bg-violet-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="w-full rounded-lg border border-violet-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            {searchInput ? (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={t.clearFilters}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Selects */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {t.filterLabel}
          </span>
          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="">{t.filters.allSeverities}</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {t.severities[s]}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="">{t.filters.allCategories}</option>
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {t.categories[c]}
              </option>
            ))}
          </select>
          <select
            value={filterModule}
            onChange={(e) => {
              setFilterModule(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="">{t.allModules}</option>
            {Object.keys(MODULE_ICON).map((m) => (
              <option key={m} value={m}>
                {t.modules[m] ?? m}
              </option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="">{t.allActions}</option>
            {Object.keys(ACTION_COLOR).map((a) => (
              <option key={a} value={a}>
                {t.actions[a] ?? a}
              </option>
            ))}
          </select>
          {hasFilter ? (
            <button onClick={clearFilters} className="text-xs font-medium text-violet-600 underline hover:text-violet-800">
              {t.clearFilters}
            </button>
          ) : null}
        </div>
      </div>

      {/* Timeline */}
      <div className="min-h-[280px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            {t.loading}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-20">
            <Activity className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((entry) => (
              <ActivityTimelineCard
                key={entry.id}
                entry={entry}
                t={t}
                now={now}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                onOpen={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">{showingText()}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium tabular-nums text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Detail drawer */}
      <ActivityDetailDrawer
        entry={selectedEntry}
        t={t}
        locale={locale}
        now={now}
        onClose={() => setSelectedEntry(null)}
        onSelectRelated={(e) => setSelectedEntry(e)}
        onRestored={() => void refetch()}
      />
    </div>
  );
}
