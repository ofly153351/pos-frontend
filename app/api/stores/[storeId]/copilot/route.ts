import { NextResponse } from "next/server"

import type {
  CopilotAction,
  CopilotOpportunity,
  CopilotOverview,
  CopilotRisk,
  RiskSeverity,
} from "@/types/copilot"

type RouteContext = {
  params: Promise<{ storeId: string }>
}

// ─── Inline backend response shapes ────────────────────────────────────────

interface RawExecutiveSummary {
  revenue: number
  previous_revenue: number
  refunds: number
  cogs: number
  expenses: number
  gross_profit: number
  net_profit: number
  orders: number
  average_order_value: number
  sales_trend: Array<{ day: string; revenue: number; cogs: number; profit: number }>
}

interface RawPnlReport {
  revenue: { gross_revenue: number; sales_count: number }
  cogs: { total: number; missing_cost_lines: number }
  operating_expenses: number
}

interface RawWarehouseDashboard {
  kpi: {
    stock_value: number
    low_stock_count: number
    out_of_stock_count: number
  }
  low_stock_alerts: Array<{
    product_id: string
    name: string
    sku: string
    unit: string
    total_stock: number
    min_stock: number
    alert_level: "critical" | "warning"
  }>
  top_sellers: Array<{
    rank: number
    product_id: string
    name: string
    week_qty: number
    today_qty: number
    trend_pct: number
  }>
}

interface RawInventoryReport {
  snapshot: {
    inventory_value: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    missing_cost: number
  }
  dead_stock: {
    days: number
    count: number
    value: number
    items: Array<{
      product_id: string
      product_name: string
      remaining: number
      tied_value: number
      last_sold: string | null
      never_sold: boolean
    }>
  }
  stock_velocity: Array<{
    product_id: string
    product_name: string
    current_stock: number
    avg_daily_sales: number
    days_of_stock: number | null
    min_stock: number
    max_stock: number
    cost_price: number
  }>
  overstock: Array<{
    product_id: string
    product_name: string
    current_stock: number
    max_stock: number
    overstock_qty: number
    cost_price: number
    capital_value: number
  }>
}

interface RawPurchaseOrder {
  id: string
  store_id: string
  supplier_id: string
  order_number: string
  status: 'pending' | 'partial' | 'completed' | 'cancelled'
  total_cost: number
  created_at: string
  supplier?: { id: string; name: string; credit_days: number }
}

interface RawSupplier {
  id: string
  name: string
  is_active: boolean
  credit_days: number
}

interface RawReceiptItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
}

interface RawReceipt {
  id: string
  supplier_id: string
  supplier_name?: string
  status: string
  received_at: string
  total_amount: number
  items?: RawReceiptItem[]
}

interface RawSupplierProduct {
  supplier_id: string
  product_id: string
  product_name: string
  supplier_price: number
}

interface RawCreditSummary {
  overdue_count: number
  overdue_amount: number
}

interface RawAgingSummary {
  buckets: Array<{ label: string; count: number; amount: number }>
  customers: Array<{
    customer_id: string
    customer_name: string
    outstanding: number
    oldest_bucket: string
    days_overdue: number
  }>
  total: number
}

