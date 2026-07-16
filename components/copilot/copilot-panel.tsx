"use client"

import { X, FileText, Zap, Eye, MessageSquare } from "lucide-react"
import { useCopilot } from "./copilot-provider"
import { OverviewTab } from "./tabs/overview-tab"
import { InsightsTab } from "./tabs/insights-tab"
import { ActionsTab } from "./tabs/actions-tab"
import { ChatTab } from "./tabs/chat-tab"

const TABS = [
  { id: 'overview' as const, label: 'สรุปร้าน', Icon: FileText },
  { id: 'actions' as const, label: 'สิ่งที่ต้องทำ', Icon: Zap },
  { id: 'insights' as const, label: 'ข้อมูลเชิงลึก', Icon: Eye },
  { id: 'chat' as const, label: 'ถามผู้ช่วย', Icon: MessageSquare },
]

export function CopilotPanel() {
  const { isOpen, closePanel, activeTab, setActiveTab, data } = useCopilot()

  const criticalCount = data?.risks.filter(r => r.severity === 'critical').length ?? 0

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/25 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closePanel}
      />

      {/* Panel */}
      <aside
        className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[480px] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-violet-600 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-violet-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
            <span className="font-semibold text-white">ผู้ช่วยร้าน</span>
            {criticalCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {criticalCount} ด่วน
              </span>
            )}
          </div>
          <button
            onClick={closePanel}
            className="rounded-lg p-1.5 text-violet-200 hover:bg-violet-700 hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-slate-100">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            const riskCount = id === 'insights' ? (data?.risks.length ?? 0) : 0
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-violet-600 text-violet-600'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {riskCount > 0 && !isActive && (
                  <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'actions' && <ActionsTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'chat' && <ChatTab />}
        </div>
      </aside>
    </div>
  )
}
