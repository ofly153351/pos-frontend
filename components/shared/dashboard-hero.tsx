"use client";

import { type ReactNode, useState } from "react";
import {
  CalendarRange,
  Filter,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type HeroPeriod = "today" | "7d" | "30d" | "90d" | "custom";

export type HeroPeriodOption<P extends string = HeroPeriod> = {
  value: P;
  label: string;
};

export type HeroChip = {
  label: string;
  value: string;
  /** Optional tone override — defaults to white/violet-300 on the dark hero bg. */
  tone?: "default" | "success" | "warning" | "danger";
};

export type HeroPeriodLabels = {
  today: string;
  d7: string;
  d30: string;
  d90: string;
  custom: string;
  from: string;
  to: string;
  apply: string;
  refresh: string;
};

export type DashboardHeroProps<P extends string = HeroPeriod> = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Formatted date range string shown after subtitle. */
  rangeLabel?: string;
  /** Active period tab. */
  period: P;
  onPeriodChange: (p: P) => void;
  periodLabels: HeroPeriodLabels;
  /**
   * Explicit period pills. When omitted, defaults to the standard
   * today/7d/30d/90d set (plus a custom-range pill) built from `periodLabels`.
   * Pages whose backend supports a different window set (e.g. the warehouse
   * dashboard's 7d/30d/3m) pass their own options here.
   */
  periodOptions?: HeroPeriodOption<P>[];
  /** Custom date range inputs — only needed when a "custom" pill is shown. */
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
  onApplyCustom?: () => void;
  customValid?: boolean;
  /** Compact KPI chips rendered inside the hero. */
  chips?: HeroChip[];
  /** Loading state — spins refresh icon. */
  isLoading?: boolean;
  onRefresh?: () => void;
  /** Extra buttons rendered after the period pills (e.g. Print, Export). */
  actions?: ReactNode;
  /** Advanced filter panel content — rendered inside expandable area. */
  filterContent?: ReactNode;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultOptions(labels: HeroPeriodLabels): HeroPeriodOption[] {
  return [
    { value: "today", label: labels.today },
    { value: "7d", label: labels.d7 },
    { value: "30d", label: labels.d30 },
    { value: "90d", label: labels.d90 },
  ];
}

const CHIP_TONE = {
  default: "",
  success: "text-emerald-200",
  warning: "text-amber-200",
  danger: "text-rose-200",
} as const;

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardHero<P extends string = HeroPeriod>({
  icon: Icon,
  title,
  subtitle,
  rangeLabel,
  period,
  onPeriodChange,
  periodLabels,
  periodOptions,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  customValid,
  chips,
  isLoading = false,
  onRefresh,
  actions,
  filterContent,
}: DashboardHeroProps<P>) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Default mode renders the standard set + a custom-range pill. When a page
  // supplies its own `periodOptions`, the custom-range UI is suppressed.
  const usingDefault = !periodOptions;
  const options = (periodOptions ?? defaultOptions(periodLabels)) as HeroPeriodOption<P>[];
  const customValue = "custom" as P;

  const pillClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
      active
        ? "bg-white text-violet-700 shadow-sm"
        : "text-white/70 hover:text-white hover:bg-white/10"
    }`;

  return (
    <section className="rounded-2xl bg-violet-700 px-5 py-4 shadow-md shadow-violet-200/50">
      {/* ── Row 1: Title + Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-white">{title}</h1>
            <p className="text-[11px] text-violet-200">
              {subtitle}
              {rangeLabel ? <span className="text-violet-300"> · {rangeLabel}</span> : null}
            </p>
          </div>
        </div>

        {/* Right: period pills + actions + filter + refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pills */}
          <div className="flex items-center gap-0.5 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={pillClass(period === opt.value)}
                onClick={() => onPeriodChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            {usingDefault ? (
              <button
                type="button"
                className={`inline-flex items-center gap-1 ${pillClass(period === customValue)}`}
                onClick={() => onPeriodChange(customValue)}
              >
                <CalendarRange className="h-3 w-3" />
                {periodLabels.custom}
              </button>
            ) : null}
          </div>

          {/* Extra actions (print, export, etc.) */}
          {actions}

          {/* Advanced filter toggle */}
          {filterContent ? (
            <button
              type="button"
              className={`rounded-xl p-2 transition ${
                filterOpen ? "bg-white text-violet-700" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter className="h-4 w-4" />
            </button>
          ) : null}

          {/* Refresh */}
          {onRefresh ? (
            <button
              type="button"
              className="rounded-xl bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
              disabled={isLoading}
              onClick={onRefresh}
              title={periodLabels.refresh}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Row 2: KPI Chips ── */}
      {chips && chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {chips.map((chip, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                {chip.label}
              </p>
              <p className={`nums text-lg font-black text-white ${chip.tone ? CHIP_TONE[chip.tone] : ""}`}>
                {chip.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Row 3: Custom date range ── */}
      {usingDefault && period === customValue && onApplyCustom ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2.5 shadow-sm">
          <input
            type="date"
            value={customFrom ?? ""}
            max={customTo || undefined}
            onChange={(e) => onCustomFromChange?.(e.target.value)}
            aria-label={periodLabels.from}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-violet-400 focus:outline-none"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            value={customTo ?? ""}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange?.(e.target.value)}
            aria-label={periodLabels.to}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onApplyCustom}
            disabled={!customValid}
            className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {periodLabels.apply}
          </button>
        </div>
      ) : null}

      {/* ── Row 4: Advanced filter panel ── */}
      {filterOpen && filterContent ? (
        <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
          {filterContent}
        </div>
      ) : null}
    </section>
  );
}