interface BackendEnvelope<T> {
  success: boolean
  data: T
  message: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function fmtMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function computeSalesScore(revenueChange: number): number {
  let s = 100
  if (revenueChange < -25) s -= 30
  else if (revenueChange < -15) s -= 20
  else if (revenueChange < -5) s -= 10
  return clamp(s)
}

function computeInventoryScore(
  outOfStock: number,
  lowStock: number,
  deadStockPct: number,
  missingCost: number,
): number {
  let s = 100
  s -= Math.min(outOfStock * 8, 40)
  s -= Math.min(lowStock * 3, 15)
  if (deadStockPct > 0.3) s -= 20
  else if (deadStockPct > 0.2) s -= 15
  else if (deadStockPct > 0.1) s -= 10
  else if (deadStockPct > 0.05) s -= 5
  if (missingCost > 0) s -= 5
  return clamp(s)
}

function computeFinanceScore(
  netProfit: number,
  netMarginPct: number,
  grossMarginPct: number,
  missingCostLines: number,
): number {
  let s = 100
  if (netProfit < 0) s -= 40
  else if (netMarginPct < 5) s -= 25
  else if (netMarginPct < 10) s -= 15
  else if (netMarginPct < 15) s -= 5
  if (grossMarginPct < 15) s -= 15
  else if (grossMarginPct < 25) s -= 5
  if (missingCostLines > 0) s -= 10
  return clamp(s)
}

function computeOperationsScore(pendingReceipts: number, overdueCreditCount: number): number {
  let s = 100
  s -= Math.min(pendingReceipts * 8, 24)
  if (overdueCreditCount > 5) s -= 15
  else if (overdueCreditCount > 2) s -= 10
  else if (overdueCreditCount > 0) s -= 5
  return clamp(s)
}

function computeOverall(sales: number, inventory: number, finance: number, operations: number): number {
  return Math.round(sales * 0.3 + inventory * 0.3 + finance * 0.25 + operations * 0.15)
}

const SEVERITY_ORDER: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// ─── Risk builder ────────────────────────────────────────────────────────────

function buildRisks(params: {
  outOfStockCount: number
  criticalLowStockAlerts: RawWarehouseDashboard["low_stock_alerts"]
  lowStockAlerts: RawWarehouseDashboard["low_stock_alerts"]
  topSellers: RawWarehouseDashboard["top_sellers"]
  deadStockValue: number
  deadStockPct: number
  netProfit: number
  revenue: number
  revenueChange: number
  netMargin: number
  grossMargin: number
  operatingExpenses: number
  missingCostLines: number
  missingCostCount: number
  pendingReceiptsCount: number
  overdueCreditCount: number
  overdueCreditAmount: number
  todayRevenue: number
  dailyAverageRevenue: number
  overstockCount: number
  totalOverstockValue: number
  topOverstockItem: { productName: string; currentStock: number; maxStock: number; capitalValue: number } | null
  // Purchasing
  topSupplierShare: number
  topSupplierName: string
  concentrationRisk: 'low' | 'medium' | 'high'
  costIncreases: Array<{ productName: string; changePct: number; supplierName: string }>
  stalePendingPOs: number
  pendingPOValue: number
}): CopilotRisk[] {
  const risks: CopilotRisk[] = []

  // R01: Out of stock products
  if (params.outOfStockCount > 0) {
    risks.push({
      id: "R01",
      category: "inventory",
      severity: "critical",
      title: `${params.outOfStockCount} สินค้าหมดสต็อก`,
      description: `มี ${params.outOfStockCount} รายการที่ขายไม่ได้เพราะของหมด`,
      impact: "เสียยอดขายทันที",
      action: "สั่งซื้อสินค้า",
      actionRoute: "/purchases",
      value: params.outOfStockCount,
    })
  }

  // R02: Critical low stock alerts (top 3)
  const top3Critical = params.criticalLowStockAlerts.slice(0, 3)
  for (const alert of top3Critical) {
    risks.push({
      id: `R02-${alert.product_id}`,
      category: "inventory",
      severity: "high",
      title: alert.name,
      description: `เหลือแค่ ${alert.total_stock} ${alert.unit} (ขั้นต่ำ: ${alert.min_stock})`,
      impact: "ใกล้จะหมดสต็อก",
      action: "สั่งซื้อเพิ่ม",
      actionRoute: "/purchases",
      value: alert.total_stock,
    })
  }

  // R03: Dead stock value
  if (params.deadStockValue > 0) {
    const severity: RiskSeverity =
      params.deadStockValue > 50000 ? "high" : params.deadStockValue > 10000 ? "medium" : "low"
    risks.push({
      id: "R03",
      category: "inventory",
      severity,
      title: `เงินจมในสต็อก: ฿${fmtMoney(params.deadStockValue)}`,
      description: `เงินจมอยู่ในสินค้าที่ขายไม่ออกมากกว่า 90 วัน`,
      impact: "เงินสดหมุนเวียนลดลง",
      action: "ทำโปรโมชันเคลียร์สต็อก",
      actionRoute: "/reports/inventory-value",
      value: params.deadStockValue,
    })
  }

  // R04: Net loss
  if (params.netProfit < 0) {
    risks.push({
      id: "R04",
      category: "finance",
      severity: "critical",
      title: "ร้านกำลังขาดทุน",
      description: `ขาดทุนสุทธิ ฿${fmtMoney(Math.abs(params.netProfit))} ใน 7 วันที่ผ่านมา`,
      impact: "ถ้าปล่อยไว้จะเป็นปัญหาระยะยาว",
      action: "ดูรายจ่ายและปรับราคาสินค้า",
      actionRoute: "/reports/summary",
      value: params.netProfit,
    })
  }

  // R05: Revenue decline
  if (params.revenueChange < -15) {
    const severity: RiskSeverity = params.revenueChange < -25 ? "critical" : "high"
    risks.push({
      id: "R05",
      category: "finance",
      severity,
      title: `ยอดขายตกลง ${Math.abs(Math.round(params.revenueChange))}% จากสัปดาห์ก่อน`,
      description: "ยอดขายลดลงอย่างมากเทียบกับสัปดาห์ที่แล้ว",
      impact: "กำไรลดลง",
      action: "ตรวจสอบสาเหตุและทำโปรโมชัน",
      actionRoute: "/reports/summary",
      value: params.revenueChange,
    })
  }

  // R06: Low net margin (only when profitable)
  if (params.netProfit >= 0 && params.netMargin < 10) {
    const severity: RiskSeverity = params.netMargin < 5 ? "high" : "medium"
    risks.push({
      id: "R06",
      category: "finance",
      severity,
      title: `อัตรากำไรต่ำ: ${params.netMargin.toFixed(1)}%`,
      description: "อัตรากำไรสุทธิต่ำกว่าเกณฑ์ที่ดี",
      impact: "เสี่ยงต่อต้นทุนที่เพิ่มขึ้น",
      action: "ดูราคาสินค้าและลดค่าใช้จ่าย",
      actionRoute: "/reports/summary",
      value: params.netMargin,
    })
  }

  // R07: Missing cost prices
  const totalMissingCost = Math.max(params.missingCostLines, params.missingCostCount)
  if (totalMissingCost > 0) {
    risks.push({
      id: "R07",
      category: "finance",
      severity: "medium",
      title: "คำนวณกำไรไม่แม่น",
      description: `มี ${totalMissingCost} รายการที่ไม่ได้ใส่ราคาทุน`,
      impact: "รายงานกำไร-ขาดทุนอาจคลาดเคลื่อน",
      action: "ใส่ราคาทุนให้ครบทุกสินค้า",
      actionRoute: "/products",
      value: totalMissingCost,
    })
  }

  // R08: Pending goods receipts
  if (params.pendingReceiptsCount > 0) {
    const severity: RiskSeverity = params.pendingReceiptsCount > 3 ? "high" : "medium"
    risks.push({
      id: "R08",
      category: "operations",
      severity,
      title: `มี ${params.pendingReceiptsCount} ใบรับสินค้ารอตรวจ`,
      description: "สินค้าที่รับมาแล้วแต่ยังไม่อนุมัติ — สต็อกอาจไม่ตรง",
      impact: "สต็อกจะยังไม่อัพเดท",
      action: "ตรวจสอบและอนุมัติ",
      actionRoute: "/warehouse/receive",
      value: params.pendingReceiptsCount,
    })
  }

  // R09: Overdue receivables
  if (params.overdueCreditAmount > 0) {
    const severity: RiskSeverity = params.overdueCreditAmount > 50000 ? "high" : "medium"
    risks.push({
      id: "R09",
      category: "customer",
      severity,
      title: `ลูกหนี้ค้างชำระ: ฿${fmtMoney(params.overdueCreditAmount)}`,
      description: `มี ${params.overdueCreditCount} รายการขายเชื่อที่เกินกำหนดชำระ`,
      impact: "เงินสดหมุนเวียนไม่ดี",
      action: "ติดตามทวงเก็บเงิน",
      actionRoute: "/credit-sales",
      value: params.overdueCreditAmount,
    })
  }

  // R10: Bestseller running low — cross-reference top sellers with low stock alerts
  {
    const alertMap = new Map(params.lowStockAlerts.map((a) => [a.product_id, a]))
    const bestsellerLow = params.topSellers
      .map((s) => ({ seller: s, alert: alertMap.get(s.product_id) }))
      .filter(({ alert }) => alert !== undefined)
      .slice(0, 2)
    for (const { seller, alert } of bestsellerLow) {
      if (!alert) continue
      const dailySales = seller.week_qty / 7
      const daysLeft = dailySales > 0 ? Math.floor(alert.total_stock / dailySales) : null
      const daysNote = daysLeft !== null ? ` — ขายได้อีก ~${daysLeft} วัน` : ""
      risks.push({
        id: `R10-${seller.product_id}`,
        category: "inventory",
        severity: alert.alert_level === "critical" ? "critical" : "high",
        title: `สินค้าขายดีใกล้หมด: ${seller.name}`,
        description: `เหลือแค่ ${alert.total_stock} ${alert.unit}${daysNote} ขายไป ${seller.week_qty} ชิ้นสัปดาห์นี้`,
        impact: "เสี่ยงของหมดตอนขายดี",
        action: "สั่งซื้อด่วน",
        actionRoute: "/purchases",
        value: alert.total_stock,
      })
    }
  }

  // R11: Gross margin collapse
  if (params.revenue > 0) {
    if (params.grossMargin < 0) {
      risks.push({
        id: "R11",
        category: "finance",
        severity: "critical",
        title: "ขายต่ำกว่าทุน",
        description: `กำไรขั้นต้น ${params.grossMargin.toFixed(1)}% — ยอดขายไม่คุ้มต้นทุนสินค้า`,
        impact: "ยิ่งขายยิ่งขาดทุน",
        action: "ตรวจสอบราคาขายทันที",
        actionRoute: "/products",
        value: params.grossMargin,
      })
    } else if (params.grossMargin < 15) {
      risks.push({
        id: "R11",
        category: "finance",
        severity: "high",
        title: `กำไรขั้นต้นต่ำมาก: ${params.grossMargin.toFixed(1)}%`,
        description: "ยอดขายแทบไม่คุ้มต้นทุนสินค้า — ไม่เหลือครอบคลุมค่าใช้จ่าย",
        impact: "เสี่ยงขาดทุนแม้จ่ายน้อย",
        action: "ปรับราคาสินค้า",
        actionRoute: "/reports/summary",
        value: params.grossMargin,
      })
    } else if (params.grossMargin < 25) {
      risks.push({
        id: "R11",
        category: "finance",
        severity: "medium",
        title: `กำไรขั้นต้นค่อนข้างต่ำ: ${params.grossMargin.toFixed(1)}%`,
        description: "มาร์จินบาง ไม่ค่อยเหลือครอบคลุมค่าใช้จ่าย",
        impact: "กำไรสุทธิจำกัด",
        action: "ทบทวนราคาและสัดส่วนสินค้า",
        actionRoute: "/reports/summary",
        value: params.grossMargin,
      })
    }
  }

  // R12: Operating expense ratio high
  if (params.revenue > 0 && params.operatingExpenses > 0) {
    const opexRatio = params.operatingExpenses / params.revenue
    if (opexRatio > 0.7) {
      risks.push({
        id: "R12",
        category: "finance",
        severity: "high",
        title: `ค่าใช้จ่ายสูง ${Math.round(opexRatio * 100)}% ของยอดขาย`,
        description: `ค่าใช้จ่าย ฿${fmtMoney(params.operatingExpenses)} เทียบกับยอดขาย ฿${fmtMoney(params.revenue)}`,
        impact: "ค่าใช้จ่ายกินยอดขายเกือบหมด",
        action: "ดูและลดค่าใช้จ่าย",
        actionRoute: "/finance/expenses",
        value: opexRatio,
      })
    } else if (opexRatio > 0.5) {
      risks.push({
        id: "R12",
        category: "finance",
        severity: "medium",
        title: `ค่าใช้จ่ายสูง ${Math.round(opexRatio * 100)}% ของยอดขาย`,
        description: `ค่าใช้จ่าย ฿${fmtMoney(params.operatingExpenses)} เทียบกับยอดขาย ฿${fmtMoney(params.revenue)}`,
        impact: "ค่าใช้จ่ายสูง — ต้องคอยดูไม่ให้เพิ่มอีก",
        action: "ดูค่าใช้จ่าย",
        actionRoute: "/finance/expenses",
        value: opexRatio,
      })
    }
  }

  // R13: Dead stock capital concentration
  if (params.deadStockPct > 0.4 && params.deadStockValue > 5000) {
    risks.push({
      id: "R13",
      category: "inventory",
      severity: params.deadStockPct > 0.6 ? "high" : "medium",
      title: `${Math.round(params.deadStockPct * 100)}% ของสต็อกไม่เคลื่อนไหว`,
      description: `฿${fmtMoney(params.deadStockValue)} (${Math.round(params.deadStockPct * 100)}% ของมูลค่าสต็อกทั้งหมด) จมอยู่ในสินค้าค้าง 90 วัน`,
      impact: "เงินติดสต็อก — ไม่สามารถเอาไปซื้อสินค้าขายดีได้",
      action: "ทำโปรเคลียร์สต็อกค้าง",
      actionRoute: "/reports/inventory-value",
      value: params.deadStockPct,
    })
  }

  // R14: Today's sales velocity significantly below daily average
  if (params.dailyAverageRevenue > 0 && params.todayRevenue < params.dailyAverageRevenue * 0.4) {
    const pct = Math.round((params.todayRevenue / params.dailyAverageRevenue) * 100)
    risks.push({
      id: "R14",
      category: "finance",
      severity: pct < 20 ? "high" : "medium",
      title: `วันนี้ยอดขายแค่ ${pct}% ของปกติ`,
      description: `ขายได้ ฿${fmtMoney(params.todayRevenue)} เทียบกับปกติ ฿${fmtMoney(Math.round(params.dailyAverageRevenue))} ต่อวัน`,
      impact: "วันนี้ขายช้ากว่าปกติ",
      action: "ดูหน้าขายและโปรโมชัน",
      actionRoute: "/reports/summary",
      value: pct,
    })
  }

  // R15: Overstock — capital tied in excess inventory
  if (params.overstockCount > 0 && params.totalOverstockValue > 0) {
    const item = params.topOverstockItem
    risks.push({
      id: "R15",
      category: "inventory",
      severity: params.totalOverstockValue > 20000 ? "high" : "medium",
      title: `${params.overstockCount} รายการสต็อกเกิน (฿${fmtMoney(Math.round(params.totalOverstockValue))} ส่วนเกิน)`,
      description: item
        ? `${item.productName}: มี ${item.currentStock} ชิ้น (สูงสุด: ${item.maxStock}) — ฿${fmtMoney(Math.round(item.capitalValue))} จมในสต็อกเกิน`
        : `${params.overstockCount} สินค้ามีสต็อกเกินกว่าที่ตั้งไว้`,
      impact: "เงินจมในสต็อกส่วนเกิน",
      action: "ลดปริมาณสั่งซื้อ",
      actionRoute: "/inventory",
      value: params.totalOverstockValue,
    })
  }

  // R16: Supplier concentration — single supplier >50% of spend
  if (params.topSupplierShare > 50 && params.concentrationRisk !== "low") {
    const severity: RiskSeverity = params.topSupplierShare > 70 ? "high" : "medium"
    risks.push({
      id: "R16",
      category: "purchasing",
      severity,
      title: `พึ่งพาซัพพลายเออร์เดียว ${Math.round(params.topSupplierShare)}%`,
      description: `${params.topSupplierName} คิดเป็น ${Math.round(params.topSupplierShare)}% ของยอดสั่งซื้อ — เสี่ยงถ้าซัพพลายเออร์มีปัญหา`,
      impact: "ร้านหยุดชะงักถ้าซัพพลายเออร์หลักส่งไม่ได้",
      action: "หาซัพพลายเออร์สำรอง",
      actionRoute: "/purchases",
      value: params.topSupplierShare,
    })
  }

  // R17: Rapid cost increase detected from receipts
  for (const ci of params.costIncreases.slice(0, 2)) {
    if (ci.changePct > 10) {
      risks.push({
        id: `R17-${ci.productName.slice(0, 8)}`,
        category: "purchasing",
        severity: ci.changePct > 25 ? "high" : "medium",
        title: `ต้นทุน ${ci.productName} ขึ้น ${Math.round(ci.changePct)}%`,
        description: `ราคาจาก${ci.supplierName}ขึ้นอย่างรวดเร็ว — ถ้าไม่ปรับราคาขายจะกระทบกำไร`,
        impact: "กำไรลดลงถ้าไม่ปรับราคาตาม",
        action: "ตรวจสอบราคาและปรับราคาขาย",
        actionRoute: "/products",
        value: ci.changePct,
      })
    }
  }

  // R18: Stale pending POs (pending >0)
  if (params.stalePendingPOs > 0) {
    risks.push({
      id: "R18",
      category: "purchasing",
      severity: params.stalePendingPOs > 3 ? "high" : "medium",
      title: `${params.stalePendingPOs} ใบสั่งซื้อค้าง (฿${fmtMoney(Math.round(params.pendingPOValue))})`,
      description: `มีใบสั่งซื้อที่ยังไม่ได้รับสินค้า — ต้องติดตาม`,
      impact: "สินค้าอาจไม่เข้าตามกำหนด",
      action: "ติดตามใบสั่งซื้อ",
      actionRoute: "/purchases",
      value: params.pendingPOValue,
    })
  }

  return risks.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

// ─── Opportunity builder ─────────────────────────────────────────────────────

function buildOpportunities(params: {
  topSellers: RawWarehouseDashboard["top_sellers"]
  deadStockValue: number
  revenueChange: number
  netProfit: number
  netMargin: number
  // Purchasing
  topSupplierSpend: number
  topSupplierName: string
  topSupplierCreditDays: number
  costDecreases: Array<{ productName: string; changePct: number; currentCost: number; previousCost: number }>
}): CopilotOpportunity[] {
  const opps: CopilotOpportunity[] = []

  // O01: Trending products (top 3 with >15% WoW growth)
  const trending = params.topSellers.filter((p) => p.trend_pct > 15).slice(0, 3)
  for (const product of trending) {
    opps.push({
      id: `O01-${product.product_id}`,
      category: "sales",
      title: product.name,
      description: `ยอดขายเพิ่มขึ้น ${Math.round(product.trend_pct)}% จากสัปดาห์ก่อน`,
      metric: `+${Math.round(product.trend_pct)}%`,
      recommendation: "เตรียมสต็อกให้พอ และพิจารณาทำโปรโมชัน",
      actionRoute: "/inventory",
      value: product.trend_pct,
    })
  }

  // O02: Dead stock capital release
  if (params.deadStockValue > 5000) {
    opps.push({
      id: "O02",
      category: "inventory",
      title: "ปลดปล่อยเงินจมในสต็อก",
      description: `฿${fmtMoney(params.deadStockValue)} ติดอยู่ในสินค้าที่ขายไม่ออกมากกว่า 90 วัน`,
      metric: `฿${fmtMoney(params.deadStockValue)}`,
      recommendation: "ทำโปรลดราคาเคลียร์",
      actionRoute: "/reports/inventory-value",
      value: params.deadStockValue,
    })
  }

  // O03: Revenue growth momentum
  if (params.revenueChange > 10) {
    opps.push({
      id: "O03",
      category: "sales",
      title: "ยอดขายกำลังเติบโต",
      description: `ยอดขายเพิ่มขึ้น ${Math.round(params.revenueChange)}% เทียบกับสัปดาห์ก่อน`,
      metric: `+${Math.round(params.revenueChange)}%`,
      recommendation: "เตรียมสต็อกสินค้าขายดี — อย่าให้ของหมดตอนกำลังโต",
      actionRoute: "/reports/summary",
      value: params.revenueChange,
    })
  }

  // O04: Strong margins — reinvestment opportunity
  if (params.netProfit > 0 && params.netMargin > 20) {
    opps.push({
      id: "O04",
      category: "finance",
      title: "กำไรดี — พร้อมลงทุนเพิ่ม",
      description: `ร้านทำกำไรได้ดี อัตรากำไรสุทธิ ${params.netMargin.toFixed(1)}%`,
      metric: `${params.netMargin.toFixed(1)}% กำไรสุทธิ`,
      recommendation: "ลงทุนเพิ่มในสินค้าขายดี",
      actionRoute: "/reports/summary",
      value: params.netMargin,
    })
  }

  // O05: Negotiate credit terms with high-volume supplier paying cash
  if (params.topSupplierSpend > 10000 && params.topSupplierCreditDays === 0) {
    opps.push({
      id: "O05",
      category: "purchasing",
      title: "ขอเครดิตจากซัพพลายเออร์หลัก",
      description: `ซื้อจาก${params.topSupplierName}แล้ว ฿${fmtMoney(Math.round(params.topSupplierSpend))} แต่ยังจ่ายเงินสด — ขอเครดิต 15-30 วันเพื่อหมุนเงิน`,
      metric: `฿${fmtMoney(Math.round(params.topSupplierSpend))}`,
      recommendation: "เจรจาเครดิต 15-30 วัน จะช่วยเงินหมุนเวียน",
      actionRoute: "/purchases",
      value: params.topSupplierSpend,
    })
  }

  // O06: Cost decrease detected — opportunity to improve margin
  for (const cd of params.costDecreases.slice(0, 2)) {
    if (cd.changePct < -10) {
      const saving = Math.round(cd.previousCost - cd.currentCost)
      opps.push({
        id: `O06-${cd.productName.slice(0, 8)}`,
        category: "purchasing",
        title: `ต้นทุน ${cd.productName} ลดลง ${Math.abs(Math.round(cd.changePct))}%`,
        description: `ราคาทุนลดจาก ฿${fmtMoney(cd.previousCost)} เป็น ฿${fmtMoney(cd.currentCost)} — กำไรต่อชิ้นเพิ่ม ฿${saving}`,
        metric: `-${Math.abs(Math.round(cd.changePct))}%`,
        recommendation: "อัปเดตราคาทุนในระบบให้ตรง",
        actionRoute: "/products",
        value: Math.abs(cd.changePct),
      })
    }
  }

  return opps.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
}

// ─── Action builder ──────────────────────────────────────────────────────────

function buildActions(params: {
  outOfStockCount: number
  pendingReceiptsCount: number
  overdueCreditCount: number
  overdueCreditAmount: number
  lowStockCount: number
  deadStockValue: number
  missingCostCount: number
  totalOverstockValue: number
  // Purchasing
  pendingPOCount: number
  pendingPOValue: number
  costIncreaseCount: number
  urgentReorders: Array<{
    productId: string
    productName: string
    daysOfStock: number
    reorderQty: number
    avgDailySales: number
    severity: 'critical' | 'high'
  }>
  agingCustomers: Array<{
    customerId: string
    customerName: string
    outstanding: number
    daysOverdue: number
  }>
}): CopilotAction[] {
  const actions: CopilotAction[] = []

  if (params.outOfStockCount > 0) {
    actions.push({
      id: "reorder-oos",
      title: "สั่งซื้อสินค้าที่หมด",
      description: `มี ${params.outOfStockCount} รายการต้องสั่งซื้อทันที`,
      severity: "urgent",
      route: "/purchases",
      badge: params.outOfStockCount,
      impactValue: "หยุดเสียยอดขาย",
    })
  }

  for (const r of params.urgentReorders.slice(0, 3)) {
    if (r.reorderQty > 0) {
      actions.push({
        id: `reorder-velocity-${r.productId}`,
        title: `สั่งซื้อ: ${r.productName}`,
        description: `เหลืออีก ${r.daysOfStock.toFixed(1)} วัน — ต้องสั่ง ${r.reorderQty} ชิ้น`,
        severity: r.severity === 'critical' ? 'urgent' : 'high',
        route: "/purchases",
        badge: r.reorderQty,
        impactValue: `ป้องกันของหมดใน ${Math.ceil(r.daysOfStock)} วัน`,
      })
    }
  }

  if (params.pendingReceiptsCount > 0) {
    actions.push({
      id: "approve-receipts",
      title: "อนุมัติใบรับสินค้า",
      description: `มี ${params.pendingReceiptsCount} รายการรอตรวจสอบ`,
      severity: "urgent",
      route: "/warehouse/receive",
      badge: params.pendingReceiptsCount,
      impactValue: "ปลดล็อคสต็อกที่รับมาแล้ว",
    })
  }

  if (params.overdueCreditAmount > 0) {
    actions.push({
      id: "collect-overdue",
      title: "เก็บเงินค้างชำระ",
      description: `มี ${params.overdueCreditCount} รายการขายเชื่อเกินกำหนด`,
      severity: "high",
      route: "/credit-sales",
      badge: params.overdueCreditCount,
      impactValue: `ได้เงินสดกลับ +฿${fmtMoney(params.overdueCreditAmount)}`,
    })
  }

  // Per-customer collection actions (top 3 by outstanding)
  for (const c of params.agingCustomers.filter((c) => c.daysOverdue > 0).slice(0, 3)) {
    actions.push({
      id: `collect-${c.customerId}`,
      title: `ติดตาม: ${c.customerName}`,
      description: `ค้างชำระ ฿${fmtMoney(c.outstanding)} — เกิน ${c.daysOverdue} วัน`,
      severity: c.daysOverdue > 60 ? "urgent" : "high",
      route: "/credit-sales",
      impactValue: `+฿${fmtMoney(c.outstanding)}`,
    })
  }

  if (params.lowStockCount > 0) {
    actions.push({
      id: "reorder-low",
      title: "ตรวจสอบสินค้าใกล้หมด",
      description: `มี ${params.lowStockCount} รายการต่ำกว่าขั้นต่ำ`,
      severity: "high",
      route: "/inventory",
      badge: params.lowStockCount,
      impactValue: "ป้องกันสินค้าหมด",
    })
  }

  if (params.deadStockValue > 10000) {
    actions.push({
      id: "review-dead",
      title: "จัดการสินค้าค้างสต็อก",
      description: `฿${fmtMoney(params.deadStockValue)} เป็นสินค้าที่ไม่เคลื่อนไหว`,
      severity: "medium",
      route: "/reports/inventory-value",
      impactValue: `ปลดปล่อยเงิน ฿${fmtMoney(params.deadStockValue)}`,
    })
  }

  if (params.totalOverstockValue > 5000) {
    actions.push({
      id: "reduce-overstock",
      title: "ลดสต็อกส่วนเกิน",
      description: `มีสินค้าเกินกว่าที่ตั้งไว้ ฿${fmtMoney(Math.round(params.totalOverstockValue))}`,
      severity: "medium",
      route: "/inventory",
      impactValue: `คืนเงินจม ฿${fmtMoney(Math.round(params.totalOverstockValue))}`,
    })
  }

  if (params.missingCostCount > 0) {
    actions.push({
      id: "fix-costs",
      title: "ใส่ราคาทุนที่ขาด",
      description: `มี ${params.missingCostCount} รายการที่ทำให้คำนวณกำไรคลาดเคลื่อน`,
      severity: "medium",
      route: "/products",
      badge: params.missingCostCount,
      impactValue: "กำไรที่แสดงจะแม่นยำขึ้น",
    })
  }

  // Purchasing actions
  if (params.pendingPOCount > 0) {
    actions.push({
      id: "followup-po",
      title: "ติดตามใบสั่งซื้อค้าง",
      description: `มี ${params.pendingPOCount} ใบสั่งซื้อยังไม่ได้รับสินค้า`,
      severity: params.pendingPOCount > 3 ? "high" : "medium",
      route: "/purchases",
      badge: params.pendingPOCount,
      impactValue: `฿${fmtMoney(Math.round(params.pendingPOValue))} รอรับสินค้า`,
    })
  }

  if (params.costIncreaseCount > 0) {
    actions.push({
      id: "review-cost-changes",
      title: "ตรวจสอบต้นทุนที่เปลี่ยน",
      description: `มี ${params.costIncreaseCount} สินค้าที่ต้นทุนเปลี่ยนแปลงมาก`,
      severity: "medium",
      route: "/products",
      badge: params.costIncreaseCount,
      impactValue: "ป้องกันขายขาดทุน",
    })
  }

  return actions
}

// ─── Decision Engine ────────────────────────────────────────────────────────

const SEV_WEIGHT: Record<string, number> = { urgent: 100, high: 70, medium: 40, low: 10 }
const URGENCY_LABELS: Record<string, string> = {
  urgent: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
}

const REASON_MAP: Record<string, string> = {
  "reorder-oos": "มีสินค้าหมดสต็อก ลูกค้าซื้อไม่ได้",
  "approve-receipts": "สินค้ารับมาแล้วแต่ยังไม่เข้าสต็อก",
  "collect-overdue": "มีเงินค้างชำระเกินกำหนด",
  "reorder-low": "สินค้าหลายรายการใกล้หมด",
  "review-dead": "เงินจมอยู่ในสินค้าที่ขายไม่ออก",
  "reduce-overstock": "สต็อกเกินกว่าที่ตั้งไว้",
  "fix-costs": "ราคาทุนไม่ครบ ทำให้กำไรไม่แม่น",
  "followup-po": "มีใบสั่งซื้อค้างยังไม่ได้รับสินค้า",
  "review-cost-changes": "ต้นทุนเปลี่ยนแปลงมาก อาจกระทบกำไร",
}

function extractBahtAmount(s: string | undefined): number {
  if (!s) return 0
  const m = s.replace(/,/g, "").match(/[\d]+/)
  return m ? parseInt(m[0], 10) : 0
}

interface ScoredAction {
  action: CopilotAction
  score: number
  reason: string
  urgencyLabel: string
}

function buildDecisionEngine(actions: CopilotAction[]): {
  topPriority: ScoredAction | null
  todayPriorities: ScoredAction[]
  weekPriorities: ScoredAction[]
} {
  const scored: ScoredAction[] = actions.map((a) => {
    let score = SEV_WEIGHT[a.severity] ?? 10
    score += Math.min(50, Math.floor(extractBahtAmount(a.impactValue) / 1000))
    if (typeof a.badge === "number") score += Math.min(30, a.badge * 5)

    const baseId = a.id.replace(/-[a-z0-9-]+$/, "")
    const reason =
      REASON_MAP[a.id] ?? REASON_MAP[baseId] ?? a.description

    return { action: a, score, reason, urgencyLabel: URGENCY_LABELS[a.severity] ?? "ปกติ" }
  })

  scored.sort((a, b) => b.score - a.score)

  const urgent = scored.filter(
    (s) => s.action.severity === "urgent" || s.action.severity === "high",
  )
  const medium = scored.filter(
    (s) => s.action.severity === "medium" || s.action.severity === "low",
  )

  return {
    topPriority: scored[0] ?? null,
    todayPriorities: urgent.slice(0, 3),
    weekPriorities: medium.slice(0, 3),
  }
}

// ─── Purchasing Intelligence builder ─────────────────────────────────────────

interface PurchasingIntelligenceInput {
  purchaseOrders: RawPurchaseOrder[]
  suppliers: RawSupplier[]
  confirmedReceipts: RawReceipt[]
  supplierProducts: RawSupplierProduct[]
  productCostPrices: Map<string, number>
}

function buildPurchasingIntelligence(input: PurchasingIntelligenceInput) {
  const { purchaseOrders, suppliers, confirmedReceipts, supplierProducts } = input

  // Supplier spend from completed/partial POs
  const completedPOs = purchaseOrders.filter(
    (po) => po.status === "completed" || po.status === "partial",
  )
  const pendingPOs = purchaseOrders.filter((po) => po.status === "pending")

  const spendBySupplier = new Map<string, number>()
  const poCountBySupplier = new Map<string, number>()
  let totalPurchaseValue = 0

  for (const po of completedPOs) {
    if (!po.supplier_id) continue
    spendBySupplier.set(
      po.supplier_id,
      (spendBySupplier.get(po.supplier_id) ?? 0) + po.total_cost,
    )
    poCountBySupplier.set(
      po.supplier_id,
      (poCountBySupplier.get(po.supplier_id) ?? 0) + 1,
    )
    totalPurchaseValue += po.total_cost
  }

  // Product count per supplier from supplier_products
  const productsBySupplier = new Map<string, number>()
  for (const sp of supplierProducts) {
    productsBySupplier.set(
      sp.supplier_id,
      (productsBySupplier.get(sp.supplier_id) ?? 0) + 1,
    )
  }

  // Supplier name lookup
  const supplierNameMap = new Map<string, string>()
  const supplierCreditMap = new Map<string, number>()
  for (const s of suppliers) {
    supplierNameMap.set(s.id, s.name)
    supplierCreditMap.set(s.id, s.credit_days)
  }
  for (const po of purchaseOrders) {
    if (po.supplier?.id && po.supplier.name) {
      supplierNameMap.set(po.supplier.id, po.supplier.name)
      if (po.supplier.credit_days !== undefined)
        supplierCreditMap.set(po.supplier.id, po.supplier.credit_days)
    }
  }

  // Build supplier metrics sorted by spend
  const supplierMetrics = [...spendBySupplier.entries()]
    .map(([supplierId, totalSpend]) => ({
      supplierId,
      supplierName: supplierNameMap.get(supplierId) ?? "ไม่ทราบ",
      totalSpend,
      poCount: poCountBySupplier.get(supplierId) ?? 0,
      sharePercent: totalPurchaseValue > 0 ? (totalSpend / totalPurchaseValue) * 100 : 0,
      productCount: productsBySupplier.get(supplierId) ?? 0,
      creditDays: supplierCreditMap.get(supplierId) ?? 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10)

  // HHI (Herfindahl-Hirschman Index) for concentration
  let hhi = 0
  for (const m of supplierMetrics) {
    hhi += m.sharePercent * m.sharePercent
  }
  const concentrationRisk: "low" | "medium" | "high" =
    hhi > 5000 ? "high" : hhi > 2500 ? "medium" : "low"

  // Cost change detection from receipts vs product cost_price
  const costChanges: Array<{
    productId: string
    productName: string
    previousCost: number
    currentCost: number
    changePct: number
    supplierName: string
    detectedAt: string
  }> = []

  for (const receipt of confirmedReceipts) {
    if (!receipt.items) continue
    for (const item of receipt.items) {
      const productCost = input.productCostPrices.get(item.product_id)
      if (productCost === undefined || productCost <= 0 || item.unit_price <= 0) continue
      const changePct = ((item.unit_price - productCost) / productCost) * 100
      if (Math.abs(changePct) >= 10) {
        costChanges.push({
          productId: item.product_id,
          productName: item.product_name,
          previousCost: productCost,
          currentCost: item.unit_price,
          changePct,
          supplierName: supplierNameMap.get(receipt.supplier_id) ?? "ไม่ทราบ",
          detectedAt: receipt.received_at,
        })
      }
    }
  }
  costChanges.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))

  // Single-supplier products (only 1 supplier linked)
  const supplierCountByProduct = new Map<string, number>()
  for (const sp of supplierProducts) {
    supplierCountByProduct.set(
      sp.product_id,
      (supplierCountByProduct.get(sp.product_id) ?? 0) + 1,
    )
  }
  const linkedProductIds = new Set(supplierProducts.map((sp) => sp.product_id))
  const singleSupplierProducts = [...supplierCountByProduct.values()].filter(
    (c) => c === 1,
  ).length

  return {
    supplierMetrics,
    concentrationIndex: Math.round(hhi),
    concentrationRisk,
    totalPurchaseValue,
    pendingPOCount: pendingPOs.length,
    pendingPOValue: pendingPOs.reduce((s, po) => s + po.total_cost, 0),
    costChanges: costChanges.slice(0, 5),
    singleSupplierProducts,
    noSupplierProducts: 0, // would need full product count — deferred
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

const backendBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080"

function extractBearerToken(request: Request): string {
  // Prefer explicit Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader) return authHeader

  // Fall back to pos-access-token cookie
  const cookieHeader = request.headers.get("cookie") ?? ""
  const match = cookieHeader.match(/(?:^|;\s*)pos-access-token=([^;]+)/)
  const token = match?.[1] ? decodeURIComponent(match[1]) : ""
  return token ? `Bearer ${token}` : ""
}

async function backendGet<T>(
  path: string,
  authHeader: string,
): Promise<T | null> {
  const url = `${backendBaseUrl}${path}`
  const response = await fetch(url, {
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    method: "GET",
  })
  if (!response.ok) return null
  const json = (await response.json()) as BackendEnvelope<T>
  if (!json.success) return null
  return json.data
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params
  const authHeader = extractBearerToken(request)

  // ── 1. Parallel backend calls ──────────────────────────────────────────────
  const [
    summaryResult,
    pnlResult,
    warehouseResult,
    inventoryResult,
    creditResult,
    receiptsResult,
    agingResult,
    purchaseOrdersResult,
    suppliersResult,
    confirmedReceiptsResult,
  ] = await Promise.allSettled([
    backendGet<RawExecutiveSummary>(
      `/api/v1/stores/${storeId}/finance/summary?period=7d`,
      authHeader,
    ),
    backendGet<RawPnlReport>(
      `/api/v1/stores/${storeId}/finance/pnl?period=7d`,
      authHeader,
    ),
    backendGet<RawWarehouseDashboard>(
      `/api/v1/stores/${storeId}/dashboard/warehouse?period=7d`,
      authHeader,
    ),
    backendGet<RawInventoryReport>(
      `/api/v1/stores/${storeId}/finance/inventory?dead_days=90`,
      authHeader,
    ),
    backendGet<RawCreditSummary>(
      `/api/v1/stores/${storeId}/credit-sales/summary`,
      authHeader,
    ),
    backendGet<{ data: unknown[] } | unknown[]>(
      `/api/v1/stores/${storeId}/warehouse/receipts?status=pending_review&limit=10`,
      authHeader,
    ),
    backendGet<RawAgingSummary>(
      `/api/v1/stores/${storeId}/credit-sales/aging`,
      authHeader,
    ),
    backendGet<RawPurchaseOrder[]>(
      `/api/v1/stores/${storeId}/purchase-orders`,
      authHeader,
    ),
    backendGet<RawSupplier[]>(
      `/api/v1/stores/${storeId}/suppliers`,
      authHeader,
    ),
    backendGet<RawReceipt[]>(
      `/api/v1/stores/${storeId}/warehouse/receipts?status=confirmed&limit=50`,
      authHeader,
    ),
  ])

  // ── 2. Safe data extraction ────────────────────────────────────────────────
  const summary =
    summaryResult.status === "fulfilled" && summaryResult.value != null
      ? summaryResult.value
      : null

  const pnl =
    pnlResult.status === "fulfilled" && pnlResult.value != null
      ? pnlResult.value
      : null

  const warehouse =
    warehouseResult.status === "fulfilled" && warehouseResult.value != null
      ? warehouseResult.value
      : null

  const inventory =
    inventoryResult.status === "fulfilled" && inventoryResult.value != null
      ? inventoryResult.value
      : null

  const credit =
    creditResult.status === "fulfilled" && creditResult.value != null
      ? creditResult.value
      : null

  // Receipts: the raw response may be an array or wrapped — extract length safely
  let pendingReceiptsCount = 0
  if (receiptsResult.status === "fulfilled" && receiptsResult.value != null) {
    const raw = receiptsResult.value
    if (Array.isArray(raw)) {
      pendingReceiptsCount = raw.length
    } else if (
      typeof raw === "object" &&
      raw !== null &&
      "data" in raw &&
      Array.isArray((raw as { data: unknown[] }).data)
    ) {
      pendingReceiptsCount = (raw as { data: unknown[] }).data.length
    }
  }

  const aging =
    agingResult.status === "fulfilled" && agingResult.value != null
      ? agingResult.value
      : null

  // Purchasing data extraction
  const rawPurchaseOrders: RawPurchaseOrder[] =
    purchaseOrdersResult.status === "fulfilled" && Array.isArray(purchaseOrdersResult.value)
      ? purchaseOrdersResult.value
      : []

  const rawSuppliers: RawSupplier[] =
    suppliersResult.status === "fulfilled" && Array.isArray(suppliersResult.value)
      ? suppliersResult.value
      : []

  const rawConfirmedReceipts: RawReceipt[] =
    confirmedReceiptsResult.status === "fulfilled" && Array.isArray(confirmedReceiptsResult.value)
      ? confirmedReceiptsResult.value
      : []

  // ── 3. Derived metrics ────────────────────────────────────────────────────
  const revenue = summary?.revenue ?? 0
  const previousRevenue = summary?.previous_revenue ?? 0
  const revenueChange =
    previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0

  const netProfit = summary?.net_profit ?? 0
  const grossProfit = summary?.gross_profit ?? 0
  const orders = summary?.orders ?? 0
  const averageOrderValue = summary?.average_order_value ?? 0

  // Today's figures — last entry in sales_trend (most recent day)
  const trend = summary?.sales_trend ?? []
  const todayEntry = trend.length > 0 ? trend[trend.length - 1] : null
  const revenueToday = todayEntry?.revenue ?? 0
  const profitToday = todayEntry?.profit ?? 0
  const yesterdayEntry = trend.length >= 2 ? trend[trend.length - 2] : null
  const revenueYesterday = yesterdayEntry?.revenue ?? 0
  const revenueTodayChange =
    revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : 0
  const completedDays = trend.slice(0, -1)
  const dailyAverageRevenue =
    completedDays.length >= 3
      ? completedDays.reduce((sum, d) => sum + d.revenue, 0) / completedDays.length
      : 0

  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

  const missingCostLines = pnl?.cogs?.missing_cost_lines ?? 0
  const operatingExpenses = pnl?.operating_expenses ?? 0

  // Dashboard KPIs use ALL stock locations (storefront + storage combined) — WRONG for sales readiness.
  // Finance/inventory uses product_view.total_stock which filters is_sale_point=TRUE — CORRECT.
  // We derive storefront-accurate counts from velocityItems below.
  const topSellers = warehouse?.top_sellers ?? []

  const inventoryValue = inventory?.snapshot?.inventory_value ?? 0
  const deadStockValue = inventory?.dead_stock?.value ?? 0
  const missingCostCount = inventory?.snapshot?.missing_cost ?? 0

  const overdueCreditCount = credit?.overdue_count ?? 0
  const overdueCreditAmount = credit?.overdue_amount ?? 0

  // ── 3b. Inventory Intelligence ────────────────────────────────────────
  const velocityItems = inventory?.stock_velocity ?? []

  // STOREFRONT-ACCURATE stock counts (from product_view.total_stock = is_sale_point=TRUE only)
  const outOfStockCount = velocityItems.filter((v) => v.current_stock === 0).length
  const lowStockCount = velocityItems.filter(
    (v) => v.current_stock > 0 && v.min_stock > 0 && v.current_stock <= v.min_stock,
  ).length
  // Match RawWarehouseDashboard["low_stock_alerts"] shape for buildRisks compatibility
  const criticalLowStockAlerts: RawWarehouseDashboard["low_stock_alerts"] = velocityItems
    .filter((v) => v.days_of_stock !== null && v.days_of_stock < 3 && v.current_stock > 0)
    .map((v) => ({
      product_id: v.product_id,
      name: v.product_name,
      sku: "",
      unit: "ชิ้น",
      total_stock: v.current_stock,
      min_stock: v.min_stock,
      alert_level: "critical" as const,
    }))
  const lowStockAlerts: RawWarehouseDashboard["low_stock_alerts"] = velocityItems
    .filter((v) => v.current_stock > 0 && v.min_stock > 0 && v.current_stock <= v.min_stock)
    .map((v) => ({
      product_id: v.product_id,
      name: v.product_name,
      sku: "",
      unit: "ชิ้น",
      total_stock: v.current_stock,
      min_stock: v.min_stock,
      alert_level: (v.days_of_stock !== null && v.days_of_stock < 3 ? "critical" : "warning") as "critical" | "warning",
    }))
  const deadStockPct = inventoryValue > 0 ? deadStockValue / inventoryValue : 0
  const overstockRaw = inventory?.overstock ?? []
  const deadItemsRaw = inventory?.dead_stock?.items ?? []
  const nowMs = Date.now()

  // Pending PO supplier set — products from these suppliers likely have incoming stock
  const pendingPOSupplierIds = new Set(
    rawPurchaseOrders.filter((po) => po.status === "pending").map((po) => po.supplier_id),
  )

  // Build product→pending map from supplier_products × pending PO suppliers
  const rawSupplierProducts: RawSupplierProduct[] =
    // supplier_products passed as empty array — use receipt-based inference
    []
  const productsWithPendingPO = new Set<string>()
  for (const sp of rawSupplierProducts) {
    if (pendingPOSupplierIds.has(sp.supplier_id)) {
      productsWithPendingPO.add(sp.product_id)
    }
  }

  const urgentReorders = velocityItems
    .filter((v) => v.days_of_stock !== null && v.days_of_stock < 7)
    .slice(0, 5)
    .map((v) => {
      const targetQty = Math.max(v.min_stock * 2, Math.round(v.avg_daily_sales * 14))
      const reorderQty = Math.max(0, targetQty - v.current_stock)
      return {
        productId: v.product_id,
        productName: v.product_name,
        daysOfStock: v.days_of_stock as number,
        currentStock: v.current_stock,
        reorderQty,
        avgDailySales: v.avg_daily_sales,
        severity: ((v.days_of_stock as number) < 3 ? 'critical' : 'high') as 'critical' | 'high',
      }
    })

  // Warehouse-aware reorder recommendations
  const reorderRecommendations = velocityItems
    .filter((v) => v.days_of_stock !== null && v.days_of_stock < 7)
    .slice(0, 8)
    .map((v) => {
      const targetQty = Math.max(v.min_stock * 2, Math.round(v.avg_daily_sales * 14))
      const reorderQty = Math.max(0, targetQty - v.current_stock)
      const hasPendingPO = productsWithPendingPO.has(v.product_id)
      const recommendation: 'purchase' | 'wait_for_po' | 'transfer' = hasPendingPO ? 'wait_for_po' : 'purchase'
      const reasonTh = hasPendingPO
        ? `มี PO ค้างอยู่ — รอรับสินค้าก่อนสั่งซื้อใหม่`
        : `เหลือ ${(v.days_of_stock as number).toFixed(1)} วัน — ต้องสั่ง ${reorderQty} ชิ้น`
      return {
        productId: v.product_id,
        productName: v.product_name,
        daysOfStock: v.days_of_stock as number,
        currentStock: v.current_stock,
        reorderQty,
        avgDailySales: v.avg_daily_sales,
        severity: ((v.days_of_stock as number) < 3 ? 'critical' : 'high') as 'critical' | 'high',
        hasPendingPO,
        pendingPOQty: 0,
        recommendation,
        reasonTh,
      }
    })

  const topDeadCapital = deadItemsRaw.slice(0, 3).map((d) => {
    const lastSoldMs = d.last_sold ? new Date(d.last_sold).getTime() : null
    const daysInactive = lastSoldMs !== null ? Math.floor((nowMs - lastSoldMs) / 86400000) : null
    return {
      productId: d.product_id,
      productName: d.product_name,
      remaining: d.remaining,
      tiedValue: d.tied_value,
      lastSold: d.last_sold,
      neverSold: d.never_sold,
      daysInactive,
    }
  })

  const overstockItems = overstockRaw.slice(0, 5).map((o) => ({
    productId: o.product_id,
    productName: o.product_name,
    currentStock: o.current_stock,
    maxStock: o.max_stock,
    overstockQty: o.overstock_qty,
    capitalValue: o.capital_value,
  }))

  const totalOverstockValue = overstockRaw.reduce((sum, o) => sum + o.capital_value, 0)
  const topOverstockItem = overstockItems[0] ?? null

  // ── 3c. Money Intelligence ────────────────────────────────────────────
  const refunds = summary?.refunds ?? 0
  const cogs = summary?.cogs ?? 0
  const agingBuckets = (aging?.buckets ?? []).map((b) => ({
    label: b.label,
    count: b.count,
    amount: b.amount,
  }))
  const agingCustomers = (aging?.customers ?? []).map((c) => ({
    customerId: c.customer_id,
    customerName: c.customer_name,
    outstanding: c.outstanding,
    oldestBucket: c.oldest_bucket,
    daysOverdue: c.days_overdue,
  }))
  const totalOutstanding = aging?.total ?? 0
  const totalOverdue = overdueCreditAmount
  const dataQualityNotes: string[] = []
  if (missingCostLines > 0 || missingCostCount > 0) {
    dataQualityNotes.push(
      `มี ${Math.max(missingCostLines, missingCostCount)} สินค้าไม่ได้ใส่ราคาทุน — กำไรที่แสดงอาจสูงกว่าจริง`,
    )
  }
  if (refunds > 0) {
    dataQualityNotes.push(`หักคืนสินค้า ฿${fmtMoney(refunds)} จากยอดขายแล้ว`)
  }

  // ── 3d. Purchasing Intelligence ────────────────────────────────────────
  const productCostPrices = new Map<string, number>()
  for (const v of velocityItems) {
    if (v.cost_price > 0) productCostPrices.set(v.product_id, v.cost_price)
  }

  const purchasingIntel = buildPurchasingIntelligence({
    purchaseOrders: rawPurchaseOrders,
    suppliers: rawSuppliers,
    confirmedReceipts: rawConfirmedReceipts,
    supplierProducts: [],
    productCostPrices,
  })

  // ── 4. Health scores ──────────────────────────────────────────────────────
  const salesScore = computeSalesScore(revenueChange)
  const inventoryScore = computeInventoryScore(
    outOfStockCount,
    lowStockCount,
    deadStockPct,
    missingCostCount,
  )
  const financeScore = computeFinanceScore(netProfit, netMargin, grossMargin, missingCostLines)
  const operationsScore = computeOperationsScore(pendingReceiptsCount, overdueCreditCount)
  const overallScore = computeOverall(salesScore, inventoryScore, financeScore, operationsScore)

  // ── 5. Build risks, opportunities, actions ────────────────────────────────
  const topSupplier = purchasingIntel.supplierMetrics[0]
  const costIncreases = purchasingIntel.costChanges.filter((c) => c.changePct > 0)
  const costDecreases = purchasingIntel.costChanges.filter((c) => c.changePct < 0)

  const risks = buildRisks({
    outOfStockCount,
    criticalLowStockAlerts,
    lowStockAlerts,
    topSellers,
    deadStockValue,
    deadStockPct,
    netProfit,
    revenue,
    revenueChange,
    netMargin,
    grossMargin,
    operatingExpenses,
    missingCostLines,
    missingCostCount,
    pendingReceiptsCount,
    overdueCreditCount,
    overdueCreditAmount,
    todayRevenue: revenueToday,
    dailyAverageRevenue,
    overstockCount: overstockRaw.length,
    totalOverstockValue,
    topOverstockItem,
    topSupplierShare: topSupplier?.sharePercent ?? 0,
    topSupplierName: topSupplier?.supplierName ?? "",
    concentrationRisk: purchasingIntel.concentrationRisk,
    costIncreases: costIncreases.map((c) => ({
      productName: c.productName,
      changePct: c.changePct,
      supplierName: c.supplierName,
    })),
    stalePendingPOs: purchasingIntel.pendingPOCount,
    pendingPOValue: purchasingIntel.pendingPOValue,
  })

  const opportunities = buildOpportunities({
    topSellers,
    deadStockValue,
    revenueChange,
    netProfit,
    netMargin,
    topSupplierSpend: topSupplier?.totalSpend ?? 0,
    topSupplierName: topSupplier?.supplierName ?? "",
    topSupplierCreditDays: topSupplier?.creditDays ?? 0,
    costDecreases: costDecreases.map((c) => ({
      productName: c.productName,
      changePct: c.changePct,
      currentCost: c.currentCost,
      previousCost: c.previousCost,
    })),
  })

  const actions = buildActions({
    outOfStockCount,
    pendingReceiptsCount,
    overdueCreditCount,
    overdueCreditAmount,
    lowStockCount,
    deadStockValue,
    missingCostCount,
    totalOverstockValue,
    pendingPOCount: purchasingIntel.pendingPOCount,
    pendingPOValue: purchasingIntel.pendingPOValue,
    costIncreaseCount: costIncreases.length,
    urgentReorders,
    agingCustomers,
  })

  // ── 5b. Decision Engine ────────────────────────────────────────────────────
  const decisionEngine = buildDecisionEngine(actions)

  // ── 6. Assemble response ──────────────────────────────────────────────────
  const overview: CopilotOverview = {
    healthScore: {
      overall: overallScore,
      sales: {
        score: salesScore,
        revenueChange,
        previousRevenue,
      },
      inventory: {
        score: inventoryScore,
        outOfStockCount,
        lowStockCount,
        deadStockValue,
        missingCostCount,
      },
      finance: {
        score: financeScore,
        netProfit,
        netMargin,
        grossMargin,
        missingCostLines,
      },
      operations: {
        score: operationsScore,
        pendingReceiptsCount,
        overdueCreditCount,
        overdueCreditAmount,
      },
    },
    summary: {
      revenue,
      revenueChange,
      netProfit,
      netMargin,
      orders,
      averageOrderValue,
      revenueToday,
      profitToday,
      revenueTodayChange,
    },
    risks,
    opportunities,
    actions,
    inventoryIntelligence: {
      urgentReorders,
      reorderRecommendations,
      topDeadCapital,
      overstockItems,
      totalOverstockValue,
      totalDeadCapitalValue: deadStockValue,
    },
    moneyIntelligence: {
      revenue,
      refunds,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      netMargin,
      agingBuckets,
      agingCustomers,
      totalOutstanding,
      totalOverdue,
      dataQualityNotes,
    },
    purchasingIntelligence: purchasingIntel,
    decisionEngine,
    generatedAt: new Date().toISOString(),
  }

  // Wrap in the standard envelope that authorizedApiRequest / unwrapPayload expects
  return NextResponse.json({
    success: true,
    data: overview,
    message: "ok",
  })
}
