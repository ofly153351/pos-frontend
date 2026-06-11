import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

// Reusable KPI tile for the Reports & Finance module.
// Mirrors the dashboard card pattern (rounded-2xl, violet border, soft shadow,
// lift-on-hover) so every report page stays visually consistent.
export type ReportKpiCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  /** Tailwind background class for the icon chip, e.g. "bg-violet-100". */
  iconBg: string;
  /** Tailwind text-color class for the icon, e.g. "text-violet-600". */
  iconColor: string;
  /** Optional secondary line below the value. */
  hint?: string;
  /** Highlight the card (used for the headline metric, e.g. expected profit). */
  emphasis?: boolean;
  /** Flag the number as abnormal/suspicious — amber border + ⚠ next to label. */
  warning?: boolean;
  /** Tooltip explaining the warning (also used as the ⚠ aria-label). */
  warningHint?: string;
  /** Colour the value red when the figure is genuinely bad (e.g. negative profit). */
  valueTone?: "default" | "danger";
};

export function ReportKpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  hint,
  emphasis = false,
  warning = false,
  warningHint,
  valueTone = "default",
}: ReportKpiCardProps) {
  const borderClass = warning
    ? "border-amber-300 ring-1 ring-amber-100"
    : emphasis
      ? "border-violet-300 ring-1 ring-violet-100"
      : "border-violet-100";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            {warning ? (
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                aria-label={warningHint ?? label}
              />
            ) : null}
          </div>
          <p
            className={`mt-1 truncate text-xl font-black 2xl:text-2xl ${
              valueTone === "danger" ? "text-rose-600" : "text-slate-900"
            }`}
            title={warningHint}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-[11px] text-slate-400">{hint}</p> : null}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </span>
      </div>
    </article>
  );
}
