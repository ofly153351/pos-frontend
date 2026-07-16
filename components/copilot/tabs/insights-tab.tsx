"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useCopilot } from "../copilot-provider"

const SEV_LABELS: Record<string, string> = {
  critical: 'วิกฤต',
  high: 'สูง',
  medium: 'ปานกลาง',
  low: 'ต่ำ',
}

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const SEV_ICON_COLOR: Record<string, string> = {
  critical: 'text-rose-600',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-slate-400',
}

const CAT_LABELS: Record<string, string> = {
  inventory: 'สินค้า',
  finance: 'การเงิน',
  operations: 'ดำเนินงาน',
  customer: 'ลูกค้า',
  sales: 'ยอดขาย',
  purchasing: 'จัดซื้อ',
}

function SevIcon({ sev }: { sev: string }) {
  if (sev === 'critical' || sev === 'high') return <AlertTriangle className="h-4 w-4" />
  if (sev === 'medium') return <AlertCircle className="h-4 w-4" />
  return <Info className="h-4 w-4" />
}

function CatIcon({ category }: { category: string }) {
  switch (category) {
    case 'sales': return <TrendingUp className="h-4 w-4 text-emerald-500" />
    case 'inventory': return <Package className="h-4 w-4 text-violet-500" />
    case 'finance': return <DollarSign className="h-4 w-4 text-amber-500" />
    case 'customer': return <Users className="h-4 w-4 text-indigo-500" />
    case 'purchasing': return <Package className="h-4 w-4 text-orange-500" />
    default: return <Lightbulb className="h-4 w-4 text-slate-400" />
  }
}

export function InsightsTab() {
  const { data, isLoading } = useCopilot()
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'th'
  const [oppsExpanded, setOppsExpanded] = useState(true)

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    )
  }

  const risks = data?.risks ?? []
  const opps = data?.opportunities ?? []
  const hasRisks = risks.length > 0
  const hasOpps = opps.length > 0

  if (!hasRisks && !hasOpps) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-full bg-emerald-100 p-4">
          <Lightbulb className="h-8 w-8 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-700">ไม่พบปัญหาหรือโอกาส</p>
        <p className="text-[12px] text-emerald-600">ร้านอยู่ในสถานะดี ✓</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {/* ── ปัญหา (Risks) ──────────────────────────────────────────── */}
      {hasRisks && (
        <div className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            ปัญหาที่พบ ({risks.length})
          </p>
          <div className="space-y-2">
            {risks.map(r => (
              <div key={r.id} className={`rounded-xl border p-3 ${SEV_BADGE[r.severity]}`}>
                <div className="mb-1.5 flex items-start gap-2">
                  <div className={`mt-0.5 shrink-0 ${SEV_ICON_COLOR[r.severity]}`}>
                    <SevIcon sev={r.severity} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SEV_BADGE[r.severity]}`}>
                        {SEV_LABELS[r.severity]}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {CAT_LABELS[r.category]}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold leading-snug">{r.title}</p>
                  </div>
                </div>
                <p className="mb-1.5 text-[12px] leading-relaxed opacity-80">{r.description}</p>
                <div className="rounded-lg bg-white/60 p-2 text-[11px]">
                  <span className="font-medium">ผลกระทบ: </span>{r.impact}
                </div>
                {r.actionRoute && (
                  <button
                    onClick={() => router.push(`/${locale}${r.actionRoute}`)}
                    className="mt-2 flex items-center gap-1 text-[12px] font-semibold hover:underline"
                  >
                    {r.action} <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── โอกาส (Opportunities) ───────────────────────────────────── */}
      {hasOpps && (
        <div className="p-4">
          <button
            onClick={() => setOppsExpanded(v => !v)}
            className="mb-3 flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          >
            <Lightbulb className="h-3 w-3 text-emerald-500" />
            โอกาส ({opps.length})
            {oppsExpanded
              ? <ChevronDown className="ml-auto h-3.5 w-3.5" />
              : <ChevronRight className="ml-auto h-3.5 w-3.5" />
            }
          </button>
          {oppsExpanded && (
            <div className="space-y-2">
              {opps.map(o => (
                <div key={o.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="mb-1.5 flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      <CatIcon category={o.category} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          {CAT_LABELS[o.category]}
                        </span>
                        {o.metric && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {o.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800">{o.title}</p>
                    </div>
                  </div>
                  <p className="mb-1 text-[12px] text-slate-600">{o.description}</p>
                  <p className="mb-2 text-[12px] italic text-slate-400">{o.recommendation}</p>
                  {o.actionRoute && (
                    <button
                      onClick={() => router.push(`/${locale}${o.actionRoute}`)}
                      className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700"
                    >
                      ดำเนินการ <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="h-4" />
    </div>
  )
}
