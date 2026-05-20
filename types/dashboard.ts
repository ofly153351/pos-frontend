export type DashboardPeriod = "today" | "7d" | "30d";

export type DashboardQueryInput = {
  from?: string;
  low_stock_limit?: number;
  low_stock_threshold?: number;
  period?: DashboardPeriod;
  recent_limit?: number;
  to?: string;
  top_limit?: number;
};

export type DashboardRange = {
  from: string;
  period: string;
  to: string;
};

export type DashboardSummary = {
  average_ticket: number;
  discount_amount: number;
  revenue: number;
  sales_count: number;
  total_items: number;
  vat_amount: number;
};

export type DashboardPaymentBreakdownItem = {
  amount: number;
  payment_method: string;
  sales_count: number;
};

export type DashboardTopProduct = {
  amount: number;
  product_id: string;
  product_name: string;
  quantity_sold: number;
};

export type DashboardLowStockProduct = {
  name: string;
  product_id: string;
  quantity: number;
  total_stock?: number;
  sku?: string;
  unit_type?: string;
};

export type DashboardRecentSale = {
  cashier_name?: string;
  customer_name?: string;
  id: string;
  payment_method: string;
  sale_number: string;
  sold_at: string;
  total_amount: number;
  total_items: number;
};

export type StoreDashboard = {
  low_stock_products: DashboardLowStockProduct[];
  payment_breakdown: DashboardPaymentBreakdownItem[];
  range: DashboardRange;
  recent_sales: DashboardRecentSale[];
  summary: DashboardSummary;
  top_products: DashboardTopProduct[];
};
