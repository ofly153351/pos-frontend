"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Info, Lightbulb, RotateCcw, Check } from "lucide-react";
import { DrawerShell } from "@/components/warehouse/inventory/drawer-shell";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getActivityLogs, type ActivityLogEntry } from "@/services/activity-logs";
import type { ActivityDict } from "./types";
import { cn, formatTime, relativeTime, openRecordHref, SEVERITY_STYLE } from "./activity-config";
import { SeverityBadge, ModuleBadge, ActionBadge, CategoryIcon } from "./badges";
import { BeforeAfterDiff } from "./before-after-diff";
import { deterministicInsightProvider } from "./insight-provider";
import { canRestore, restoreActivity, restoreState } from "./restore-activity";

const RESTORE_REASON_KEY = {
  compensating: "restoreReasonCompensating",
  notCaptured: "restoreReasonNotCaptured",
  noPrevious: "restoreReasonNoPrevious",
} as const;

// Right-side detail drawer (spec §3): who / what / when, the before→after diff,
// related activity, and the action buttons (Open Record, Copy ID, Explain, Restore).
// Opening it never navigates away from the timeline.
export function ActivityDetailDrawer({
  entry,
  t,
  locale,
  now,
  onClose,
  onSelectRelated,
  onRestored,
}: {
  entry: ActivityLogEntry | null;
  t: ActivityDict;
  locale: string;
  now: number;
  onClose: () => void;
  onSelectRelated: (e: ActivityLogEntry) => void;
  onRestored: () => void;
}) {
  const [showExplain, setShowExplain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The full activity chain for THIS record — fetched by resource_id so it spans
  // every page, not just the rows currently in view (spec §7: tell the story).
  const resourceId = entry?.resource_id ?? "";
  const { data: relatedData } = useQuery({
    queryKey: ["activity-related", entry?.store_id, entry?.module, resourceId],
    queryFn: () => getActivityLogs({ resource_id: resourceId, module: entry?.module, limit: 20 }),
    enabled: !!entry && !!resourceId,
    staleTime: 30_000,
  });

  if (!entry) return null;

  const related = (relatedData?.items ?? []).filter((r) => r.id !== entry.id).slice(0, 8);
  const recordHref = openRecordHref(entry.module, locale);
  const restorable = canRestore(entry);
  const reason = restoreState(entry);
  const isUpdate = entry.action === "update";
  const explanation = deterministicInsightProvider.explain(entry, t);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(entry!.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  async function doRestore() {
    setRestoring(true);
    setError(null);
    try {
      await restoreActivity(entry!);
      setConfirmOpen(false);
      onRestored();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.restore.error);
    } finally {
      setRestoring(false);
    }
  }

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      {recordHref ? (
        <Link
          href={recordHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t.drawer.openRecord}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={copyId}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t.drawer.copied : t.drawer.copyId}
      </button>
      <button
        type="button"
        onClick={() => setShowExplain((v) => !v)}
        aria-pressed={showExplain}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
          showExplain
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        {t.drawer.explain}
      </button>
      {restorable ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.drawer.restore}
        </button>
      ) : (
        // Spec §13 — say WHY this can't be restored instead of just hiding it.
        <span className="ml-auto flex max-w-[60%] items-start gap-1.5 text-right text-[11px] leading-snug text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t.drawer[RESTORE_REASON_KEY[reason as keyof typeof RESTORE_REASON_KEY]] ?? t.drawer.restoreNotAvailable}
        </span>
      )}
    </div>
  );

  return (
    <>
      <DrawerShell
        open={!!entry}
        title={t.drawer.title}
        onClose={onClose}
        closeLabel={t.drawer.close}
        widthClass="sm:max-w-[480px]"
        footer={footer}
      >
        {/* Headline */}
        <div className="flex items-start gap-3">
          <CategoryIcon category={entry.category} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <ActionBadge action={entry.action} t={t} />
              <ModuleBadge module={entry.module} t={t} />
            </div>
            <div className="mt-1.5">
              <SeverityBadge severity={entry.severity} t={t} />
            </div>
          </div>
        </div>

        {/* Meta */}
        <dl className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <MetaRow label={t.drawer.who} value={entry.user_name || "—"} />
          <MetaRow
            label={t.drawer.when}
            value={`${formatTime(entry.created_at, locale)} · ${relativeTime(entry.created_at, now, t.relative)}`}
          />
          <MetaRow label={t.drawer.categoryLabel} value={t.categories[entry.category] ?? entry.category} />
        </dl>

        {/* What changed */}
        {isUpdate ? (
          <div className="mt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t.drawer.changedTitle}
            </h3>
            <BeforeAfterDiff changes={entry.changes} t={t} showEmptyState />
          </div>
        ) : null}

        {/* Explanation (deterministic, business language) */}
        {showExplain ? (
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-semibold text-slate-800">{explanation.title}</p>
            </div>
            <dl className="mt-2 space-y-1.5 text-xs">
              <ExplainRow label={t.summary.why} value={explanation.why} />
              <ExplainRow label={t.summary.impact} value={explanation.impact} />
              <ExplainRow label={t.summary.recommendation} value={explanation.recommendation} />
              <ExplainRow label={t.summary.source} value={explanation.source} />
            </dl>
          </div>
        ) : null}

        {/* Related activity */}
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.drawer.relatedTitle}
          </h3>
          {related.length === 0 ? (
            <p className="text-xs text-slate-400">{t.drawer.noRelated}</p>
          ) : (
            <ul className="space-y-1.5">
              {related.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRelated(r)}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left text-xs transition hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_STYLE[r.severity].dot)} />
                    <span className="font-medium text-slate-700">{t.actions[r.action] ?? r.action}</span>
                    <span className="text-slate-400">·</span>
                    <span className="truncate text-slate-500">{r.user_name}</span>
                    <span className="ml-auto shrink-0 text-slate-400">{relativeTime(r.created_at, now, t.relative)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p> : null}
      </DrawerShell>

      <ConfirmModal
        open={confirmOpen}
        title={t.restore.confirmTitle}
        message={t.restore.confirmMessage}
        confirmLabel={t.restore.confirm}
        cancelLabel={t.restore.cancel}
        tone="default"
        loading={restoring}
        onConfirm={doRestore}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function ExplainRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 font-semibold text-slate-400">{label}:</dt>
      <dd className="text-slate-600">{value}</dd>
    </div>
  );
}
