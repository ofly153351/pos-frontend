export type WarehousePeriod = "7d" | "30d" | "3m";

export type WarehouseKPI = {
  stock_value: number;
  stock_value_change_pct: number;
  total_skus: number;
  available_stock_qty: number;
  low_stock_count: number;
  out_of_stock_count: number;
  in_transit_stock_qty: number;
  pending_transfer_requests: number;
  received_today_qty: number;
  received_today_value: number;
  issued_today_qty: number;
  issued_today_value: number;
  transferred_today_qty: number;
  transferred_today_value: number;
};

export type MovementChartPoint = {
  date: string; // "2026-05-18"
  receive_value: number;
  issue_value: number;
  transfer_value: number;
  total_value: number;
};

export type LowStockAlert = {
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  total_stock: number;
  min_stock: number;
  alert_level: "critical" | "warning";
};

export type TopSeller = {
  rank: number;
  product_id: string;
  name: string;
  unit: string;
  today_qty: number;
  week_qty: number;
  today_value: number;
  trend_pct: number;
};

export type WarehouseDistribution = {
  warehouse_id: string;
  name: string;
  total_value: number;
  fill_pct: number;
};

export type RecentActivity = {
  id: string;
  type: string;
  description: string;
  reference_id: string;
  time: string;
  created_at: string;
  product_name: string;
  unit: string;
  quantity_change: number;
  location_name: string;
  destination_location_name: string;
};

export type WarehouseDashboardData = {
  kpi: WarehouseKPI;
  movement_chart: MovementChartPoint[];
  low_stock_alerts: LowStockAlert[];
  top_sellers: TopSeller[];
  warehouse_distribution: WarehouseDistribution[];
  recent_activity: RecentActivity[];
};
