// Revenue vs Cost vs Profit comparison — three horizontal bars sized against the
// largest magnitude. Pure CSS (no Recharts), values always visible so it stays
// touch-friendly on Android POS / tablet. Profit turns red when negative.

export type RcpRow = {
  label: string;
  value: number;
  tone: "revenue" | "cost" | "profit";
};

const TONE_BAR: Record<RcpRow["tone"], string> = {
  revenue: "bg-violet-500",
  cost: "bg-rose-400",
  profit: "bg-emerald-500",
};

export function RevenueCostProfitBars({
  rows,
  currency,
  emptyLabel,
}: {
  rows: RcpRow[];
  currency: (value: number) => string;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const hasData = rows.some((r) => r.value !== 0);

  if (!hasData) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const negative = row.value < 0;
        // A negative profit reads as a loss — flip the bar to red regardless of tone.
        const barClass = negative ? "bg-rose-500" : TONE_BAR[row.tone];
        const width = Math.max(2, (Math.abs(row.value) / max) * 100);
        return (
          <li key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={row.label}>
                {row.label}
              </span>
              <span
                className={`shrink-0 font-bold tabular-nums ${negative ? "text-rose-600" : "text-slate-900"}`}
              >
                {negative ? `-${currency(Math.abs(row.value))}` : currency(row.value)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
