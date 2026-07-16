"use client";

import { ChevronDown } from "lucide-react";
import type { ActivityLogEntry } from "@/services/activity-logs";
import type { ActivityDict } from "./types";
import { cn, relativeTime, SEVERITY_STYLE } from "./activity-config";
import { SeverityBadge, ModuleBadge, ActionBadge, CategoryIcon } from "./badges";
import { BeforeAfterDiff, scalarChangedFields } from "./before-after-diff";

// A single expandable timeline card. Replaces the dense table row: a store owner can
// see who did what, when, how serious, and what changed — within seconds. Clicking
// the card opens the detail drawer; the chevron expands an inline preview of the
// changed fields without leaving the list.
export function ActivityTimelineCard({
  entry,
  t,
  now,
  expanded,
  onToggle,
  onOpen,
}: {
  entry: ActivityLogEntry;
  t: ActivityDict;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const hasDiff = scalarChangedFields(entry.changes).length > 0;
  const isCapturedUpdate = entry.action === "update" && entry.changes != null;
  const stripe = SEVERITY_STYLE[entry.severity] ?? SEVERITY_STYLE.normal;

  return (
    <div className="smooth-fade-up overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="flex items-stretch">
        {/* Severity stripe */}
        <div className={cn("w-1 shrink-0", stripe.stripe)} aria-hidden />

        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left sm:px-4"
        >
          <CategoryIcon category={entry.category} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate font-semibold text-slate-800">{entry.user_name || "—"}</span>
              <ActionBadge action={entry.action} t={t} />
              <ModuleBadge module={entry.module} t={t} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span>{relativeTime(entry.created_at, now, t.relative)}</span>
              <span aria-hidden>·</span>
              <SeverityBadge severity={entry.severity} t={t} />
            </div>

            {/* Compact inline diff preview (top 2 changed fields) */}
            {hasDiff ? (
              <div className="mt-2">
                <BeforeAfterDiff changes={entry.changes} t={t} limit={2} />
              </div>
            ) : null}
          </div>
        </button>

        {/* Expand toggle — inline detail without leaving the list */}
        {isCapturedUpdate ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? t.card.hideDetails : t.card.viewDetails}
            className="flex shrink-0 items-center gap-1 px-3 text-xs font-medium text-violet-600 transition hover:bg-violet-50"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>

      {expanded && isCapturedUpdate ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.card.changedFields}</p>
          <BeforeAfterDiff changes={entry.changes} t={t} showEmptyState />
        </div>
      ) : null}
    </div>
  );
}
