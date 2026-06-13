// Mirrors the Go finance module API (pos-backend/internal/modules/finance).
// The P&L report returns raw components; the UI derives gross/net profit and
// the margin ratios from them.

export type PnlRange = {
  /** "7d" | "30d" | "90d" | "custom" */
  period: string;
  from: string;
  to: string;
};

export type PnlRevenue = {
  sales_count: number;
  /** SUM(sales.total_amount) — what customers paid (VAT-inclusive). */
  gross_revenue: number;
  discount_amount: number;
  vat_amount: number;
  /** Returns/refunds — reserved, always 0 (not tracked yet). */
  refunds: number;
};

export type PnlCogs = {
  /** SUM(sale_item.quantity * product.cost_price) at current cost. */
  total: number;
  /** Count of sold lines with no/zero cost (deleted product or unset cost). */
  missing_cost_lines: number;
};

export type PnlCategoryTotal = {
  category_id: string;
  name: string;
  total: number;
};

export type PnlPaymentMethod = {
  payment_method: string;
  sales_count: number;
  amount: number;
};

export type PnlReport = {
  range: PnlRange;
  revenue: PnlRevenue;
  cogs: PnlCogs;
  operating_expenses: number;
  expense_by_category: PnlCategoryTotal[];
  payment_breakdown: PnlPaymentMethod[];
};

// ── Executive Summary (Reports → Summary dashboard) — SALES focused ──

export type SummaryTrendPoint = {
  /** "YYYY-MM-DD" */
  day: string;
  revenue: number;
  cogs: number;
  /** Gross profit (revenue − cogs) for the day. */
  profit: number;
};

export type SummaryTopProduct = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  /** Revenue − (quantity × current cost). */
  profit: number;
};

export type SummaryHourStat = {
  /** 0–23 (UTC). */
  hour: number;
  revenue: number;
  orders: number;
};

export type ExecutiveSummary = {
  range: PnlRange;
  revenue: number;
  /** Revenue of the immediately preceding equal-length window (growth basis). */
  previous_revenue: number;
  cogs: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
  orders: number;
  /** Total units sold (SUM of sale-item quantities). */
  products_sold: number;
  /** Distinct identified customers (walk-in/anonymous sales excluded). */
  customers: number;
  average_order_value: number;
  sales_trend: SummaryTrendPoint[];
  top_products: SummaryTopProduct[];
  category_breakdown: PnlCategoryTotal[];
  payment_breakdown: PnlPaymentMethod[];
  sales_by_hour: SummaryHourStat[];
};

// Inventory Value & Dead Stock report — DB aggregates (no client-side movement scan).
export type InventorySnapshot = {
  inventory_value: number; // SUM(cost_price * total_stock) over in-stock active products
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  missing_cost: number;
};

export type DeadStockStat = {
  days: number; // idle threshold the count/value were computed for
  count: number;
  value: number; // tied capital at cost
};

export type InventoryReport = {
  snapshot: InventorySnapshot;
  dead_stock: DeadStockStat;
};
