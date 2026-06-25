"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TrendingUp, Package, DollarSign, Users, ArrowRight, Lightbulb } from "lucide-react"
import { useCopilot } from "../copilot-provider"
import type { OpportunityCategory } from "@/types/copilot"

type Filter = 'all' | OpportunityCategory

const CAT_LABELS: Record<string, string> = {
  sales: 'ยอดขาย',
  inventory: 'สินค้า',
  finance: 'การเงิน',
  customer: 'ลูกค้า',
}

function CatIcon({ category }: { category: string }) {
  switch (category) {
    case 'sales':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />
    case 'inventory':
      return <Package className="h-4 w-4 text-violet-500" />
    case 'finance':
      return <DollarSign className="h-4 w-4 text-amber-500" />
    case 'customer':
      return <Users className="h-4 w-4 text-indigo-500" />
    default:
      return <Lightbulb className="h-4 w-4 text-slate-400" />
  }
}

export function OpportunitiesTab() {
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

  const opps = data?.opportunities ?? []
  const filtered = filter === 'all' ? opps : opps.filter(o => o.category === filter)

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `ทั้งหมด (${opps.length})` },
    { id: 'sales', label: 'ยอดขาย' },
    { id: 'inventory', label: 'สินค้า' },
    { id: 'finance', label: 'การเงิน' },
  ]

  return (
    <div className="flex flex-col">
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
          <div className="rounded-xl bg-slate-50 p-6 text-center">
            <Lightbulb className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">ยังไม่พบโอกาส</p>
            <p className="mt-1 text-[12px] text-slate-400">จะมีข้อมูลเพิ่มเมื่อร้านมียอดขาย</p>
          </div>
        ) : (
          filtered.map(o => (
            <div
              key={o.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <CatIcon category={o.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
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
              <p className="mb-2 text-[12px] text-slate-600">{o.description}</p>
              <p className="mb-3 text-[12px] italic text-slate-400">{o.recommendation}</p>
              {o.actionRoute && (
                <button
                  onClick={() => router.push(`/${locale}${o.actionRoute}`)}
                  className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-violet-700"
                >
                  ดำเนินการ <ArrowRight className="h-3 w-3" />
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
