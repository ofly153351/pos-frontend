"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { getCopilotOverview } from "@/services/copilot"
import type { CopilotOverview } from "@/types/copilot"

type Tab = 'overview' | 'insights' | 'actions' | 'chat'

interface CopilotContextValue {
  isOpen: boolean
  openPanel: () => void
  closePanel: () => void
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  data: CopilotOverview | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
  pendingChatMessage: string | null
  sendChatMessage: (msg: string) => void
  clearPendingChat: () => void
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null)

  const { data: raw, isLoading, error, refetch } = useQuery({
    queryKey: ['copilot-overview'],
    queryFn: getCopilotOverview,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
    retry: 1,
  })
  const data: CopilotOverview | undefined = raw?.data

  // ESC key closes panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Lock body scroll when panel open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function openPanel() { setIsOpen(true) }
  function closePanel() { setIsOpen(false) }
  function sendChatMessage(msg: string) {
    setPendingChatMessage(msg)
    setActiveTab('chat')
  }
  function clearPendingChat() { setPendingChatMessage(null) }

  return (
    <CopilotContext.Provider value={{
      isOpen, openPanel, closePanel,
      activeTab, setActiveTab,
      data, isLoading, error: error as Error | null, refetch,
      pendingChatMessage, sendChatMessage, clearPendingChat,
    }}>
      {children}
    </CopilotContext.Provider>
  )
}

export function useCopilot() {
  const ctx = useContext(CopilotContext)
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider")
  return ctx
}
