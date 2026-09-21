import type { ReportsInventoryDictionary } from "@/components/reports/reports-types";
import type { ReactNode } from "react";
import type { SummaryDictionary } from "@/components/reports/summary-types";
import type { HeroPeriod } from "@/components/shared/dashboard-hero";

export type BarTrendChartBarTrendDatum = {
  label: string;
  value: number;
};

export type CategoryDonutChartDonutDatum = { name: string; value: number };

export type CategoryValueBarsCategoryValueRow = {
  name: string;
  value: number;
  percent: number;
  /** "outstanding" renders the row in amber + a note — used for ขายเชื่อ/ค้างชำระ,
   *  which is money NOT yet collected (so it reads differently from real tenders). */
  accent?: "outstanding";
  /** Optional sub-note shown under the label (e.g. "ยังไม่ได้รับเงิน"). */
  note?: string;
};

export type InventoryValueManagerProps = { dictionary: ReportsInventoryDictionary; locale: string };

export type InventoryValueManagerDeadDays = 30 | 60 | 90;

export type ReportKpiCardReportKpiCardProps = {
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
  /** Optional node rendered below the hint (e.g. a trend badge). */
  footer?: ReactNode;
  /** Extra classes for the outer article (e.g. grid col-span passthrough). */
  className?: string;
  /** Show a skeleton placeholder in place of the value (hides hint/footer). */
  loading?: boolean;
};

export type RevenueProfitLineChartRevenueProfitDatum = {
  label: string;
  revenue: number;
  profit: number;
};

export type SummaryManagerProps = { dictionary: SummaryDictionary; locale: string };

export type SummaryManagerTab = HeroPeriod;

export type InventoryValueManagerKpiItem = {
  label: string;
  value: string;
  icon: import("lucide-react").LucideIcon;
  iconBg: string;
  iconColor: string;
  emphasis?: boolean;
  warning?: boolean;
  warningHint?: string;
  valueTone?: "default" | "danger";
  hint?: string;
};

export type SummaryManagerKpiItem = {
  label: string;
  value: string;
  icon: import("lucide-react").LucideIcon;
  iconBg: string;
  iconColor: string;
  hint?: string;
  emphasis?: boolean;
  warning?: boolean;
  valueTone?: "default" | "danger";
};
