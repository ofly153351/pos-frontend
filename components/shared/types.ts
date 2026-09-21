import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type CameraScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

export type CameraScannerScanState = "starting" | "scanning" | "error";

export type DashboardHeroHeroPeriod = "today" | "7d" | "30d" | "90d" | "custom";

export type DashboardHeroHeroPeriodOption<P extends string = DashboardHeroHeroPeriod> = {
  value: P;
  label: string;
};

export type DashboardHeroHeroChip = {
  label: string;
  value: string;
  /** Optional tone override — defaults to white/violet-300 on the dark hero bg. */
  tone?: "default" | "success" | "warning" | "danger";
};

export type DashboardHeroHeroPeriodLabels = {
  today: string;
  d7: string;
  d30: string;
  d90: string;
  custom: string;
  from: string;
  to: string;
  apply: string;
  refresh: string;
};

export type DashboardHeroDashboardHeroProps<P extends string = DashboardHeroHeroPeriod> = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Formatted date range string shown after subtitle. */
  rangeLabel?: string;
  /** Active period tab. */
  period: P;
  onPeriodChange: (p: P) => void;
  periodLabels: DashboardHeroHeroPeriodLabels;
  /**
   * Explicit period pills. When omitted, defaults to the standard
   * today/7d/30d/90d set (plus a custom-range pill) built from `periodLabels`.
   * Pages whose backend supports a different window set (e.g. the warehouse
   * dashboard's 7d/30d/3m) pass their own options here.
   */
  periodOptions?: DashboardHeroHeroPeriodOption<P>[];
  /** Custom date range inputs — only needed when a "custom" pill is shown. */
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
  onApplyCustom?: () => void;
  customValid?: boolean;
  /** Compact KPI chips rendered inside the hero. */
  chips?: DashboardHeroHeroChip[];
  /** Loading state — spins refresh icon. */
  isLoading?: boolean;
  onRefresh?: () => void;
  /** Extra buttons rendered after the period pills (e.g. Print, Export). */
  actions?: ReactNode;
  /** Advanced filter panel content — rendered inside expandable area. */
  filterContent?: ReactNode;
};

export type DateRangeFilterDateFilterPreset = "today" | "7d" | "30d" | "all";

export type DateRangeFilterDateFilterValue = {
  preset: DateRangeFilterDateFilterPreset;
  custom?: {
    from: string;
    to: string;
  } | null;
};

export type DateRangeFilterDateRangeLabels = {
  today: string;
  sevenDays: string;
  thirtyDays: string;
  all: string;
  custom: string;
  startDate: string;
  endDate: string;
  cancel: string;
  apply: string;
};

export type DateRangeFilterProps = {
  value: DateRangeFilterDateFilterValue;
  onChange: (value: DateRangeFilterDateFilterValue) => void;
  labels: DateRangeFilterDateRangeLabels;
  locale?: string;
  className?: string;
  buttonClassName?: string;
};

export type ScanButtonScanButtonProps = {
  /** Called with the decoded barcode/SKU string once the camera detects a code. */
  onScan: (code: string) => void;
  /** Tooltip + aria-label. Pass a localized string; falls back to Thai. */
  title?: string;
  disabled?: boolean;
  /** Override the button styling to match the host input's height/shape. */
  className?: string;
};
