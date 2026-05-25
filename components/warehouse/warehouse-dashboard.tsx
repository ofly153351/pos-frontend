"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  DollarSign,
  Loader2,
  Package,
  PackageOpen,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getWarehouseDashboard } from "@/services/warehouse-dashboard";
import type {
  LowStockAlert,
  MovementChartPoint,
  RecentActivity,
  TopSeller,
  WarehouseDashboardData,
  WarehouseDistribution,
  WarehouseKPI,
  WarehousePeriod,
} from "@/types/warehouse-dashboard";

// ── Palette for warehouse donut chart ────────────────────────────────────────

const WAREHOUSE_COLORS = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#6366F1", "#14B8A6"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtFull(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string) {
  const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = new Date(iso);
  return `${d.getDate()} ${thMonths[d.getMonth()]}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  badge,
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  badge?: { text: string; color: string };
  trend?: { value: number; label: string };
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm md:p-7">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </span>
        {badge ? (
          <span className={`rounded-full px-3 py-1 text-base font-semibold ${badge.color}`}>
            {badge.text}
          </span>
        ) : null}
        {trend ? (
          <span
            className={`flex items-center gap-1.5 text-base font-semibold ${
              trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-4xl font-black leading-tight tracking-tight text-slate-800">{value}</p>
        <p className="mt-1 text-lg font-semibold leading-relaxed text-slate-600">{label}</p>
        {sub ? <p className="mt-1.5 text-base leading-relaxed text-slate-500">{sub}</p> : null}
        {trend ? <p className="mt-1.5 text-base leading-relaxed text-slate-500">{trend.label}</p> : null}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-violet-50 px-6 py-5 md:px-7 md:py-6">
        <div className="text-xl font-semibold leading-relaxed text-slate-800">{title}</div>
        {action ? (
          <span className="cursor-pointer text-base font-semibold text-violet-600 hover:text-violet-800">
            {action}
          </span>
        ) : null}
      </div>
      <div className="flex-1 p-6 md:p-7">{children}</div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    IN: { bg: "bg-emerald-100", icon: <ArrowDownToLine className="h-5 w-5 text-emerald-600" /> },
    TRANSFER: { bg: "bg-amber-100", icon: <ArrowLeftRight className="h-5 w-5 text-amber-600" /> },
    OUT: { bg: "bg-rose-100", icon: <ArrowUpFromLine className="h-5 w-5 text-rose-600" /> },
    SALE: { bg: "bg-rose-100", icon: <ArrowUpFromLine className="h-5 w-5 text-rose-600" /> },
    ADJUST: { bg: "bg-blue-100", icon: <RefreshCw className="h-5 w-5 text-blue-600" /> },
    RETURN: { bg: "bg-emerald-100", icon: <ArrowDownToLine className="h-5 w-5 text-emerald-600" /> },
  };
  const { bg, icon } = map[type] ?? map.ADJUST;
  return (
    <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg}`}>
      {icon}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = {
    receive_value: "รับเข้า",
    issue_value: "จ่ายออก",
    transfer_value: "โอน",
    total_value: "มูลค่ารวม",
  };
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-lg text-base">
      <p className="mb-2 text-base font-semibold text-slate-700">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-base text-slate-500">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: entry.color }} />
            {labelMap[entry.name] ?? entry.name}
          </span>
          <span className="text-base font-semibold text-slate-800">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-violet-100/60 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7">
      <div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="mt-3 h-6 w-[32rem]" />
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-5">
        <Skeleton className="h-96 lg:col-span-3" />
        <Skeleton className="h-96 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <Skeleton className="h-72 lg:col-span-5" />
        <Skeleton className="h-72 lg:col-span-4" />
        <Skeleton className="h-72 lg:col-span-3" />
      </div>
    </div>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────

function KpiSection({ kpi }: { kpi: WarehouseKPI }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        icon={<DollarSign className="h-7 w-7 text-violet-600" />}
        iconBg="bg-violet-100"
        label="มูลค่าสินค้าคงเหลือ"
        value={fmt(kpi.stock_value)}
        trend={{ value: kpi.stock_value_change_pct, label: "เทียบ 30 วันก่อน" }}
      />
      <KpiCard
        icon={<Package className="h-7 w-7 text-teal-600" />}
        iconBg="bg-teal-100"
        label="จำนวน SKU ทั้งหมด"
        value={`${kpi.total_skus.toLocaleString()} รายการ`}
        badge={
          kpi.low_stock_count > 0
            ? { text: `${kpi.low_stock_count} ใกล้หมด`, color: "bg-amber-100 text-amber-700" }
            : undefined
        }
      />
      <KpiCard
        icon={<ArrowDownToLine className="h-7 w-7 text-emerald-600" />}
        iconBg="bg-emerald-100"
        label="รับเข้าวันนี้"
        value={`${kpi.received_today_qty.toLocaleString()} รายการ`}
        sub={`มูลค่า ${fmt(kpi.received_today_value)}`}
      />
      <KpiCard
        icon={<ArrowUpFromLine className="h-7 w-7 text-rose-600" />}
        iconBg="bg-rose-100"
        label="จ่ายออกวันนี้"
        value={`${kpi.issued_today_qty.toLocaleString()} รายการ`}
        sub={`มูลค่า ${fmt(kpi.issued_today_value)}`}
      />
      <KpiCard
        icon={<ArrowLeftRight className="h-7 w-7 text-orange-600" />}
        iconBg="bg-orange-100"
        label="โอนย้ายวันนี้"
        value={`${kpi.transferred_today_qty.toLocaleString()} รายการ`}
        sub={`มูลค่า ${fmt(kpi.transferred_today_value)}`}
      />
    </div>
  );
}

function MovementChartSection({
  chart,
  period,
  onPeriodChange,
}: {
  chart: MovementChartPoint[];
  period: WarehousePeriod;
  onPeriodChange: (p: WarehousePeriod) => void;
}) {
  const data = chart.map((p) => ({ ...p, date: shortDate(p.date) }));
  return (
    <SectionCard
      title="การเคลื่อนไหวสินค้า"
      action={
        <div className="flex gap-1">
          {(["7d", "30d", "3m"] as WarehousePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                period === p ? "bg-violet-600 text-white" : "text-violet-600 hover:bg-violet-50"
              }`}
              type="button"
            >
              {p === "7d" ? "7 วัน" : p === "30d" ? "30 วัน" : "3 เดือน"}
            </button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <div className="flex h-60 items-center justify-center text-base text-slate-400">
          ไม่มีข้อมูลการเคลื่อนไหวในช่วงนี้
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0eaff" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  receive_value: "รับเข้า",
                  issue_value: "จ่ายออก",
                  transfer_value: "โอน",
                  total_value: "มูลค่ารวม",
                };
                return <span className="text-xs text-slate-500">{map[value] ?? value}</span>;
              }}
            />
            <Bar yAxisId="left" dataKey="receive_value" fill="#7C3AED" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="left" dataKey="issue_value" fill="#F472B6" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="left" dataKey="transfer_value" fill="#FB923C" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total_value"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={{ r: 3, fill: "#7C3AED" }}
              strokeDasharray="5 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

