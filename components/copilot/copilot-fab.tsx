"use client"

import { Sparkles } from "lucide-react"
import { useCopilot } from "./copilot-provider"

export function CopilotFAB() {
  const { openPanel, data } = useCopilot()

  const urgentCount =
    data?.risks.filter(r => r.severity === 'critical' || r.severity === 'high').length ?? 0

  return (
    <button
      onClick={openPanel}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      aria-label="Open AI Copilot"
    >
      <Sparkles className="h-6 w-6" />
      {urgentCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
          {urgentCount > 9 ? '9+' : urgentCount}
        </span>
      )}
    </button>
  )
}
