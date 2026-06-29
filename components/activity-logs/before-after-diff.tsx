import { ArrowRight, Info } from "lucide-react";
import type { ActivityChanges } from "@/services/activity-logs";
import type { ActivityDict } from "./types";
import { isScalar, formatValue, cn } from "./activity-config";

// Returns the changed scalar fields (object/array values such as a promotion's full
// campaign blob are kept only for restore and never shown in the human diff).
export function scalarChangedFields(changes: ActivityChanges | null | undefined): string[] {
  if (!changes?.fields) return [];
  return Object.keys(changes.fields).filter((k) => {
    const c = changes.fields[k];
    return isScalar(c.before) || isScalar(c.after);
  });
}

// Before → After diff, in business language: 🟥 previous value, 🟩 current value.
// No JSON, no raw IDs. When `showEmptyState` is set and there is nothing to show,
// it renders the honest "not captured before this upgrade" message instead of a
// fabricated diff.
export function BeforeAfterDiff({
  changes,
  t,
  limit,
  showEmptyState,
}: {
  changes: ActivityChanges | null | undefined;
  t: ActivityDict;
  limit?: number;
  showEmptyState?: boolean;
}) {
  const keys = scalarChangedFields(changes);
  const shown = typeof limit === "number" ? keys.slice(0, limit) : keys;

  if (shown.length === 0) {
    if (!showEmptyState) return null;
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {t.diff.noDetails}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {shown.map((k) => {
        const c = changes!.fields[k];
        const label = t.diff.fields[k] ?? k;
        return (
          <div key={k} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="min-w-[88px] font-medium text-slate-500">{label}</span>
            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-medium text-rose-600 line-through decoration-rose-300">
              {formatValue(c.before, t.diff.empty)}
            </span>
            <ArrowRight className="h-3 w-3 text-slate-300" />
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
              {formatValue(c.after, t.diff.empty)}
            </span>
          </div>
        );
      })}
      {typeof limit === "number" && keys.length > limit ? (
        <p className={cn("text-[11px] text-slate-400")}>{t.card.andMore.replace("{n}", String(keys.length - limit))}</p>
      ) : null}
    </div>
  );
}
