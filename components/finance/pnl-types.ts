// Dictionary shape for the Finance → Profit & Loss (P&L) page.
// Structurally matches locales/{th,en}.json `financePnl`.

export type PnlDictionary = {
  title: string;
  subtitle: string;
  loading: string;
  period: {
    label: string;
    today: string;
    d7: string;
    d30: string;
    d90: string;
    custom: string;
    from: string;
    to: string;
    apply: string;
    refresh: string;
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
    subtitle: string;
    grossMargin: string;
    netMargin: string;
    expenseRatio: string;
    costRatio: string;
  };
  flow: {
    title: string;
    subtitle: string;
  };
  trend: {
    title: string;
    subtitle: string;
    revenue: string;
    profit: string;
    note: string;
    empty: string;
  };
  topExpenses: {
    title: string;
    subtitle: string;
  };
  lossBanner: {
    title: string;
    desc: string;
  };
  dataQuality: {
    title: string;
    missingCost: string; // uses {count}
    itemsSuffix: string;
    impact: string;
    cta: string;
  };
  insights: {
    title: string;
    subtitle: string;
    missingCostTitle: string;
    missingCostDesc: string; // uses {count}
    lossTitle: string;
    lossDesc: string;
    lowMarginTitle: string;
    lowMarginDesc: string; // uses {margin}
    healthyMarginTitle: string;
    healthyMarginDesc: string; // uses {margin}
    highExpenseTitle: string;
    highExpenseDesc: string; // uses {ratio}
    topExpenseTitle: string;
    topExpenseDesc: string; // uses {name} and {value}
    empty: string;
    emptyDesc: string;
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
