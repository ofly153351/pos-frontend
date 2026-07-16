"use client";

import { AlertTriangle, Boxes, Coins, Package } from "lucide-react";

import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { SkeletonKPICard } from "@/components/ui/skeleton";
import type { WarehouseInventorySummary } from "@/types/warehouse-inventory";
import { formatCurrency, formatNumber } from "./utils";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  dict: WarehouseInventoryDictionary;
  summary: WarehouseInventorySummary | undefined;
  loading: boolean;
};

export function WarehouseKpiGrid({ dict, summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonKPICard key={i} />
        ))}
      </div>
    );
  }

  const attention = summary.low_stock_count + summary.out_of_stock_count;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ReportKpiCard
        label={dict.kpiProducts}
        value={formatNumber(summary.product_count)}
        hint={dict.kpiProductsHint}
        icon={<Package className="h-5 w-5" />}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
      />
      <ReportKpiCard
        label={dict.kpiOnHand}
        value={`${formatNumber(summary.total_stock)}`}
        hint={`${dict.kpiOnHandHint} · ${dict.unitSuffix}`}
        icon={<Boxes className="h-5 w-5" />}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
      />
      <ReportKpiCard
        label={dict.kpiValue}
        value={formatCurrency(summary.inventory_value)}
        hint={dict.kpiValueHint}
        icon={<Coins className="h-5 w-5" />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
      />
      <ReportKpiCard
        label={dict.kpiAttention}
        value={formatNumber(attention)}
        hint={`${dict.kpiLow} ${formatNumber(summary.low_stock_count)} · ${dict.kpiOut} ${formatNumber(summary.out_of_stock_count)}`}
        icon={<AlertTriangle className="h-5 w-5" />}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        warning={attention > 0}
        valueTone={summary.out_of_stock_count > 0 ? "danger" : "default"}
      />
    </div>
  );
}