function LowStockSection({ alerts }: { alerts: LowStockAlert[] }) {
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          แจ้งเตือน ({alerts.length})
        </span>
      }
      action="ดูทั้งหมด ›"
    >
      {alerts.length === 0 ? (
        <p className="text-base text-slate-400">ไม่มีสินค้าใกล้หมดสต็อก</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((item) => {
            const isCritical = item.alert_level === "critical";
            return (
              <div
                key={item.product_id}
                className="flex items-center gap-3 rounded-lg border border-violet-50 bg-violet-50/30 px-4 py-3"
              >
                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                    isCritical ? "bg-rose-100" : "bg-amber-100"
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 ${isCritical ? "text-rose-600" : "text-amber-600"}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    คงเหลือ {item.total_stock} / {item.min_stock} {item.unit}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-3 py-0.5 text-sm font-bold ${
                      isCritical ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isCritical ? "น้อยมาก" : "ใกล้หมด"}
                  </span>
                  <button className="text-sm font-medium text-violet-600 hover:text-violet-800" type="button">
                    เติมสต็อก
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function TopSellersSection({ sellers }: { sellers: TopSeller[] }) {
  return (
    <SectionCard title="สินค้าขายดี (Top 5)" action="ดูรายงาน ›">
      {sellers.length === 0 ? (
        <p className="text-base text-slate-400">ไม่มีข้อมูลการขายในช่วงนี้</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-violet-50 text-sm font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-3 text-left">#</th>
                <th className="pb-3 text-left">สินค้า</th>
                <th className="pb-3 text-right">วันนี้</th>
                <th className="pb-3 text-right">7 วัน</th>
                <th className="pb-3 text-right">มูลค่า</th>
                <th className="pb-3 text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((row) => (
                <tr key={row.product_id} className="border-b border-violet-50/60 last:border-0">
                  <td className="py-3 pr-2 font-bold text-violet-400">{row.rank}</td>
                  <td className="py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="py-3 text-right text-slate-600">
                    {row.today_qty} {row.unit}
                  </td>
                  <td className="py-3 text-right text-slate-500">
                    {row.week_qty} {row.unit}
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-700">
                    {fmtFull(row.today_value)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`flex items-center justify-end gap-0.5 text-sm font-bold ${
                        row.trend_pct >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {row.trend_pct >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {row.trend_pct >= 0 ? "+" : ""}
                      {row.trend_pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function WarehouseDonutSection({ distribution }: { distribution: WarehouseDistribution[] }) {
  const total = distribution.reduce((s, w) => s + w.total_value, 0);
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-violet-500" />
          การกระจายสินค้าตามคลัง
        </span>
      }
      action="ดูทั้งหมด ›"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <PieChart width={180} height={180}>
            <Pie
              data={distribution.length > 0 ? distribution : [{ name: "ว่าง", total_value: 1 }]}
              cx={85}
              cy={85}
              innerRadius={54}
              outerRadius={80}
              paddingAngle={2}
              dataKey="total_value"
              strokeWidth={0}
            >
              {distribution.map((_, i) => (
                <Cell key={i} fill={distribution[i].total_value > 0 ? WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length] : "#e5e7eb"} />
              ))}
              {distribution.length === 0 && <Cell fill="#e5e7eb" />}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-black text-slate-800">{distribution.length}</p>
            <p className="text-xs text-slate-500">คลัง</p>
          </div>
        </div>

        <div className="w-full space-y-2">
          {distribution.map((wh, i) => (
            <div key={wh.warehouse_id}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: wh.total_value > 0 ? WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length] : "#d1d5db" }}
                  />
                  {wh.name}
                </span>
                <span className="font-semibold text-slate-700">
                  {wh.total_value > 0 ? fmt(wh.total_value) : "—"}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-violet-100/50">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${total > 0 ? (wh.total_value / total) * 100 : 0}%`,
                    background: wh.total_value > 0 ? WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length] : "transparent",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ActivitySection({ activity }: { activity: RecentActivity[] }) {
  return (
    <SectionCard title="กิจกรรมล่าสุด" action="ดูทั้งหมด ›">
      {activity.length === 0 ? (
        <p className="text-base text-slate-400">ยังไม่มีกิจกรรม</p>
      ) : (
        <div className="space-y-3">
          {activity.slice(0, 8).map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <ActivityIcon type={item.type} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-slate-700">{item.description}</p>
                {item.reference_id ? (
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{item.reference_id}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SummaryBar({ kpi }: { kpi: WarehouseKPI }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-6 py-5">
      <div className="flex flex-wrap items-center gap-6 text-base">
        <div className="flex items-center gap-2">
          <PackageOpen className="h-5 w-5 text-violet-500" />
          <span className="text-slate-500">มูลค่ารวมทุกคลัง:</span>
          <span className="font-bold text-slate-800">{fmt(kpi.stock_value)}</span>
        </div>
        <div className="h-5 w-px bg-violet-200" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">รับเข้าวันนี้:</span>
          <span className="font-bold text-emerald-700">{fmt(kpi.received_today_value)}</span>
        </div>
        <div className="h-5 w-px bg-violet-200" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">จ่ายออกวันนี้:</span>
          <span className="font-bold text-rose-700">{fmt(kpi.issued_today_value)}</span>
        </div>
        {kpi.low_stock_count > 0 ? (
          <>
            <div className="h-5 w-px bg-violet-200" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">แจ้งเตือนที่ต้องดูแล:</span>
              <span className="font-bold text-amber-700">{kpi.low_stock_count} รายการ</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WarehouseDashboard() {
  const [period, setPeriod] = useState<WarehousePeriod>("7d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["warehouse-dashboard", period],
    queryFn: async () => {
      const res = await getWarehouseDashboard(period);
      return res.data as WarehouseDashboardData;
    },
    staleTime: 60_000, // 60 s — matches backend KPI TTL
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">แดชบอร์ดคลังสินค้า</h1>
          <p className="mt-1.5 text-base text-slate-500">
            ภาพรวมการเคลื่อนไหวสินค้า สต็อกคงเหลือ และการแจ้งเตือน
          </p>
        </div>
        {!isLoading && (
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50"
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </button>
        )}
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-rose-100 bg-rose-50 py-16 text-center">
          <p className="text-lg font-semibold text-rose-700">ไม่สามารถโหลดข้อมูลได้</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-rose-600 px-5 py-2.5 text-base font-medium text-white hover:bg-rose-700"
            type="button"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {data && (
        <>
          <KpiSection kpi={data.kpi} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MovementChartSection
                chart={data.movement_chart}
                period={period}
                onPeriodChange={setPeriod}
              />
            </div>
            <div className="lg:col-span-2">
              <LowStockSection alerts={data.low_stock_alerts} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <TopSellersSection sellers={data.top_sellers} />
            </div>
            <div className="lg:col-span-4">
              <WarehouseDonutSection distribution={data.warehouse_distribution} />
            </div>
            <div className="lg:col-span-3">
              <ActivitySection activity={data.recent_activity} />
            </div>
          </div>

          <SummaryBar kpi={data.kpi} />
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-base text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      )}
    </div>
  );
}
