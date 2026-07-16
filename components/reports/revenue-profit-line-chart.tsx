"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Sales-performance trend: revenue as a filled area (gives the chart dashboard
// presence) with gross profit as an overlaid line. Built on the project's
// existing Recharts dependency. Touch-friendly: values surface in the tooltip.
export type RevenueProfitDatum = {
  label: string;
  revenue: number;
  profit: number;
};

export function RevenueProfitLineChart({
  data,
  currency,
  emptyLabel,
  revenueLabel,
  profitLabel,
  height = 300,
}: {
  data: RevenueProfitDatum[];
  currency: (value: number) => string;
  emptyLabel: string;
  revenueLabel: string;
  profitLabel: string;
  height?: number;
}) {
  const hasData = data.some((d) => d.revenue !== 0 || d.profit !== 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  // Thin X labels so dense ranges (e.g. 90 daily points) stay readable.
  const tickInterval = Math.max(0, Math.floor(data.length / 8));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
          minTickGap={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v))}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #ede9fe", fontSize: 12 }}
          labelStyle={{ color: "#64748b", fontWeight: 600 }}
          formatter={(value, name) => [currency(Number(value)), name as string] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name={revenueLabel}
          stroke="#7c3aed"
          strokeWidth={2.5}
          fill="#7c3aed"
          fillOpacity={0.08}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name={profitLabel}
          stroke="#059669"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
