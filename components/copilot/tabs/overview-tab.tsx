"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Send,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { useCopilot } from "../copilot-provider"
import type {
  CopilotOverview,
  CopilotPriority,
} from "@/types/copilot"

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtChange(pct: number) {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600'
  if (s >= 60) return 'text-amber-500'
  return 'text-rose-500'
}

function scoreDot(s: number) {
  if (s >= 80) return 'bg-emerald-500'
  if (s >= 60) return 'bg-amber-400'
  return 'bg-rose-500'
}

function scoreBar(s: number) {
  if (s >= 80) return 'bg-emerald-500'
  if (s >= 60) return 'bg-amber-400'
  return 'bg-rose-500'
}

// ── Owner Narrative Engine ───────────────────────────────────────────────────

function buildOwnerNarrative(data: CopilotOverview): string {
  const { healthScore: h, summary: s, moneyIntelligence: money, inventoryIntelligence: intel, purchasingIntelligence: purch } = data
  const lines: string[] = []

  if (h.overall >= 80) {
    lines.push('วันนี้ร้านอยู่ในเกณฑ์ดี')
  } else if (h.overall >= 60) {
    lines.push('วันนี้ร้านอยู่ในเกณฑ์พอใช้ มีบางจุดที่ต้องดูแล')
  } else {
    lines.push('วันนี้ร้านต้องดูแลหลายจุด')
  }

  if (s.revenueTodayChange > 5) {
    lines.push(`ยอดขายเติบโต ${fmtChange(s.revenueTodayChange)} จากเมื่อวาน`)
  } else if (s.revenueTodayChange < -5) {
    lines.push(`ยอดขายลดลง ${fmtChange(s.revenueTodayChange)} จากเมื่อวาน`)
  } else if (s.revenueToday > 0) {
    lines.push('ยอดขายใกล้เคียงกับเมื่อวาน')
  }

  if (money.netProfit < 0) {
    lines.push(`ช่วงนี้กำลังขาดทุน ${fmtMoney(Math.abs(money.netProfit))} — ควรดูค่าใช้จ่ายและราคาสินค้า`)
  } else if (money.netMargin < 10 && money.revenue > 0) {
    lines.push(`อัตรากำไรสุทธิ ${money.netMargin.toFixed(1)}% ค่อนข้างบาง — ระวังค่าใช้จ่าย`)
  }

  const outOfStock = h.inventory.outOfStockCount
  const lowStock = h.inventory.lowStockCount
  if (outOfStock > 0 || lowStock > 0) {
    const parts: string[] = []
    if (outOfStock > 0) parts.push(`สินค้าหมด ${outOfStock} รายการ`)
    if (lowStock > 0) parts.push(`ใกล้หมด ${lowStock} รายการ`)
    lines.push(`มี${parts.join(' และ ')} ที่ต้องสั่งซื้อเพิ่ม`)
  }

  if (money.totalOverdue > 0) {
    const topDebtor = money.agingCustomers.filter(c => c.daysOverdue > 0).sort((a, b) => b.outstanding - a.outstanding)[0]
    if (topDebtor) {
      lines.push(`ลูกหนี้ค้างชำระ ${fmtMoney(money.totalOverdue)} — ควรติดตาม${topDebtor.customerName}ก่อน เนื่องจากมีโอกาสเก็บเงินคืน ${fmtMoney(topDebtor.outstanding)}`)
    } else {
      lines.push(`มีลูกหนี้ค้างชำระ ${fmtMoney(money.totalOverdue)}`)
    }
  }

  const deadValue = intel.totalDeadCapitalValue
  const overstockValue = intel.totalOverstockValue
  if (deadValue > 0 || overstockValue > 0) {
    const total = deadValue + overstockValue
    lines.push(`มีเงินจมในสต็อก ${fmtMoney(total)} — ควรพิจารณาจัดโปรหรือลดราคาเพื่อปลดสต็อก`)
  }

  if (purch.concentrationRisk === 'high' && purch.supplierMetrics.length > 0) {
    const top = purch.supplierMetrics[0]
    lines.push(`ซื้อจาก${top.supplierName} ${Math.round(top.sharePercent)}% ของยอดทั้งหมด — ควรหาซัพพลายเออร์สำรอง`)
  }

  if (purch.costChanges.filter(c => c.changePct > 10).length > 0) {
    const count = purch.costChanges.filter(c => c.changePct > 10).length
    lines.push(`ต้นทุนขึ้นอย่างน้อย ${count} สินค้า — ตรวจสอบและปรับราคาขายให้สอดคล้อง`)
  }

  if (purch.pendingPOCount > 0) {
    lines.push(`มีใบสั่งซื้อค้าง ${purch.pendingPOCount} ใบ (${fmtMoney(purch.pendingPOValue)}) ที่ยังไม่ได้รับสินค้า`)
  }

  const de = data.decisionEngine
  if (de?.topPriority) {
    lines.push(`สิ่งที่ควรทำก่อน: ${de.topPriority.action.title}`)
  }

  return lines.join('\n\n')
}

