import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { ReportKpiCardReportKpiCardProps } from "./types";
export type { ReportKpiCardReportKpiCardProps as ReportKpiCardProps } from "./types";


// Reusable KPI tile for the Reports & Finance module.
// Mirrors the dashboard card pattern (rounded-2xl, violet border, soft shadow,
// lift-on-hover) so every report page stays visually consistent.


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
  footer,
  className,
  loading = false,
}: ReportKpiCardReportKpiCardProps) {
  const borderClass = warning
    ? "border-amber-300 ring-1 ring-amber-100"
    : emphasis
      ? "border-violet-300 ring-1 ring-violet-100"
      : "border-violet-100";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}${className ? ` ${className}` : ""}`}
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
          {loading ? (
            <span className="mt-1.5 block h-6 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <>
              <p
                className={`nums mt-1 truncate text-xl font-black 2xl:text-2xl ${
                  valueTone === "danger" ? "text-rose-600" : "text-slate-900"
                }`}
                title={warningHint}
              >
                {value}
              </p>
              {hint ? <p className="mt-1 truncate text-[11px] text-slate-400">{hint}</p> : null}
              {footer ? <div className="mt-1.5">{footer}</div> : null}
            </>
          )}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </span>
      </div>
    </article>
  );
}
