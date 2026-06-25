"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, MessageSquare } from "lucide-react"
import { useCopilot } from "../copilot-provider"
import type {
  CopilotOverview,
  CopilotAction,
  CopilotRisk,
  CopilotOpportunity,
  CopilotPriority,
  CopilotFollowUp,
} from "@/types/copilot"

// ── Language Detection ──

type Lang = 'th' | 'en'

const TH_RANGE = /[฀-๿]/
const EN_RANGE = /[a-zA-Z]/

function detectLang(text: string): Lang {
  let th = 0, en = 0
  for (const ch of text) {
    if (TH_RANGE.test(ch)) th++
    else if (EN_RANGE.test(ch)) en++
  }
  return en > th ? 'en' : 'th'
}

// ── Saku Response Types ──

interface SakuSection {
  icon: string
  title: string
  lines: string[]
}

interface SakuResponse {
  sections: SakuSection[]
  followUps: CopilotFollowUp[]
  context: ConversationContext
}

function sec(icon: string, title: string, ...lines: string[]): SakuSection {
  return { icon, title, lines: lines.filter(Boolean) }
}

// ── Conversation Context ──

interface ContextItem {
  index: number
  label: string
  type: 'action' | 'risk' | 'opportunity' | 'product' | 'customer'
  data: CopilotAction | CopilotRisk | CopilotOpportunity | CopilotPriority | { name: string; value: number }
}

interface ConversationContext {
  lastTopic: string | null
  lastItems: ContextItem[]
  lastItemType: string | null
}

function emptyContext(): ConversationContext {
  return { lastTopic: null, lastItems: [], lastItemType: null }
}

// ── Formatting ──

