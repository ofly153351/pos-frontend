import type { HeroPeriod } from "@/components/shared/dashboard-hero";

export type DashboardManagerDashboardDictionary = {
  actions: {
    newSaleDescription: string;
    newSaleTitle: string;
    stockDescription: string;
    stockTitle: string;
  };
  actionCenter: {
    title: string;
    lowStock: string;
    outOfStock: string;
    negativeStock: string;
    pendingCounts: string;
    pendingApprovals: string;
    critical: string;
    warning: string;
    info: string;
    viewItems: string;
    noIssues: string;
  };
  cards: {
    lowStockHint: string;
    lowStockLabel: string;
    ordersHint: string;
    ordersLabel: string;
    salesTodayHint: string;
    salesTodayLabel: string;
  };
  empty: string;
  emptyStates: {
    noSales: string;
    noSalesAction: string;
    noProducts: string;
    noStock: string;
    noStockAction: string;
    noActivity: string;
    noPayments: string;
  };
  filters: {
    apply: string;
    fromLabel: string;
    lowStockLimitLabel: string;
    lowStockThresholdLabel: string;
    period7d: string;
    period30d: string;
    periodCustom: string;
    periodLabel: string;
    periodToday: string;
    recentLimitLabel: string;
    refresh: string;
    toLabel: string;
    topLimitLabel: string;
  };
  hero: {
    storeOpen: string;
    storeClosed: string;
    totalSales: string;
    totalOrders: string;
    totalProfit: string;
    storeStatus: string;
    showingData: string;
  };
  inventoryAlerts: {
    title: string;
    lowStock: string;
    outOfStock: string;
    negativeStock: string;
    pendingCounts: string;
    viewAll: string;
    noAlerts: string;
  };
  kpi: {
    totalSales: string;
    totalOrders: string;
    totalProfit: string;
    averageBill: string;
    lowStockItems: string;
    outOfStockItems: string;
    customersServed: string;
    topProduct: string;
    vsPrevious: string;
    noChange: string;
    itemsUnit: string;
    noSalesYet: string;
  };
  loading: string;
  paymentMethods: {
    cash: string;
    transfer: string;
    qr: string;
    credit: string;
    card: string;
  };
  period90d: string;
  quickActions: {
    openPos: string;
    openPosDesc: string;
    receiveStock: string;
    receiveStockDesc: string;
    stockCount: string;
    stockCountDesc: string;
    createQuotation: string;
    createQuotationDesc: string;
    customers: string;
    customersDesc: string;
    promotions: string;
    promotionsDesc: string;
  };
  quickActionsTitle: string;
  recentOrders: {
    title: string;
    invoice: string;
    customer: string;
    total: string;
    payment: string;
    time: string;
    walkIn: string;
    viewAll: string;
    noOrders: string;
    openPos: string;
  };
  bestSellers: {
    title: string;
    qtySold: string;
    noBestSellers: string;
    openPos: string;
  };
  stockAttention: {
    title: string;
    outOfStockSection: string;
    lowStockSection: string;
    remaining: string;
    reorderPoint: string;
    warehouse: string;
    outOfStockBadge: string;
    lowBadge: string;
    viewAll: string;
    noIssues: string;
    stockError: string;
    stockRetry: string;
  };
  recentSales: {
    title: string;
  };
  expenseCategories: {
    title: string;
    subtitle: string;
    empty: string;
  };
  requestFailedLabel: string;
  roleLabel: {
    owner: string;
    cashier: string;
    warehouse: string;
  };
  salesTrend: {
    title: string;
    revenue: string;
    profit: string;
    orders: string;
  };
  sections: {
    highStockProducts: string;
    lowStockProducts: string;
    paymentBreakdown: string;
    range: string;
    recentSales: string;
    topProducts: string;
  };
  subtitle: string;
  summary: {
    averageTicket: string;
    discountAmount: string;
    revenue: string;
    salesCount: string;
    totalItems: string;
    vatAmount: string;
  };
  table: {
    amount: string;
    cashier: string;
    customer: string;
    paymentMethod: string;
    price: string;
    productName: string;
    quantity: string;
    saleNumber: string;
    soldAt: string;
    sku: string;
    stock: string;
  };
  title: string;
  topProductsTable: {
    title: string;
    rank: string;
    product: string;
    qtySold: string;
    revenue: string;
    viewAll: string;
  };
  validation: {
    customRangeRequired: string;
  };
};

export type DashboardManagerDashboardManagerProps = {
  dictionary: DashboardManagerDashboardDictionary;
  locale: string;
};

export type DashboardManagerFilterPeriod = HeroPeriod;

export type DashboardManagerUserRole = "owner" | "cashier" | "warehouse";

export type DashboardManagerChartMetric = "revenue" | "profit" | "orders";
