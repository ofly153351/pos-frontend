// Explicit dictionary shape for the Reports → Inventory Value & Dead Stock page.
// Structurally matches locales/{th,en}.json `reportsInventory` section so the
// server page can pass `dictionary.reportsInventory` straight through.

export type ReportsInventoryDictionary = {
  title: string;
  subtitle: string;
  loading: string;
  activeOnlyNote: string;
  /** Uses {count} placeholder. */
  missingCostNote: string;
  kpi: {
    totalCost: string;
    retailValue: string;
    expectedProfit: string;
    totalSku: string;
    totalUnits: string;
    unitsSuffix: string;
    skuSuffix: string;
    abnormalHint: string;
    riskTitle: string;
    riskHigh: string;
    riskIssuesSuffix: string;
  };
  dataQuality: {
    title: string;
    subtitle: string;
    allClear: string;
    missingCost: string;
    costExceedsPrice: string;
    negativeProfit: string;
    itemsSuffix: string;
  };
  category: {
    title: string;
    subtitle: string;
    empty: string;
    others: string;
    uncategorized: string;
    /** Both use {category} and {percent} placeholders. */
    concentrationHigh: string;
    concentrationMedium: string;
  };
  topSelling: {
    title: string;
    subtitle: string;
    colRank: string;
    colProduct: string;
    colQtySold: string;
    colRevenue: string;
    colContribution: string;
    empty: string;
  };
  deadStock: {
    title: string;
    subtitle: string;
    filterLabel: string;
    filter30: string;
    filter60: string;
    filter90: string;
    countLabel: string;
    capitalLabel: string;
    capitalHint: string;
    colProduct: string;
    colCurrentStock: string;
    colValue: string;
    colLastSold: string;
    colDaysSince: string;
    colStockAge: string;
    colStatus: string;
    colAction: string;
    neverSold: string;
    daysSuffix: string;
    statusNormal: string;
    statusWarning: string;
    statusCritical: string;
    actionReview: string;
    actionDiscount: string;
    actionClearance: string;
    actionReturnSupplier: string;
    empty: string;
    windowNote: string;
  };
};