function fmtMoney(n: number) {
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pctStr(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

// ── Reference Resolution ──

const ORDINALS_TH: Record<string, number> = {
  'ข้อแรก': 0, 'ข้อที่ 1': 0, 'ข้อ 1': 0, 'อันแรก': 0, 'ตัวแรก': 0, 'รายแรก': 0,
  'ข้อสอง': 1, 'ข้อที่ 2': 1, 'ข้อ 2': 1, 'อันที่ 2': 1, 'อันที่สอง': 1, 'ตัวที่ 2': 1,
  'ข้อสาม': 2, 'ข้อที่ 3': 2, 'ข้อ 3': 2, 'อันที่ 3': 2, 'อันที่สาม': 2, 'ตัวที่ 3': 2,
}

const ORDINALS_EN: Record<string, number> = {
  'first': 0, '#1': 0, 'first one': 0, 'number 1': 0, 'number one': 0,
  'second': 1, '#2': 1, 'second one': 1, 'number 2': 1, 'number two': 1,
  'third': 2, '#3': 2, 'third one': 2, 'number 3': 2, 'number three': 2,
}

function resolveReference(q: string, ctx: ConversationContext): ContextItem | null {
  if (ctx.lastItems.length === 0) return null
  for (const [pat, idx] of Object.entries(ORDINALS_TH)) {
    if (q.includes(pat) && ctx.lastItems[idx]) return ctx.lastItems[idx]
  }
  for (const [pat, idx] of Object.entries(ORDINALS_EN)) {
    if (q.includes(pat) && ctx.lastItems[idx]) return ctx.lastItems[idx]
  }
  if (q.includes('เรื่องเมื่อกี้') || q.includes('อันนั้น') || q.includes('ตัวนั้น') ||
      q.includes('that one') || q.includes('the one') || q.includes('it')) {
    return ctx.lastItems[0]
  }
  if (q.includes('ลูกหนี้รายนั้น') || q.includes('that customer')) {
    return ctx.lastItems.find(i => i.type === 'customer') ?? null
  }
  if (q.includes('สินค้าตัวนั้น') || q.includes('that product')) {
    return ctx.lastItems.find(i => i.type === 'product') ?? null
  }
  return null
}

// ── Explain Referenced Items ──

function explainItem(item: ContextItem, data: CopilotOverview, lang: Lang): SakuSection[] {
  if (item.type === 'action') {
    const a = item.data as CopilotAction
    const de = data.decisionEngine
    const scored = de?.todayPriorities.find(p => p.action.id === a.id)
      ?? de?.weekPriorities.find(p => p.action.id === a.id)
      ?? (de?.topPriority?.action.id === a.id ? de.topPriority : null)
    return [sec('🎯', a.title,
      a.description,
      scored ? (lang === 'en' ? `Reason: ${scored.reason}` : `เหตุผล: ${scored.reason}`) : '',
      a.impactValue ? (lang === 'en' ? `Impact: ${a.impactValue}` : `ผลกระทบ: ${a.impactValue}`) : '',
    )]
  }
  if (item.type === 'risk') {
    const r = item.data as CopilotRisk
    return [
      sec('⚠️', r.title, r.description),
      sec('💥', lang === 'en' ? 'Impact' : 'ผลกระทบ', r.impact),
      sec('🎯', lang === 'en' ? 'Action' : 'แนะนำ', r.action),
    ]
  }
  if (item.type === 'opportunity') {
    const o = item.data as CopilotOpportunity
    return [sec('💡', o.title, o.description, o.recommendation)]
  }
  if (item.type === 'customer') {
    const c = item.data as { name: string; value: number }
    return [sec('👤', c.name, lang === 'en' ? `Outstanding: ${fmtMoney(c.value)}` : `ยอดค้าง: ${fmtMoney(c.value)}`)]
  }
  if (item.type === 'product') {
    const p = item.data as { name: string; value: number }
    return [sec('📦', p.name, lang === 'en' ? `Stock: ${p.value}` : `คงเหลือ: ${p.value}`)]
  }
  return [sec('ℹ️', item.label)]
}

function explainWhy(item: ContextItem, data: CopilotOverview, lang: Lang): SakuSection[] {
  if (item.type === 'action') {
    const a = item.data as CopilotAction
    const de = data.decisionEngine
    const scored = de?.todayPriorities.find(p => p.action.id === a.id)
      ?? de?.weekPriorities.find(p => p.action.id === a.id)
      ?? (de?.topPriority?.action.id === a.id ? de.topPriority : null)
    const sections: SakuSection[] = [
      sec('🎯', lang === 'en' ? `Why: ${a.title}` : `ทำไม: ${a.title}`, scored?.reason ?? a.description),
    ]
    if (a.impactValue) sections.push(sec('💰', lang === 'en' ? 'Impact' : 'ผลกระทบ', a.impactValue))
    if (scored && de?.topPriority?.action.id === a.id) {
      sections.push(sec('🏆', '', lang === 'en' ? '#1 priority right now' : 'ควรทำเป็นอันดับ 1 ตอนนี้'))
    }
    return sections
  }
  if (item.type === 'risk') {
    const r = item.data as CopilotRisk
    return [
      sec('⚠️', lang === 'en' ? `Why: ${r.title}` : `ทำไม: ${r.title}`, r.impact),
      sec('🎯', lang === 'en' ? 'Action' : 'แนะนำ', r.action),
    ]
  }
  if (item.type === 'customer') {
    const c = item.data as { name: string; value: number }
    return [sec('👤', c.name,
      lang === 'en'
        ? `Outstanding ${fmtMoney(c.value)} — collecting improves cash flow`
        : `ค้าง ${fmtMoney(c.value)} — เก็บได้จะช่วยเงินสดหมุนเวียน`,
    )]
  }
  return explainItem(item, data, lang)
}

// ── Consequence Reasoning ──

function buildConsequence(data: CopilotOverview, ctx: ConversationContext, lang: Lang): SakuSection[] {
  if (ctx.lastItems.length === 0) {
    return [sec('🤔', '', lang === 'en' ? 'Ask about a specific issue first, then I can explain consequences.' : 'ถามเรื่องใดเรื่องหนึ่งก่อน แล้วเดี๋ยวอธิบายผลกระทบให้ครับ')]
  }
  const item = ctx.lastItems[0]
  const sections: SakuSection[] = []

  if (item.type === 'action') {
    const a = item.data as CopilotAction
    if (a.id.includes('out_of_stock') || a.id.includes('reorder')) {
      sections.push(sec('⚠️', lang === 'en' ? 'If ignored' : 'ถ้าไม่ทำ',
        lang === 'en' ? 'Lost sales from out-of-stock items' : 'เสียยอดขายจากสินค้าหมด',
        lang === 'en' ? 'Customers may switch to competitors' : 'ลูกค้าอาจไปซื้อร้านอื่น',
      ))
    } else if (a.id.includes('credit') || a.id.includes('overdue')) {
      sections.push(sec('⚠️', lang === 'en' ? 'If ignored' : 'ถ้าไม่ทำ',
        lang === 'en' ? 'Cash flow tightens' : 'เงินสดหมุนเวียนลดลง',
        lang === 'en' ? 'Older debts become harder to collect' : 'ยิ่งค้างนานยิ่งเก็บยาก',
      ))
    } else if (a.id.includes('dead') || a.id.includes('overstock')) {
      sections.push(sec('⚠️', lang === 'en' ? 'If ignored' : 'ถ้าไม่ทำ',
        lang === 'en' ? 'Capital stays locked in unsold inventory' : 'เงินทุนจมอยู่ในสินค้าขายไม่ออก',
        lang === 'en' ? 'Storage costs accumulate' : 'เสียพื้นที่จัดเก็บ',
      ))
    } else {
      sections.push(sec('⚠️', lang === 'en' ? 'If ignored' : 'ถ้าไม่ทำ',
        lang === 'en' ? 'Issue may escalate or cost more later' : 'ปัญหาอาจรุนแรงขึ้นหรือเสียค่าใช้จ่ายมากขึ้น',
      ))
    }
  } else if (item.type === 'risk') {
    const r = item.data as CopilotRisk
    sections.push(sec('⚠️', lang === 'en' ? 'Consequence' : 'ผลกระทบถ้าปล่อยไว้', r.impact))
    sections.push(sec('🎯', lang === 'en' ? 'Recommended' : 'ควรทำ', r.action))
  } else if (item.type === 'customer') {
    const c = item.data as { name: string; value: number }
    sections.push(sec('⚠️', lang === 'en' ? 'If not collected' : 'ถ้าไม่เก็บ',
      lang === 'en' ? `${fmtMoney(c.value)} stays unavailable for operations` : `${fmtMoney(c.value)} ไม่พร้อมใช้ในธุรกิจ`,
      lang === 'en' ? 'Risk of becoming bad debt' : 'เสี่ยงกลายเป็นหนี้สูญ',
    ))
  }

  if (sections.length === 0) {
    sections.push(sec('🤔', '', lang === 'en' ? 'No significant consequence for this item.' : 'ไม่มีผลกระทบสำคัญสำหรับเรื่องนี้'))
  }
  return sections
}

// ── Urgency Assessment ──

function buildUrgency(data: CopilotOverview, ctx: ConversationContext, lang: Lang): SakuSection[] {
  if (ctx.lastItems.length === 0) {
    return [sec('🤔', '', lang === 'en' ? 'Ask about something first.' : 'ถามเรื่องใดเรื่องหนึ่งก่อนครับ')]
  }
  const item = ctx.lastItems[0]

  if (item.type === 'action') {
    const a = item.data as CopilotAction
    const de = data.decisionEngine
    const isTop = de?.topPriority?.action.id === a.id
    const inToday = de?.todayPriorities.some(p => p.action.id === a.id)

    if (isTop) {
      return [sec('🔴', lang === 'en' ? 'Do it now' : 'ควรทำตอนนี้เลย',
        lang === 'en' ? 'This is the #1 priority' : 'เป็นเรื่องสำคัญอันดับ 1',
        a.impactValue ?? '',
      )]
    }
    if (inToday) {
      return [sec('🟡', lang === 'en' ? 'Do it today' : 'ควรทำวันนี้',
        lang === 'en' ? `One of today's priorities` : `อยู่ในรายการที่ควรทำวันนี้`,
      )]
    }
    return [sec('🟢', lang === 'en' ? 'This week' : 'ทำภายในสัปดาห์นี้',
      lang === 'en' ? 'Important but not urgent today' : 'สำคัญแต่ยังไม่เร่งด่วนวันนี้',
    )]
  }

  if (item.type === 'risk') {
    const r = item.data as CopilotRisk
    const urgMap: Record<string, { icon: string; label: string; labelEn: string }> = {
      'critical': { icon: '🔴', label: 'ต้องทำตอนนี้', labelEn: 'Act now' },
      'high': { icon: '🟡', label: 'ควรทำวันนี้', labelEn: 'Today' },
      'medium': { icon: '🟢', label: 'ภายในสัปดาห์', labelEn: 'This week' },
      'low': { icon: '⚪', label: 'ติดตาม', labelEn: 'Monitor' },
    }
    const u = urgMap[r.severity] ?? urgMap['low']
    return [sec(u.icon, lang === 'en' ? u.labelEn : u.label, r.action)]
  }

  return [sec('🟢', lang === 'en' ? 'When convenient' : 'ทำเมื่อสะดวก')]
}

// ── Dynamic Follow-up Generator ──

function generateFollowUps(
  topic: string,
  data: CopilotOverview,
  lang: Lang,
  ctx?: ConversationContext,
): CopilotFollowUp[] {
  const result: CopilotFollowUp[] = []
  const { healthScore: h, inventoryIntelligence: intel, moneyIntelligence: money, purchasingIntelligence: purch } = data

  const add = (label: string, query: string) => { if (result.length < 4) result.push({ label, query }) }

  // Context-aware: if last items reference specific products/customers, suggest item-level follow-ups
  const lastItem = ctx?.lastItems?.[0]
  if (lastItem) {
    if (lastItem.type === 'product') {
      add(lang === 'en' ? 'Need to reorder?' : '🛒 ต้องสั่งซื้อเพิ่มไหม', lang === 'en' ? 'should I reorder' : 'ต้องสั่งซื้อเพิ่มไหม')
      add(lang === 'en' ? 'What if ignored?' : '⚠️ ถ้าปล่อยไว้จะเป็นไง', lang === 'en' ? 'what happens if ignored' : 'ถ้าไม่ทำจะเกิดอะไรขึ้น')
      add(lang === 'en' ? 'Similar risks?' : '📦 สินค้าไหนเสี่ยงอีก', lang === 'en' ? 'other products at risk' : 'สินค้าไหนเสี่ยงแบบนี้อีก')
    } else if (lastItem.type === 'customer') {
      add(lang === 'en' ? 'Aging details' : '📊 ค้างนานแค่ไหน', lang === 'en' ? 'aging details' : 'ลูกหนี้ค้างชำระ')
      add(lang === 'en' ? 'What if not collected?' : '⚠️ ถ้าไม่เก็บจะเป็นไง', lang === 'en' ? 'what happens if not collected' : 'ถ้าไม่เก็บเงินจะเกิดอะไรขึ้น')
      add(lang === 'en' ? 'Who to collect first?' : '🎯 ควรติดตามใครก่อน', lang === 'en' ? 'who to collect first' : 'ควรติดตามใครก่อน')
      add(lang === 'en' ? 'Total collectible' : '💰 เก็บได้อีกเท่าไร', lang === 'en' ? 'total outstanding' : 'ลูกหนี้ค้างชำระ')
      return result
    } else if (lastItem.type === 'action') {
      add(lang === 'en' ? 'Why?' : '🤔 ทำไมต้องทำ', lang === 'en' ? 'why is this important' : 'ทำไมสำคัญ')
      add(lang === 'en' ? 'Do today?' : '📅 ควรทำวันนี้ไหม', lang === 'en' ? 'should I do this today' : 'ควรทำวันนี้ไหม')
      add(lang === 'en' ? 'What if ignored?' : '⚠️ ถ้าไม่ทำจะเป็นไง', lang === 'en' ? 'what happens if ignored' : 'ถ้าไม่ทำจะเกิดอะไรขึ้น')
      return result
    }
    if (result.length >= 3) return result
  }

  // Topic-based follow-ups (fill remaining slots)
  if (topic === 'actions' || topic === 'overview') {
    if (h.inventory.outOfStockCount > 0) add(lang === 'en' ? 'Low stock details' : '📦 สินค้าใกล้หมด', lang === 'en' ? 'stock status' : 'สินค้าใกล้หมด')
    if (money.totalOverdue > 0) add(lang === 'en' ? 'Overdue debtors' : '👤 ลูกหนี้ค้าง', lang === 'en' ? 'overdue debtors' : 'ลูกหนี้ค้างชำระ')
    if (purch.costChanges.length > 0) add(lang === 'en' ? 'Cost changes' : '💰 ต้นทุนเปลี่ยน', lang === 'en' ? 'cost changes' : 'ต้นทุนที่เปลี่ยน')
    add(lang === 'en' ? 'Profit report' : '💰 กำไรเท่าไหร่', lang === 'en' ? 'profit report' : 'กำไรเท่าไหร่')
  } else if (topic === 'stock') {
    if (intel.urgentReorders.length > 0) add(lang === 'en' ? 'Reorder now' : '🛒 ต้องสั่งซื้ออะไร', lang === 'en' ? 'reorder suggestions' : 'ต้องสั่งซื้ออะไร')
    if (intel.topDeadCapital.length > 0) add(lang === 'en' ? 'Dead stock' : '💀 สินค้าค้างสต็อก', lang === 'en' ? 'dead stock' : 'สินค้าค้างสต็อก')
    add(lang === 'en' ? 'What if ignored?' : '⚠️ ถ้าไม่ทำจะเป็นไง', lang === 'en' ? 'what happens if I ignore this' : 'ถ้าไม่ทำจะเกิดอะไรขึ้น')
    add(lang === 'en' ? 'Purchasing overview' : '🛒 สรุปจัดซื้อ', lang === 'en' ? 'purchasing' : 'จัดซื้อ')
  } else if (topic === 'sales') {
    add(lang === 'en' ? 'Profit details' : '💰 กำไรสุทธิ', lang === 'en' ? 'profit' : 'กำไร')
    if (h.inventory.outOfStockCount > 0) add(lang === 'en' ? 'Stock issues' : '📦 สต็อกมีปัญหา', lang === 'en' ? 'stock' : 'สต็อก')
    add(lang === 'en' ? 'Top priorities' : '🎯 ควรทำอะไร', lang === 'en' ? 'what should I do' : 'วันนี้ทำอะไรก่อน')
  } else if (topic === 'profit') {
    if (money.operatingExpenses > 0) add(lang === 'en' ? 'Expenses breakdown' : '📊 ค่าใช้จ่ายอะไรบ้าง', lang === 'en' ? 'expenses' : 'ค่าใช้จ่าย')
    if (purch.costChanges.length > 0) add(lang === 'en' ? 'Cost changes' : '💰 ต้นทุนเปลี่ยนไหม', lang === 'en' ? 'cost changes' : 'ต้นทุน')
    add(lang === 'en' ? 'Opportunities' : '💡 โอกาสเพิ่มกำไร', lang === 'en' ? 'opportunities' : 'โอกาส')
  } else if (topic === 'aging') {
    add(lang === 'en' ? 'What if not collected?' : '⚠️ ถ้าไม่เก็บจะเป็นไง', lang === 'en' ? 'what happens if I dont collect' : 'ถ้าไม่เก็บเงินจะเกิดอะไรขึ้น')
    add(lang === 'en' ? 'Top priorities' : '🎯 ควรทำอะไรก่อน', lang === 'en' ? 'priorities' : 'วันนี้ทำอะไรก่อน')
  } else if (topic === 'purchasing') {
    if (purch.concentrationRisk !== 'low') add(lang === 'en' ? 'Supplier risk' : '⚠️ เสี่ยงพึ่งรายเดียว', lang === 'en' ? 'supplier concentration risk' : 'ความเสี่ยงซัพพลายเออร์')
    add(lang === 'en' ? 'Stock status' : '📦 สต็อกตอนนี้', lang === 'en' ? 'stock' : 'สต็อก')
    add(lang === 'en' ? 'Profit impact' : '💰 กำไรเท่าไหร่', lang === 'en' ? 'profit' : 'กำไร')
  } else if (topic === 'risks') {
    add(lang === 'en' ? 'Consequences' : '⚠️ ถ้าไม่ทำจะเป็นไง', lang === 'en' ? 'what happens if ignored' : 'ถ้าไม่ทำจะเกิดอะไรขึ้น')
    add(lang === 'en' ? 'Do it today?' : '📅 ควรทำวันนี้ไหม', lang === 'en' ? 'should I do this today' : 'ควรทำวันนี้ไหม')
    add(lang === 'en' ? 'Opportunities' : '💡 โอกาส', lang === 'en' ? 'opportunities' : 'โอกาส')
  } else if (topic === 'consequence' || topic === 'urgency') {
    add(lang === 'en' ? 'Top priorities' : '🎯 ทำอะไรก่อน', lang === 'en' ? 'priorities' : 'วันนี้ทำอะไรก่อน')
    add(lang === 'en' ? 'Store overview' : '📊 ภาพรวมร้าน', lang === 'en' ? 'overview' : 'ภาพรวมร้าน')
  } else {
    if (data.risks.length > 0) add(lang === 'en' ? 'Issues' : '⚠️ ปัญหาที่พบ', lang === 'en' ? 'issues' : 'ปัญหา')
    add(lang === 'en' ? 'Store overview' : '📊 ภาพรวมร้าน', lang === 'en' ? 'overview' : 'ภาพรวมร้าน')
    add(lang === 'en' ? 'Priorities' : '🎯 ทำอะไรก่อน', lang === 'en' ? 'priorities' : 'วันนี้ทำอะไรก่อน')
    add(lang === 'en' ? 'Stock status' : '📦 สต็อก', lang === 'en' ? 'stock' : 'สต็อก')
  }

  return result
}

// ── Saku Response Engine ──

function buildSakuResponse(
  input: string,
  data: CopilotOverview | undefined,
  lang: Lang,
  prevCtx: ConversationContext,
): SakuResponse {
  if (!data) {
    return {
      sections: [sec('⏳', '', lang === 'en' ? 'Loading store data...' : 'กำลังโหลดข้อมูลร้าน...')],
      followUps: [],
      context: prevCtx,
    }
  }

  const q = input.toLowerCase()
  const { healthScore: h, summary: s, risks, opportunities, decisionEngine: de, moneyIntelligence: money, inventoryIntelligence: intel, purchasingIntelligence: purch } = data

  // ── 1. Reference resolution ──
  const ref = resolveReference(q, prevCtx)
  if (ref) {
    const isWhy = q.includes('ทำไม') || q.includes('เพราะอะไร') || q.includes('why') || q.includes('how come')
    const sections = isWhy ? explainWhy(ref, data, lang) : explainItem(ref, data, lang)
    return { sections, followUps: generateFollowUps(prevCtx.lastTopic ?? '', data, lang, prevCtx), context: prevCtx }
  }

  // ── 2. "Why" about last topic ──
  if ((q.includes('ทำไม') || q.includes('เพราะ') || q.includes('why')) && prevCtx.lastItems.length > 0) {
    const sections = explainWhy(prevCtx.lastItems[0], data, lang)
    return { sections, followUps: generateFollowUps(prevCtx.lastTopic ?? '', data, lang, prevCtx), context: prevCtx }
  }

  // ── 3. Consequence: "ถ้าไม่ทำจะเกิดอะไรขึ้น" ──
  if (q.includes('ถ้าไม่ทำ') || q.includes('ถ้าไม่เก็บ') || q.includes('ปล่อยไว้') ||
      q.includes('what happens') || q.includes('if i ignore') || q.includes('consequence') || q.includes('if not')) {
    const sections = buildConsequence(data, prevCtx, lang)
    return { sections, followUps: generateFollowUps('consequence', data, lang), context: { ...prevCtx, lastTopic: 'consequence' } }
  }

  // ── 4. Urgency: "ควรทำวันนี้ไหม" ──
  if (q.includes('ควรทำวันนี้') || q.includes('เร่งด่วน') || q.includes('ด่วนไหม') ||
      q.includes('should i do this today') || q.includes('urgent') || q.includes('how urgent')) {
    const sections = buildUrgency(data, prevCtx, lang)
    return { sections, followUps: generateFollowUps('urgency', data, lang), context: { ...prevCtx, lastTopic: 'urgency' } }
  }

  // ── 5. Action trigger: "สร้างให้เลย" / "do it" ──
  if (q.includes('สร้างให้') || q.includes('ทำให้') || q.includes('สั่งซื้อให้') ||
      q.includes('create it') || q.includes('do it') || q.includes('make it')) {
    return {
      sections: [sec('🚧', lang === 'en' ? 'Coming soon' : 'กำลังพัฒนา',
        lang === 'en' ? 'Draft actions require approval before execution' : 'ฟีเจอร์สร้างคำสั่งต้องมีการอนุมัติก่อน',
        lang === 'en' ? 'This feature is being built — use the workflow directly for now' : 'กำลังพัฒนา — ใช้เมนูสร้างโดยตรงก่อนครับ',
      )],
      followUps: generateFollowUps(prevCtx.lastTopic ?? '', data, lang),
      context: prevCtx,
    }
  }

  // ── 6. Today's priorities ──
  if (q.includes('ทำอะไร') || q.includes('ทำอะไรก่อน') || q.includes('ควรทำ') ||
      q.includes('วันนี้') || q.includes('สำคัญ') ||
      q.includes('what should') || q.includes('to do') || q.includes('today') ||
      q.includes('priority') || q.includes('priorities') || q.includes('focus')) {
    if (!de?.topPriority) {
      return {
        sections: [sec('✅', '', lang === 'en' ? 'All clear! Nothing urgent.' : 'ทำครบแล้ว ไม่มีเรื่องด่วนครับ')],
        followUps: generateFollowUps('actions', data, lang),
        context: { lastTopic: 'actions', lastItems: [], lastItemType: 'action' },
      }
    }

    const items: ContextItem[] = []
    const sections: SakuSection[] = []
    const allPriorities = de.todayPriorities.length > 0 ? de.todayPriorities : [de.topPriority]
    const top3 = allPriorities.slice(0, 3)

    const lines: string[] = []
    top3.forEach((p, i) => {
      items.push({ index: i + 1, label: p.action.title, type: 'action', data: p.action })
      lines.push(`${i + 1}. ${p.action.title}`)
      lines.push(`   ${p.action.impactValue ?? p.reason}`)
    })
    sections.push(sec('🎯', lang === 'en' ? 'Today' : 'วันนี้ต้องทำ', ...lines))

    if (de.weekPriorities.length > 0) {
      const weekLines = de.weekPriorities.slice(0, 2).map((p) => {
        items.push({ index: items.length + 1, label: p.action.title, type: 'action', data: p.action })
        return `• ${p.action.title}`
      })
      sections.push(sec('📅', lang === 'en' ? 'This week' : 'สัปดาห์นี้', ...weekLines))
    }

    const newCtx = { lastTopic: 'actions' as const, lastItems: items, lastItemType: 'action' as const }
    return {
      sections,
      followUps: generateFollowUps('actions', data, lang, newCtx),
      context: newCtx,
    }
  }

  // ── 7. Overview / health ──
  if (q.includes('health') || q.includes('score') || q.includes('overview') ||
      q.includes('business') || q.includes('ภาพรวม') || q.includes('สุขภาพ') || q.includes('สรุป')) {
    const items: ContextItem[] = []
    const sections: SakuSection[] = []

    const scoreLabel = h.overall >= 80 ? (lang === 'en' ? 'Great' : 'ดีมาก') :
                       h.overall >= 60 ? (lang === 'en' ? 'Needs attention' : 'ต้องดูแล') :
                       (lang === 'en' ? 'Critical' : 'วิกฤต')

    sections.push(sec('📊', lang === 'en' ? 'Business' : 'ภาพรวมวันนี้',
      lang === 'en' ? `Score: ${h.overall}/100 (${scoreLabel})` : `คะแนน ${h.overall}/100 (${scoreLabel})`,
      lang === 'en' ? `Today: ${fmtMoney(s.revenueToday)} revenue, ${fmtMoney(s.profitToday)} profit` : `วันนี้: ขาย ${fmtMoney(s.revenueToday)} กำไร ${fmtMoney(s.profitToday)}`,
      lang === 'en' ? `7-day: ${fmtMoney(s.revenue)} (${pctStr(s.revenueChange)})` : `7 วัน: ${fmtMoney(s.revenue)} (${pctStr(s.revenueChange)})`,
    ))

    const invLines: string[] = []
    if (h.inventory.outOfStockCount > 0) invLines.push(lang === 'en' ? `Out of stock: ${h.inventory.outOfStockCount}` : `หมด ${h.inventory.outOfStockCount} รายการ`)
    if (h.inventory.lowStockCount > 0) invLines.push(lang === 'en' ? `Low stock: ${h.inventory.lowStockCount}` : `ใกล้หมด ${h.inventory.lowStockCount} รายการ`)
    if (h.inventory.deadStockValue > 0) invLines.push(lang === 'en' ? `Dead capital: ${fmtMoney(h.inventory.deadStockValue)}` : `เงินจม ${fmtMoney(h.inventory.deadStockValue)}`)
    if (invLines.length > 0) sections.push(sec('📦', lang === 'en' ? 'Inventory' : 'สินค้า', ...invLines))

    if (risks.length > 0) {
      const riskLines = risks.slice(0, 2).map((r, i) => {
        items.push({ index: i + 1, label: r.title, type: 'risk', data: r })
        return `${i + 1}. ${r.title}`
      })
      sections.push(sec('⚠️', lang === 'en' ? `Issues (${risks.length})` : `ปัญหา (${risks.length})`, ...riskLines))
    }

    if (s.netProfit >= 0) {
      sections.push(sec('✅', lang === 'en' ? 'Good' : 'จุดแข็ง',
        lang === 'en' ? `Profitable: ${fmtMoney(s.netProfit)} (${s.netMargin.toFixed(1)}% margin)` : `มีกำไร ${fmtMoney(s.netProfit)} (${s.netMargin.toFixed(1)}%)`,
      ))
    }

    return {
      sections,
      followUps: generateFollowUps('overview', data, lang),
      context: { lastTopic: 'overview', lastItems: items, lastItemType: items.length > 0 ? 'risk' : null },
    }
  }

  // ── 8. Stock / inventory ──
  if (q.includes('stock') || q.includes('inventory') || q.includes('สต็อก') || q.includes('สินค้า') || q.includes('หมด') || q.includes('ใกล้หมด')) {
    const items: ContextItem[] = []
    const sections: SakuSection[] = []

    sections.push(sec('📦', lang === 'en' ? 'Inventory' : 'สต็อกสินค้า',
      lang === 'en' ? `Out: ${h.inventory.outOfStockCount} | Low: ${h.inventory.lowStockCount} | Score: ${h.inventory.score}/100` : `หมด ${h.inventory.outOfStockCount} | ใกล้หมด ${h.inventory.lowStockCount} | คะแนน ${h.inventory.score}/100`,
      h.inventory.deadStockValue > 0 ? (lang === 'en' ? `Dead capital: ${fmtMoney(h.inventory.deadStockValue)}` : `เงินจม: ${fmtMoney(h.inventory.deadStockValue)}`) : '',
    ))

    if (intel.urgentReorders.length > 0) {
      const reorderLines = intel.urgentReorders.slice(0, 3).map((r, i) => {
        items.push({ index: i + 1, label: r.productName, type: 'product', data: { name: r.productName, value: r.currentStock } })
        return `${i + 1}. ${r.productName} — ${lang === 'en' ? `${r.daysOfStock.toFixed(1)}d left` : `เหลือ ${r.daysOfStock.toFixed(1)} วัน`}`
      })
      sections.push(sec('🛒', lang === 'en' ? 'Reorder now' : 'ต้องสั่งด่วน', ...reorderLines))
    }

    if (intel.topDeadCapital.length > 0) {
      const deadLines = intel.topDeadCapital.slice(0, 2).map(d =>
        `${d.productName} — ${fmtMoney(d.tiedValue)}${d.neverSold ? (lang === 'en' ? ' (never sold)' : ' (ไม่เคยขาย)') : ''}`
      )
      sections.push(sec('💀', lang === 'en' ? 'Dead stock' : 'ค้างสต็อก', ...deadLines))
    }

    const stockCtx: ConversationContext = { lastTopic: 'stock', lastItems: items, lastItemType: items.length > 0 ? 'product' : null }
    return {
      sections,
      followUps: generateFollowUps('stock', data, lang, stockCtx),
      context: stockCtx,
    }
  }

  // ── 9. Sales ──
  if (q.includes('sales') || q.includes('revenue') || q.includes('ยอดขาย') || q.includes('ขาย')) {
    return {
      sections: [
        sec('📊', lang === 'en' ? 'Sales (7d)' : 'ยอดขาย 7 วัน',
          `${lang === 'en' ? 'Revenue' : 'ยอด'}: ${fmtMoney(s.revenue)} (${pctStr(s.revenueChange)})`,
          `${lang === 'en' ? 'Orders' : 'บิล'}: ${s.orders.toLocaleString()} | AOV: ${fmtMoney(s.averageOrderValue)}`,
        ),
        sec('💰', lang === 'en' ? 'Today' : 'วันนี้',
          `${lang === 'en' ? 'Revenue' : 'ขาย'}: ${fmtMoney(s.revenueToday)}`,
          `${lang === 'en' ? 'Profit' : 'กำไร'}: ${fmtMoney(s.profitToday)}`,
        ),
      ],
      followUps: generateFollowUps('sales', data, lang),
      context: { lastTopic: 'sales', lastItems: [], lastItemType: null },
    }
  }

  // ── 10. Profit / finance ──
  if (q.includes('profit') || q.includes('finance') || q.includes('margin') || q.includes('expense') ||
      q.includes('กำไร') || q.includes('การเงิน') || q.includes('ขาดทุน') || q.includes('ค่าใช้จ่าย')) {
    const sections: SakuSection[] = [
      sec('💰', lang === 'en' ? 'P&L (7d)' : 'กำไรขาดทุน 7 วัน',
        `${lang === 'en' ? 'Revenue' : 'ยอดขาย'}: ${fmtMoney(money.revenue)}`,
        `${lang === 'en' ? 'COGS' : 'ต้นทุน'}: ${fmtMoney(money.cogs)} | ${lang === 'en' ? 'Gross' : 'ขั้นต้น'}: ${fmtMoney(money.grossProfit)} (${money.grossMargin.toFixed(1)}%)`,
        money.operatingExpenses > 0 ? `${lang === 'en' ? 'Expenses' : 'ค่าใช้จ่าย'}: ${fmtMoney(money.operatingExpenses)}` : '',
        `${lang === 'en' ? 'Net' : 'สุทธิ'}: ${fmtMoney(money.netProfit)} (${money.netMargin.toFixed(1)}%)`,
      ),
    ]

    if (money.netProfit >= 0) {
      sections.push(sec('✅', '', lang === 'en' ? 'Currently profitable' : 'ช่วงนี้มีกำไร'))
    } else {
      sections.push(sec('⚠️', '', lang === 'en' ? 'Currently at a loss — review expenses and pricing' : 'กำลังขาดทุน — ควรดูรายจ่ายและปรับราคา'))
    }

    if (money.dataQualityNotes.length > 0) {
      sections.push(sec('📝', lang === 'en' ? 'Note' : 'หมายเหตุ', ...money.dataQualityNotes))
    }

    return {
      sections,
      followUps: generateFollowUps('profit', data, lang),
      context: { lastTopic: 'profit', lastItems: [], lastItemType: null },
    }
  }

  // ── 11. Debtors / aging ──
  if (q.includes('ลูกหนี้') || q.includes('ค้างชำระ') || q.includes('เก็บเงิน') || q.includes('เชื่อ') ||
      q.includes('debtor') || q.includes('overdue') || q.includes('collect') || q.includes('credit') || q.includes('aging')) {
    if (money.totalOutstanding === 0 && money.totalOverdue === 0) {
      return {
        sections: [sec('✅', '', lang === 'en' ? 'No outstanding credit sales' : 'ไม่มีลูกหนี้ค้างชำระ')],
        followUps: generateFollowUps('aging', data, lang),
        context: { lastTopic: 'aging', lastItems: [], lastItemType: null },
      }
    }

    const items: ContextItem[] = []
    const sections: SakuSection[] = [
      sec('👤', lang === 'en' ? 'Credit & Aging' : 'ลูกหนี้',
        `${lang === 'en' ? 'Outstanding' : 'ค้างทั้งหมด'}: ${fmtMoney(money.totalOutstanding)}`,
        `${lang === 'en' ? 'Overdue' : 'เกินกำหนด'}: ${fmtMoney(money.totalOverdue)}`,
      ),
    ]

    if (money.agingBuckets.length > 0) {
      const bucketLines = money.agingBuckets
        .filter(b => b.label !== 'current')
        .map(b => {
          const lbl = b.label === '90_plus' ? '90+' : b.label.replace('_', '-')
          return `${lbl}${lang === 'en' ? 'd' : 'วัน'}: ${b.count} (${fmtMoney(b.amount)})`
        })
      if (bucketLines.length > 0) sections.push(sec('📊', lang === 'en' ? 'Aging' : 'อายุหนี้', ...bucketLines))
    }

    const overdueCustomers = money.agingCustomers.filter(c => c.daysOverdue > 0).slice(0, 3)
    if (overdueCustomers.length > 0) {
      const custLines = overdueCustomers.map((c, i) => {
        items.push({ index: i + 1, label: c.customerName, type: 'customer', data: { name: c.customerName, value: c.outstanding } })
        return `${i + 1}. ${c.customerName} — ${fmtMoney(c.outstanding)} (${c.daysOverdue}${lang === 'en' ? 'd' : 'วัน'})`
      })
      sections.push(sec('🔴', lang === 'en' ? 'Collect first' : 'เก็บก่อน', ...custLines))
    }

    const agingCtx: ConversationContext = { lastTopic: 'aging', lastItems: items, lastItemType: items.length > 0 ? 'customer' : null }
    return {
      sections,
      followUps: generateFollowUps('aging', data, lang, agingCtx),
      context: agingCtx,
    }
  }

  // ── 12. Purchasing ──
  if (q.includes('ซื้อ') || q.includes('สั่งซื้อ') || q.includes('ซัพพลาย') || q.includes('ผู้จัด') ||
      q.includes('ต้นทุน') || q.includes('ใบสั่งซื้อ') || q.includes('จัดซื้อ') ||
      q.includes('purchase') || q.includes('supplier') || q.includes('cost') || q.includes('buy') || q.includes('reorder')) {
    const items: ContextItem[] = []
    const sections: SakuSection[] = []
    const riskTh = purch.concentrationRisk === 'high' ? 'สูง' : purch.concentrationRisk === 'medium' ? 'ปานกลาง' : 'ต่ำ'

    sections.push(sec('🛒', lang === 'en' ? 'Purchasing' : 'จัดซื้อ',
      `${lang === 'en' ? 'Total' : 'ยอดสั่งซื้อ'}: ${fmtMoney(purch.totalPurchaseValue)} | ${lang === 'en' ? 'Suppliers' : 'ซัพพลายเออร์'}: ${purch.supplierMetrics.length}`,
      `${lang === 'en' ? 'Concentration' : 'ความเสี่ยงพึ่งพา'}: ${lang === 'en' ? purch.concentrationRisk : riskTh}`,
      purch.pendingPOCount > 0 ? `${lang === 'en' ? 'Pending POs' : 'PO ค้าง'}: ${purch.pendingPOCount} (${fmtMoney(purch.pendingPOValue)})` : '',
    ))

    if (purch.supplierMetrics.length > 0) {
      const supLines = purch.supplierMetrics.slice(0, 3).map((sm, i) => {
        items.push({ index: i + 1, label: sm.supplierName, type: 'product', data: { name: sm.supplierName, value: sm.totalSpend } })
        return `${i + 1}. ${sm.supplierName} — ${fmtMoney(sm.totalSpend)} (${Math.round(sm.sharePercent)}%)`
      })
      sections.push(sec('🏢', lang === 'en' ? 'Top suppliers' : 'ซัพพลายเออร์หลัก', ...supLines))
    }

    if (purch.costChanges.length > 0) {
      const costLines = purch.costChanges.slice(0, 3).map(cc => {
        const dir = cc.changePct > 0 ? '↑' : '↓'
        return `${dir} ${cc.productName}: ${Math.abs(Math.round(cc.changePct))}% (${cc.supplierName})`
      })
      sections.push(sec('💰', lang === 'en' ? 'Cost changes' : 'ต้นทุนเปลี่ยน', ...costLines))
    }

    if (purch.noSupplierProducts > 0) {
      sections.push(sec('⚠️', '', lang === 'en' ? `${purch.noSupplierProducts} products without supplier` : `${purch.noSupplierProducts} สินค้าไม่มีซัพพลายเออร์`))
    }

    const purchCtx: ConversationContext = { lastTopic: 'purchasing', lastItems: items, lastItemType: items.length > 0 ? 'product' : null }
    return {
      sections,
      followUps: generateFollowUps('purchasing', data, lang, purchCtx),
      context: purchCtx,
    }
  }

  // ── 13. Risks ──
  if (q.includes('risk') || q.includes('issue') || q.includes('problem') ||
      q.includes('ความเสี่ยง') || q.includes('ปัญหา')) {
    if (risks.length === 0) {
      return {
        sections: [sec('✅', '', lang === 'en' ? 'No issues — store is in good shape' : 'ไม่พบปัญหา ร้านอยู่ในสถานะดี')],
        followUps: generateFollowUps('risks', data, lang),
        context: { lastTopic: 'risks', lastItems: [], lastItemType: 'risk' },
      }
    }

    const items: ContextItem[] = []
    const riskLines = risks.slice(0, 5).map((r, i) => {
      items.push({ index: i + 1, label: r.title, type: 'risk', data: r })
      return `${i + 1}. ${r.title}`
    })
    const sections: SakuSection[] = [sec('⚠️', lang === 'en' ? `Issues (${risks.length})` : `ปัญหา (${risks.length})`, ...riskLines)]
    if (risks.length > 5) {
      sections[0].lines.push(lang === 'en' ? `... +${risks.length - 5} more` : `... อีก ${risks.length - 5} รายการ`)
    }

    const riskCtx: ConversationContext = { lastTopic: 'risks', lastItems: items, lastItemType: 'risk' }
    return {
      sections,
      followUps: generateFollowUps('risks', data, lang, riskCtx),
      context: riskCtx,
    }
  }

  // ── 14. Opportunities ──
  if (q.includes('opportunity') || q.includes('grow') || q.includes('improve') ||
      q.includes('โอกาส') || q.includes('เติบโต')) {
    if (opportunities.length === 0) {
      return {
        sections: [sec('💡', '', lang === 'en' ? 'No notable opportunities yet' : 'ยังไม่พบโอกาสเด่นตอนนี้')],
        followUps: generateFollowUps('opportunities', data, lang),
        context: { lastTopic: 'opportunities', lastItems: [], lastItemType: 'opportunity' },
      }
    }

    const items: ContextItem[] = []
    const oppLines = opportunities.map((o, i) => {
      items.push({ index: i + 1, label: o.title, type: 'opportunity', data: o })
      return `${i + 1}. ${o.title}${o.metric ? ` (${o.metric})` : ''}`
    })

    return {
      sections: [sec('💡', lang === 'en' ? `Opportunities (${opportunities.length})` : `โอกาส (${opportunities.length})`, ...oppLines)],
      followUps: generateFollowUps('opportunities', data, lang),
      context: { lastTopic: 'opportunities', lastItems: items, lastItemType: 'opportunity' },
    }
  }

  // ── Fallback ──
  return {
    sections: [sec('💬', lang === 'en' ? 'Ask me about' : 'ถามได้เรื่อง',
      lang === 'en' ? '📊 Store overview • 🎯 Priorities' : '📊 ภาพรวมร้าน • 🎯 ทำอะไรก่อน',
      lang === 'en' ? '📦 Stock • 💰 Profit • 🛒 Purchasing' : '📦 สต็อก • 💰 กำไร • 🛒 จัดซื้อ',
      lang === 'en' ? '👤 Debtors • ⚠️ Issues • 💡 Opportunities' : '👤 ลูกหนี้ • ⚠️ ปัญหา • 💡 โอกาส',
    )],
    followUps: generateFollowUps('', data, lang),
    context: emptyContext(),
  }
}

// ── Message Type ──

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sections?: SakuSection[]
  followUps?: CopilotFollowUp[]
  timestamp: Date
}

// ── Section Renderer ──

const SECTION_BG: Record<string, string> = {
  '⚠️': 'bg-amber-50 border-amber-200',
  '🔴': 'bg-rose-50 border-rose-200',
  '✅': 'bg-emerald-50 border-emerald-200',
  '💀': 'bg-slate-50 border-slate-300',
  '🚧': 'bg-amber-50 border-amber-200',
}

function SectionBlock({ section }: { section: SakuSection }) {
  const bg = SECTION_BG[section.icon] ?? 'bg-white border-slate-100'
  return (
    <div className={`rounded-lg border px-3 py-2 ${bg}`}>
      {section.title && (
        <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
          <span>{section.icon}</span>
          <span>{section.title}</span>
        </div>
      )}
      {!section.title && section.lines.length > 0 && (
        <div className="mb-0.5 text-[13px]">
          <span className="mr-1">{section.icon}</span>
        </div>
      )}
      {section.lines.map((line, i) => (
        <p key={i} className="text-[12px] leading-relaxed text-slate-600">
          {!section.title && i === 0 ? line : line}
        </p>
      ))}
    </div>
  )
}

// ── Component ──

export function ChatTab() {
  const { data, pendingChatMessage, clearPendingChat } = useCopilot()
  const [sessionLang, setSessionLang] = useState<Lang>('th')
  const [convCtx, setConvCtx] = useState<ConversationContext>(emptyContext)
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: '',
      sections: [sec('👋', '', 'สวัสดีครับ! ถามเกี่ยวกับร้านได้เลย')],
      followUps: [
        { label: '📊 ภาพรวมร้าน', query: 'ภาพรวมร้าน' },
        { label: '🎯 ทำอะไรก่อน', query: 'วันนี้ทำอะไรก่อน' },
        { label: '📦 สต็อก', query: 'สินค้าใกล้หมด' },
        { label: '💰 กำไร', query: 'กำไรเท่าไหร่' },
      ],
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const msgId = useRef(0)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback((text?: string) => {
    const q = text ?? input.trim()
    if (!q) return

    const lang = detectLang(q)
    setSessionLang(lang)

    const response = buildSakuResponse(q, data, lang, convCtx)
    setConvCtx(response.context)

    const userMsg: Message = {
      id: `msg-${++msgId.current}-u`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    }
    const assistantMsg: Message = {
      id: `msg-${++msgId.current}-a`,
      role: 'assistant',
      content: '',
      sections: response.sections,
      followUps: response.followUps,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
  }, [input, data, convCtx])

  useEffect(() => {
    if (pendingChatMessage) {
      send(pendingChatMessage)
      clearPendingChat()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatMessage])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Find the last assistant message with followUps
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
  const activeFollowUps = lastAssistant?.followUps ?? []

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map(m => (
          <div key={m.id}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                  <MessageSquare className="h-3 w-3" />
                </div>
              )}
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-600 px-3 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : m.sections && m.sections.length > 0 ? (
                <div className="max-w-[85%] space-y-1.5">
                  {m.sections.map((s, i) => (
                    <SectionBlock key={i} section={s} />
                  ))}
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 shadow-sm whitespace-pre-wrap">
                  {m.content}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Follow-up suggestion chips */}
      {activeFollowUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {activeFollowUps.map(fu => (
            <button
              key={fu.label}
              onClick={() => send(fu.query)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {fu.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-violet-300 focus-within:bg-white">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={sessionLang === 'en' ? "Ask about your store..." : "ถามเกี่ยวกับร้านของคุณ..."}
            className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
