"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Sales-by-category donut. Solid violet ramp (no gradients, per the design
// system). Slices + a compact legend with share %. Total revenue sits in the
// centre. Touch-friendly: shares are always visible in the legend, not hover-only.
export type DonutDatum = { name: string; value: number };

const SLICE_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9", "#ddd6fe"];
const TOP_SLICES = 6;

export function CategoryDonutChart({
  rows,
  currency,
  emptyLabel,
  othersLabel,
  uncategorizedLabel,
}: {
  rows: DonutDatum[];
  currency: (value: number) => string;
  emptyLabel: string;
  othersLabel: string;
  uncategorizedLabel: string;
}) {
  const { slices, total } = useMemo(() => {
    const named = rows.map((r) => ({ name: r.name?.trim() || uncategorizedLabel, value: r.value }));
    const sorted = [...named].sort((a, b) => b.value - a.value);
    let head = sorted;
    if (sorted.length > TOP_SLICES) {
      const top = sorted.slice(0, TOP_SLICES - 1);
      const rest = sorted.slice(TOP_SLICES - 1).reduce((sum, c) => sum + c.value, 0);
      head = [...top, { name: othersLabel, value: rest }];
    }
    const sum = head.reduce((acc, c) => acc + c.value, 0);
    return { slices: head, total: sum };
  }, [rows, othersLabel, uncategorizedLabel]);

  if (total <= 0) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">{emptyLabel}</div>;
  }

  return (
    <div>
      <div className="relative mx-auto" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #ede9fe", fontSize: 12 }}
              formatter={(value) => [currency(Number(value)), ""] as [string, string]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{slices.length}</span>
          <span className="max-w-[110px] truncate text-sm font-black text-slate-900">{currency(total)}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-600" title={s.name}>{s.name}</span>
            <span className="shrink-0 font-bold tabular-nums text-slate-900">{((s.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
