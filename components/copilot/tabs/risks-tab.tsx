"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react"
import { useCopilot } from "../copilot-provider"
import type { RiskSeverity } from "@/types/copilot"

type Filter = 'all' | RiskSeverity

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
}

function SevIcon({ sev }: { sev: string }) {
  if (sev === 'critical' || sev === 'high') return <AlertTriangle className="h-4 w-4" />
  if (sev === 'medium') return <AlertCircle className="h-4 w-4" />
  return <Info className="h-4 w-4" />
}

export function RisksTab() {
  const { data, isLoading } = useCopilot()
  const [filter, setFilter] = useState<Filter>('all')
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'th'

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    )
  }

  const risks = data?.risks ?? []
  const filtered = filter === 'all' ? risks : risks.filter(r => r.severity === filter)

  const counts = {
    all: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    medium: risks.filter(r => r.severity === 'medium').length,
    low: risks.filter(r => r.severity === 'low').length,
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `ทั้งหมด (${counts.all})` },
    { id: 'critical', label: `วิกฤต (${counts.critical})` },
    { id: 'high', label: `สูง (${counts.high})` },
    { id: 'medium', label: `กลาง (${counts.medium})` },
  ]

  return (
    <div className="flex flex-col">
      {/* Filter tabs */}
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 px-4 py-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f.id
                ? 'bg-violet-100 text-violet-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 p-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-emerald-50 p-6 text-center">
            <p className="text-sm font-medium text-emerald-700">
              ไม่พบปัญหา{filter === 'all' ? '' : `ระดับ${SEV_LABELS[filter] ?? filter}`}
            </p>
            <p className="mt-1 text-[12px] text-emerald-600">ร้านอยู่ในสถานะดี ✓</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className={`rounded-xl border p-4 ${SEV_BADGE[r.severity]}`}>
              <div className="mb-2 flex items-start gap-2">
                <div className={`mt-0.5 shrink-0 ${SEV_ICON_COLOR[r.severity]}`}>
                  <SevIcon sev={r.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEV_BADGE[r.severity]}`}
                    >
                      {SEV_LABELS[r.severity]}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-60">
                      {CAT_LABELS[r.category]}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold leading-snug">{r.title}</p>
                </div>
              </div>
              <p className="mb-2 text-[12px] leading-relaxed opacity-80">{r.description}</p>
              <div className="rounded-lg bg-white/60 p-2 text-[11px]">
                <span className="font-medium">ผลกระทบ: </span>
                {r.impact}
              </div>
              {r.actionRoute && (
                <button
                  onClick={() => router.push(`/${locale}${r.actionRoute}`)}
                  className="mt-3 flex items-center gap-1 text-[12px] font-semibold hover:underline"
                >
                  {r.action} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}
