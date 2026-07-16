import { Activity } from "lucide-react";
import type { ActivitySeverity, ActivityCategory } from "@/services/activity-logs";
import type { ActivityDict } from "./types";
import {
  cn,
  MODULE_ICON,
  MODULE_COLOR,
  ACTION_COLOR,
  SEVERITY_STYLE,
  CATEGORY_ICON,
  CATEGORY_COLOR,
} from "./activity-config";

export function ModuleBadge({ module, t }: { module: string; t: ActivityDict }) {
  const Icon = MODULE_ICON[module] ?? Activity;
  const label = t.modules[module] ?? module;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        MODULE_COLOR[module] ?? "bg-slate-50 text-slate-600 border-slate-200",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function ActionBadge({ action, t }: { action: string; t: ActivityDict }) {
  const label = t.actions[action] ?? action;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        ACTION_COLOR[action] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {label}
    </span>
  );
}

export function SeverityBadge({ severity, t }: { severity: ActivitySeverity; t: ActivityDict }) {
  const style = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.normal;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        style.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {t.severities[severity] ?? severity}
    </span>
  );
}

export function CategoryIcon({ category, className }: { category: ActivityCategory; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? Activity;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        CATEGORY_COLOR[category] ?? "bg-slate-50 text-slate-500",
        className,
      )}
    >
      <Icon className="h-4.5 w-4.5" strokeWidth={2} />
    </span>
  );
}
