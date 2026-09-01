"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";

export type DateFilterPreset = "today" | "7d" | "30d" | "all";

export type DateFilterValue = {
  preset: DateFilterPreset;
  custom?: {
    from: string;
    to: string;
  } | null;
};

export type DateRangeLabels = {
  today: string;
  sevenDays: string;
  thirtyDays: string;
  all: string;
  custom: string;
  startDate: string;
  endDate: string;
  cancel: string;
  apply: string;
};

type Props = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  labels: DateRangeLabels;
  locale?: string;
  className?: string;
  buttonClassName?: string;
};

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayIso(reference = new Date()): string {
  return new Date(reference.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: DateFilterPreset): { from?: string; to?: string } {
  const today = todayIso();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysIso(today, -6), to: today };
    case "30d":
      return { from: addDaysIso(today, -29), to: today };
    case "all":
    default:
      return {};
  }
}

function normalizeRange(from: string, to: string): { from: string; to: string } {
  if (!from && !to) {
    const today = todayIso();
    return { from: today, to: today };
  }
  if (!from) return { from: to, to };
  if (!to) return { from, to: from };
  return from <= to ? { from, to } : { from: to, to: from };
}

function formatDate(dateIso: string, locale = "th"): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function resolveDateQuery(value: DateFilterValue): { date_from?: string; date_to?: string } {
  if (value.custom?.from || value.custom?.to) {
    const { from, to } = normalizeRange(value.custom?.from ?? "", value.custom?.to ?? "");
    return { date_from: from, date_to: to };
  }
  const range = presetRange(value.preset);
  return {
    ...(range.from ? { date_from: range.from } : {}),
    ...(range.to ? { date_to: range.to } : {}),
  };
}

export function isDefaultDateFilter(value: DateFilterValue, defaultPreset: DateFilterPreset): boolean {
  return value.preset === defaultPreset && !value.custom;
}

export function formatDateRangeLabel(
  value: NonNullable<DateFilterValue["custom"]>,
  locale = "th",
): string {
  return `${formatDate(value.from, locale)} – ${formatDate(value.to, locale)}`;
}

export function DateRangeFilter({
  value,
  onChange,
  labels,
  locale = "th",
  className = "",
  buttonClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const presetButtons = useMemo(
    () => [
      { key: "today" as const, label: labels.today },
      { key: "7d" as const, label: labels.sevenDays },
      { key: "30d" as const, label: labels.thirtyDays },
      { key: "all" as const, label: labels.all },
    ],
    [labels],
  );

  // Draft range mirrors the applied value each time the picker (re)opens —
  // "adjust state during render" pattern (setState-in-effect is forbidden).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    const current = value.custom?.from || value.custom?.to ? normalizeRange(value.custom?.from ?? "", value.custom?.to ?? "") : presetRange(value.preset);
    setDraftFrom(current.from ?? "");
    setDraftTo(current.to ?? current.from ?? "");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasCustom = !!value.custom?.from || !!value.custom?.to;
  const customLabel = hasCustom ? formatDateRangeLabel(normalizeRange(value.custom?.from ?? "", value.custom?.to ?? ""), locale) : labels.custom;
  const canApply = draftFrom.trim() !== "" && draftTo.trim() !== "";

  function selectPreset(preset: DateFilterPreset) {
    onChange({ preset, custom: null });
    setOpen(false);
  }

  function applyCustom() {
    if (!canApply) return;
    const range = normalizeRange(draftFrom, draftTo);
    onChange({ preset: value.preset, custom: range });
    setOpen(false);
  }

  function clearCustom() {
    onChange({ preset: value.preset, custom: null });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative flex flex-wrap items-center gap-1.5 ${className}`}>
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {presetButtons.map((tab) => {
          const active = value.preset === tab.key && !hasCustom;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectPreset(tab.key)}
              className={`${buttonClassName || "rounded-lg px-3.5 py-1.5 text-sm font-medium"} ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-violet-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        {hasCustom ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`${buttonClassName || "rounded-lg px-3.5 py-1.5 text-sm font-medium"} inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="tabular-nums">{customLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            <button
              type="button"
              onClick={clearCustom}
              className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-slate-500 shadow ring-1 ring-slate-200 transition hover:text-slate-700"
              aria-label={labels.all}
              title={labels.all}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`${buttonClassName || "rounded-lg px-3.5 py-1.5 text-sm font-medium"} inline-flex items-center gap-1.5 text-slate-600 hover:text-violet-700`}
          >
            <CalendarDays className="h-4 w-4" />
            {labels.custom}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,20rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:w-80">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{labels.custom}</p>
              <p className="text-xs text-slate-500">{labels.startDate} · {labels.endDate}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label={labels.cancel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
              <span>{labels.startDate}</span>
              <input
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraftFrom(next);
                  if (!draftTo || draftTo < next) setDraftTo(next);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
              <span>{labels.endDate}</span>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraftTo(next);
                  if (!draftFrom || draftFrom > next) setDraftFrom(next);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!canApply}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.apply}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
