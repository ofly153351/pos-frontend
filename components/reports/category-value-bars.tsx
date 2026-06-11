// Reusable ranked horizontal-bar list for category breakdowns (inventory value,
// and later P&L / expense breakdowns). Values + percentages are always visible
// (no hover) so it stays touch-friendly on Android POS / tablet. Solid violet
// shades — no gradients — per the POS design system.

export type CategoryValueRow = {
  name: string;
  value: number;
  percent: number;
};

// Solid violet ramp by rank (darkest = largest). Index past the ramp falls back
// to the lightest shade.
const BAR_SHADES = [
  "bg-violet-600",
  "bg-violet-500",
  "bg-violet-400",
  "bg-violet-300",
  "bg-violet-300",
];

export function CategoryValueBars({
  rows,
  currency,
  emptyLabel,
}: {
  rows: CategoryValueRow[];
  currency: (value: number) => string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="space-y-3.5">
      {rows.map((row, index) => (
        <li key={row.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={row.name}>
              {row.name}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-slate-900">
              {currency(row.value)}
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                {row.percent.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-violet-50">
            <div
              className={`h-full rounded-full ${BAR_SHADES[index] ?? "bg-violet-300"}`}
              style={{ width: `${Math.max(2, Math.min(100, row.percent))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
