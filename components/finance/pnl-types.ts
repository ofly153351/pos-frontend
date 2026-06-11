// Dictionary shape for the Finance → Profit & Loss (P&L) page.
// Structurally matches locales/{th,en}.json `financePnl`.

export type PnlDictionary = {
  title: string;
  subtitle: string;
  loading: string;
  period: {
    label: string;
    d7: string;
    d30: string;
    d90: string;
    custom: string;
    from: string;
    to: string;
    apply: string;
    rangeLabel: string; // uses {from} and {to}
  };
  kpi: {
    netRevenue: string;
    grossProfit: string;
    operatingExpenses: string;
    netProfit: string;
    netMargin: string;
    salesCountSuffix: string;
  };
  statement: {
    title: string;
    subtitle: string;
    revenue: string;
    discountInfo: string;
    vatInfo: string;
    refunds: string;
    refundsNote: string;
    netRevenue: string;
    cogs: string;
    grossProfit: string;
    grossMargin: string;
    operatingExpenses: string;
    netProfit: string;
    netMargin: string;
    profitBadge: string;
    lossBadge: string;
  };
  ratios: {
    title: string;
    grossMargin: string;
    netMargin: string;
    expenseRatio: string;
    costRatio: string;
  };
  lossBanner: {
    title: string;
    desc: string;
  };
  dataQuality: {
    title: string;
    missingCost: string; // uses {count}
    itemsSuffix: string;
  };
  rcp: {
    title: string;
    subtitle: string;
    revenue: string;
    cost: string;
    profit: string;
    empty: string;
  };
  expenseBreakdown: {
    title: string;
    subtitle: string;
    empty: string;
    uncategorized: string;
  };
  paymentBreakdown: {
    title: string;
    subtitle: string;
    empty: string;
  };
  method: { cash: string; transfer: string; qr: string; credit: string; card: string; unknown: string };
  empty: string;
};
