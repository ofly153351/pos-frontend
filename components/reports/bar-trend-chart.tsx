"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Reusable vertical bar-trend chart (e.g. 6-month expense trend). Built on the
// project's existing Recharts dependency. The most recent bar is highlighted.
export type BarTrendDatum = {
  label: string;
  value: number;
};

export function BarTrendChart({
  data,
  currency,
  emptyLabel,
  height = 200,
}: {
  data: BarTrendDatum[];
  currency: (value: number) => string;
  emptyLabel: string;
  height?: number;
}) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(124,58,237,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #ede9fe", fontSize: 12 }}
          formatter={(value) => [currency(Number(value)), ""] as [string, string]}
          labelStyle={{ color: "#64748b", fontWeight: 600 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={i === data.length - 1 ? "#7c3aed" : "#c4b5fd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
