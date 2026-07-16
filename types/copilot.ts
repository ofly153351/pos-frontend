export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'
export type RiskCategory = 'inventory' | 'finance' | 'operations' | 'customer' | 'purchasing'
export type OpportunityCategory = 'sales' | 'inventory' | 'finance' | 'customer' | 'purchasing'
export type ActionSeverity = 'urgent' | 'high' | 'medium' | 'low'

export interface CopilotRisk {
  id: string
  category: RiskCategory
  severity: RiskSeverity
  title: string
  description: string
  impact: string
  action: string
  actionRoute?: string
  value?: number
}

export interface CopilotOpportunity {
  id: string
  category: OpportunityCategory
  title: string
  description: string
  metric?: string
  recommendation: string
  actionRoute?: string
  value?: number
}

export interface CopilotAction {
  id: string
  title: string
  description: string
  severity: ActionSeverity
  route: string
  badge?: string | number
  impactValue?: string
}

export interface CopilotReorderItem {
  productId: string
  productName: string
  daysOfStock: number
  currentStock: number
  reorderQty: number
  avgDailySales: number
  severity: 'critical' | 'high'
}

export interface CopilotDeadCapitalItem {
  productId: string
  productName: string
  remaining: number
  tiedValue: number
  lastSold: string | null
  neverSold: boolean
  daysInactive: number | null
}

export interface CopilotOverstockItem {
  productId: string
  productName: string
  currentStock: number
  maxStock: number
  overstockQty: number
  capitalValue: number
}

export type InventoryState = 'storefront_critical' | 'transfer_candidate' | 'balanced' | 'overstock' | 'dead_capital'

export interface CopilotReorderRecommendation {
  productId: string
  productName: string
  daysOfStock: number
  currentStock: number
  reorderQty: number
  avgDailySales: number
  severity: 'critical' | 'high'
  hasPendingPO: boolean
  pendingPOQty: number
  recommendation: 'purchase' | 'wait_for_po' | 'transfer'
  reasonTh: string
}

export interface CopilotFollowUp {
  label: string
  query: string
}

export interface CopilotInventoryIntelligence {
  urgentReorders: CopilotReorderItem[]
  reorderRecommendations: CopilotReorderRecommendation[]
  topDeadCapital: CopilotDeadCapitalItem[]
  overstockItems: CopilotOverstockItem[]
  totalOverstockValue: number
  totalDeadCapitalValue: number
}

export interface CopilotHealthInventory {
  score: number
  outOfStockCount: number
  lowStockCount: number
  deadStockValue: number
  missingCostCount: number
}

export interface CopilotHealthSales {
  score: number
  revenueChange: number
  previousRevenue: number
}

export interface CopilotHealthFinance {
  score: number
  netProfit: number
  netMargin: number
  grossMargin: number
  missingCostLines: number
}

export interface CopilotHealthOperations {
  score: number
  pendingReceiptsCount: number
  overdueCreditCount: number
  overdueCreditAmount: number
}

export interface CopilotHealthScore {
  overall: number
  sales: CopilotHealthSales
  inventory: CopilotHealthInventory
  finance: CopilotHealthFinance
  operations: CopilotHealthOperations
}

export interface CopilotSummary {
  revenue: number
  revenueChange: number
  netProfit: number
  netMargin: number
  orders: number
  averageOrderValue: number
  revenueToday: number
  profitToday: number
  revenueTodayChange: number
}

export interface CopilotAgingBucket {
  label: string
  count: number
  amount: number
}

export interface CopilotAgingCustomer {
  customerId: string
  customerName: string
  outstanding: number
  oldestBucket: string
  daysOverdue: number
}

export interface CopilotMoneyIntelligence {
  revenue: number
  refunds: number
  cogs: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: number
  netProfit: number
  netMargin: number
  agingBuckets: CopilotAgingBucket[]
  agingCustomers: CopilotAgingCustomer[]
  totalOutstanding: number
  totalOverdue: number
  dataQualityNotes: string[]
}

export interface CopilotPriority {
  action: CopilotAction
  score: number
  reason: string
  urgencyLabel: string
}

export interface CopilotDecisionEngine {
  topPriority: CopilotPriority | null
  todayPriorities: CopilotPriority[]
  weekPriorities: CopilotPriority[]
}

export interface CopilotSupplierMetric {
  supplierId: string
  supplierName: string
  totalSpend: number
  poCount: number
  sharePercent: number
  productCount: number
  creditDays: number
}

export interface CopilotCostChange {
  productId: string
  productName: string
  previousCost: number
  currentCost: number
  changePct: number
  supplierName: string
  detectedAt: string
}

export interface CopilotPurchasingIntelligence {
  supplierMetrics: CopilotSupplierMetric[]
  concentrationIndex: number
  concentrationRisk: 'low' | 'medium' | 'high'
  totalPurchaseValue: number
  pendingPOCount: number
  pendingPOValue: number
  costChanges: CopilotCostChange[]
  singleSupplierProducts: number
  noSupplierProducts: number
}

export interface CopilotOverview {
  healthScore: CopilotHealthScore
  summary: CopilotSummary
  risks: CopilotRisk[]
  opportunities: CopilotOpportunity[]
  actions: CopilotAction[]
  inventoryIntelligence: CopilotInventoryIntelligence
  moneyIntelligence: CopilotMoneyIntelligence
  purchasingIntelligence: CopilotPurchasingIntelligence
  decisionEngine: CopilotDecisionEngine
  generatedAt: string
}
