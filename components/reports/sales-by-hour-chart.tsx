"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { SummaryHourStat } from "@/types/finance";

// Sales-by-hour bar chart. Fills the full 0–23 grid (zero for hours with no
// sales) and highlights the peak-revenue hour. Shows an empty state rather than
// fabricated data when there are no sales in the window.
export function SalesByHourChart({
  hours,
  currency,
  emptyLabel,
  height = 200,
}: {
  hours: SummaryHourStat[];
  currency: (value: number) => string;
  emptyLabel: string;
  height?: number;
}) {
  const data = useMemo(() => {
    const byHour = new Map(hours.map((h) => [h.hour, h]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: String(hour).padStart(2, "0"),
      revenue: byHour.get(hour)?.revenue ?? 0,
    }));
  }, [hours]);

  const peak = useMemo(() => data.reduce((max, d) => (d.revenue > max ? d.revenue : max), 0), [data]);

  if (peak <= 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 4 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(124,58,237,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #ede9fe", fontSize: 12 }}
          formatter={(value) => [currency(Number(value)), ""] as [string, string]}
          labelFormatter={(label) => `${label}:00`}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={20}>
          {data.map((d) => (
            <Cell key={d.hour} fill={d.revenue === peak ? "#7c3aed" : "#c4b5fd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
