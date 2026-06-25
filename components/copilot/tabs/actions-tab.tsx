"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowRight, Zap } from "lucide-react"
import { useCopilot } from "../copilot-provider"

const SEV_COLORS: Record<string, string> = {
  urgent: 'text-rose-500',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-slate-400',
}

const SEV_BADGE: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const SEV_LABELS: Record<string, string> = {
  urgent: 'ด่วนมาก',
  high: 'ด่วน',
  medium: 'ควรทำ',
  low: 'ปกติ',
}

export function ActionsTab() {
  const { data, isLoading } = useCopilot()
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

  const actions = data?.actions ?? []

  return (
    <div className="space-y-2 p-4">
      {actions.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 p-6 text-center">
          <p className="text-sm font-medium text-emerald-700">ทำครบแล้ว!</p>
          <p className="mt-1 text-[12px] text-emerald-600">ไม่มีสิ่งที่ต้องทำตอนนี้ ✓</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {actions.length} สิ่งที่ต้องทำ
          </p>
          {actions.map((a, i) => (
            <button
              key={a.id}
              onClick={() => router.push(`/${locale}${a.route}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                {i + 1}
              </div>
              <Zap className={`h-4 w-4 shrink-0 ${SEV_COLORS[a.severity]}`} />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEV_BADGE[a.severity]}`}
                  >
                    {SEV_LABELS[a.severity]}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-slate-800">{a.title}</p>
                <p className="text-[11px] text-slate-400">{a.description}</p>
                {a.impactValue && (
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                    ผลกระทบ: {a.impactValue}
                  </p>
                )}
              </div>
              {a.badge !== undefined && (
                <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {a.badge}
                </span>
              )}
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </>
      )}
      <div className="h-4" />
    </div>
  )
}