function buildDynamicSuggestions(data: CopilotOverview): string[] {
  const suggestions: string[] = []
  const add = (s: string) => { if (suggestions.length < 4) suggestions.push(s) }

  if (data.decisionEngine?.topPriority) add('🎯 วันนี้ทำอะไรก่อน')
  if (data.healthScore.inventory.outOfStockCount > 0 || data.healthScore.inventory.lowStockCount > 0) add('📦 สินค้าใกล้หมด')
  if (data.moneyIntelligence.totalOverdue > 0) add('👤 ลูกหนี้ค้างชำระ')
  if (data.purchasingIntelligence.costChanges.length > 0) add('💰 ต้นทุนเปลี่ยนไหม')
  add('📊 ภาพรวมร้าน')
  if (suggestions.length < 4) add('💰 กำไรเท่าไหร่')

  return suggestions.slice(0, 4)
}

// ── component ─────────────────────────────────────────────────────────────────

export function OverviewTab() {
  const { data, isLoading, error, refetch, setActiveTab, sendChatMessage } = useCopilot()
  const [askInput, setAskInput] = useState('')
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'th'
  const [now] = useState(() => new Date())
  const [healthExpanded, setHealthExpanded] = useState(false)

  function navigate(route: string) {
    router.push(`/${locale}${route}`)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-500">โหลดข้อมูลไม่สำเร็จ</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          ลองอีกครั้ง
        </button>
      </div>
    )
  }

  if (data.summary.revenue === 0 && data.summary.orders === 0 && data.risks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-full bg-violet-100 p-4">
          <Sparkles className="h-8 w-8 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">ยังไม่มีข้อมูลการขาย</p>
          <p className="mt-1 text-sm text-slate-400">เปิดหน้าขายเพื่อเริ่มบันทึกยอด</p>
        </div>
        <button
          onClick={() => navigate('/sales')}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          เปิดหน้าขาย
        </button>
      </div>
    )
  }

  const { healthScore: h, summary: s } = data
  const de = data.decisionEngine
  const intel = data.inventoryIntelligence
  const money = data.moneyIntelligence

  const top3Priorities: CopilotPriority[] = []
  if (de?.topPriority) top3Priorities.push(de.topPriority)
  if (de?.todayPriorities) {
    for (const p of de.todayPriorities) {
      if (top3Priorities.length >= 3) break
      if (p.action.id !== de.topPriority?.action.id) top3Priorities.push(p)
    }
  }

  const opportunities: Array<{ label: string; value: number; desc: string; route: string }> = []

  if (intel.totalDeadCapitalValue > 0) {
    opportunities.push({
      label: 'เงินจมในสต็อก',
      value: intel.totalDeadCapitalValue,
      desc: `สินค้าไม่เคลื่อนไหว ${intel.topDeadCapital.length} รายการ — จัดโปรลดราคาเพื่อปลดเงินทุน`,
      route: '/reports/inventory-value',
    })
  }

  if (intel.totalOverstockValue > 0) {
    opportunities.push({
      label: 'สต็อกเกินความจำเป็น',
      value: intel.totalOverstockValue,
      desc: `สินค้าสต็อกเกิน ${intel.overstockItems.length} รายการ — ลดการสั่งซื้อหรือจัดโปร`,
      route: '/inventory',
    })
  }

  if (money.totalOverdue > 0) {
    opportunities.push({
      label: 'ลูกหนี้ค้างชำระ',
      value: money.totalOverdue,
      desc: `เก็บเงินคืนจากลูกหนี้ ${money.agingCustomers.filter(c => c.daysOverdue > 0).length} ราย`,
      route: '/credit-sales',
    })
  }

  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const narrative = buildOwnerNarrative(data)

  const urgencyBadge = (p: CopilotPriority) => {
    if (p.urgencyLabel === 'วิกฤต') return 'bg-rose-100 text-rose-700'
    if (p.urgencyLabel === 'สูง') return 'bg-orange-100 text-orange-700'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="divide-y divide-slate-100">

      {/* ── SECTION 1 — Today's Business Summary ───────────────────────── */}
      <div className="px-4 pb-5 pt-4">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {dateStr}
        </p>

        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-slate-400">ยอดขายวันนี้</p>
            <p className="text-[28px] font-bold tabular-nums leading-tight text-slate-900">
              {fmtMoney(s.revenueToday)}
            </p>
            {s.revenueTodayChange !== 0 && (
              <p className={`mt-1.5 flex items-center gap-1 text-[12px] font-semibold ${s.revenueTodayChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {s.revenueTodayChange >= 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />
                }
                {fmtChange(s.revenueTodayChange)} จากเมื่อวาน
              </p>
            )}
          </div>

          <div className="w-px self-stretch bg-slate-100" />

          <div className="flex-1">
            <p className="text-[11px] text-slate-400">กำไรสุทธิ</p>
            <p className={`text-[28px] font-bold tabular-nums leading-tight ${s.profitToday >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {fmtMoney(s.profitToday)}
            </p>
            {money.netMargin !== 0 && (
              <p className="mt-1.5 text-[12px] font-medium text-slate-500">
                อัตรากำไร {money.netMargin.toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] text-slate-400">7 วัน</p>
            <p className="text-[13px] font-bold tabular-nums text-slate-700">{fmtMoney(s.revenue)}</p>
            <p className={`text-[10px] font-medium ${s.revenueChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {fmtChange(s.revenueChange)}
            </p>
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] text-slate-400">จำนวนบิล</p>
            <p className="text-[13px] font-bold tabular-nums text-slate-700">{s.orders.toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] text-slate-400">เฉลี่ย/บิล</p>
            <p className="text-[13px] font-bold tabular-nums text-slate-700">{fmtMoney(s.averageOrderValue)}</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 — สิ่งที่ต้องดูแลทันที ───────────────────────────── */}
      {top3Priorities.length > 0 && (
        <div className="px-4 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-rose-500">
            สิ่งที่ต้องดูแลทันที
          </p>
          <div className="space-y-2.5">
            {top3Priorities.map((p, i) => (
              <button
                key={p.action.id}
                onClick={() => navigate(p.action.route)}
                className={`group w-full rounded-xl border text-left transition-all hover:shadow-md ${
                  i === 0
                    ? 'border-violet-200 bg-violet-50/80 hover:border-violet-300'
                    : 'border-slate-150 bg-white hover:border-slate-200'
                }`}
              >
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${
                      i === 0 ? 'bg-violet-600' : 'bg-slate-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${urgencyBadge(p)}`}>
                      {p.urgencyLabel}
                    </span>
                  </div>

                  <p className={`text-[13px] font-semibold leading-snug ${i === 0 ? 'text-violet-900' : 'text-slate-800'}`}>
                    {p.action.title}
                  </p>

                  {p.action.impactValue && (
                    <div className="mt-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5">
                      <p className="text-[11px] text-rose-700">
                        <span className="font-semibold">ผลกระทบ: </span>
                        {p.action.impactValue}
                      </p>
                    </div>
                  )}

                  <p className="mt-1.5 text-[11px] font-medium text-violet-600">
                    แนะนำ: {p.reason}
                  </p>

                  <div className={`mt-2.5 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[12px] font-semibold text-white transition-colors ${
                    i === 0
                      ? 'bg-violet-600 group-hover:bg-violet-700'
                      : 'bg-slate-600 group-hover:bg-slate-700'
                  }`}>
                    ดำเนินการ <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {data.actions.length > 3 && (
            <button
              onClick={() => setActiveTab('actions')}
              className="mt-2 w-full text-center text-[11px] text-violet-600 hover:text-violet-700"
            >
              ดูทั้งหมด {data.actions.length} รายการ →
            </button>
          )}
        </div>
      )}

      {/* ── SECTION 3 — โอกาสทางธุรกิจ ──────────────────────────────────── */}
      {opportunities.length > 0 && (
        <div className="px-4 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            โอกาสทางธุรกิจ
          </p>
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <button
                key={opp.label}
                onClick={() => navigate(opp.route)}
                className="group w-full rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-left transition-all hover:border-emerald-200 hover:shadow-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-800">{opp.label}</p>
                  <p className="text-[14px] font-bold tabular-nums text-emerald-700">{fmtMoney(opp.value)}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">{opp.desc}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-600 group-hover:text-emerald-700">
                  ดำเนินการ →
                </p>
              </button>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[11px] font-medium text-emerald-700">
              มูลค่ารวมที่ปลดล็อกได้: <span className="font-bold tabular-nums">{fmtMoney(opportunities.reduce((sum, o) => sum + o.value, 0))}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 4 — สรุปสำหรับเจ้าของร้าน ──────────────────────────── */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            สรุปสำหรับเจ้าของร้าน
          </p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3.5">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
            {narrative}
          </p>
        </div>
      </div>

      {/* ── ASK ASSISTANT ───────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <MessageSquare className="h-3 w-3 text-violet-500" />
          ถามผู้ช่วย
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-violet-300 focus-within:bg-white">
          <input
            value={askInput}
            onChange={e => setAskInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && askInput.trim()) {
                sendChatMessage(askInput.trim())
                setAskInput('')
              }
            }}
            placeholder="ถามเกี่ยวกับร้านของคุณ..."
            className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => {
              if (askInput.trim()) {
                sendChatMessage(askInput.trim())
                setAskInput('')
              }
            }}
            disabled={!askInput.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {buildDynamicSuggestions(data).map(q => (
            <button
              key={q}
              onClick={() => sendChatMessage(q)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── STORE HEALTH (collapsed) ────────────────────────────────────── */}
      <div className="px-4 py-3">
        <button
          onClick={() => setHealthExpanded(v => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${scoreDot(h.overall)}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              สุขภาพร้าน
            </span>
            <span className={`text-[12px] font-bold tabular-nums ${scoreColor(h.overall)}`}>
              {h.overall}/100
            </span>
          </div>
          {healthExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          }
        </button>
        {healthExpanded && (
          <div className="mt-3 space-y-2">
            {[
              { label: 'ยอดขาย', score: h.sales.score },
              { label: 'สินค้า', score: h.inventory.score },
              { label: 'การเงิน', score: h.finance.score },
              { label: 'ดำเนินงาน', score: h.operations.score },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] text-slate-500">{label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full transition-all ${scoreBar(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`w-7 shrink-0 text-right text-[11px] font-semibold tabular-nums ${scoreColor(score)}`}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}
