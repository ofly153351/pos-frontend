// Dictionary shape for the Reports → Executive Sales Dashboard (รายงานสรุป).
// SALES focused — no inventory/stock vocabulary. Structurally matches
// locales/{th,en}.json `summaryReport`.

export type SummaryDictionary = {
  title: string;
  subtitle: string;
  loading: string;
  period: {
    d7: string;
    d30: string;
    d90: string;
    custom: string;
    from: string;
    to: string;
    apply: string;
    rangeLabel: string; // {from} {to}
  };
  exports: {
    print: string;
    csv: string;
    csvFilename: string;
  };
  kpi: {
    revenue: string;
    orders: string;
    avgOrderValue: string;
    productsSold: string;
    profit: string;
    customers: string;
    ordersSuffix: string;
    itemsSuffix: string;
    customersSuffix: string;
    grossProfitHint: string; // {value}
  };
  salesTrend: {
    title: string;
    subtitle: string;
    revenue: string;
    profit: string;
    empty: string;
  };
  salesByCategory: {
    title: string;
    subtitle: string;
    empty: string;
    others: string;
    uncategorized: string;
  };
  topRanked: {
    title: string;
    subtitle: string;
    soldSuffix: string;
    empty: string;
  };
  paymentBreakdown: {
    title: string;
    subtitle: string;
    empty: string;
  };
  method: { cash: string; transfer: string; qr: string; credit: string; card: string; unknown: string };
  salesByHour: {
    title: string;
    subtitle: string;
    empty: string;
  };
  businessSnapshot: {
    title: string;
    subtitle: string;
    avgDailySales: string;
    avgDailyOrders: string;
    revenueGrowth: string;
    profitMargin: string;
    noBaseline: string;
  };
  topTable: {
    title: string;
    subtitle: string;
    colRank: string;
    colProduct: string;
    colQty: string;
    colRevenue: string;
    colProfit: string;
    empty: string;
  };
};
