import type { CopilotOverview } from "@/types/copilot";
import type { CopilotFollowUp } from "@/types/copilot";
import type { CopilotAction } from "@/types/copilot";
import type { CopilotRisk } from "@/types/copilot";
import type { CopilotOpportunity } from "@/types/copilot";
import type { CopilotPriority } from "@/types/copilot";
import type { listCustomers } from "@/services/customers";
import type { LucideIcon } from "lucide-react";
import type { OpportunityCategory } from "@/types/copilot";
import type { RiskSeverity } from "@/types/copilot";

export type CopilotProviderTab = 'overview' | 'insights' | 'actions' | 'chat'

export interface CopilotProviderCopilotContextValue {
  isOpen: boolean
  openPanel: () => void
  closePanel: () => void
  activeTab: CopilotProviderTab
  setActiveTab: (tab: CopilotProviderTab) => void
  data: CopilotOverview | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
  pendingChatMessage: string | null
  sendChatMessage: (msg: string) => void
  clearPendingChat: () => void
}

export type ChatTabLang = 'th' | 'en'

export interface ChatTabSakuSection {
  icon: string
  title: string
  lines: string[]
}

export interface ChatTabSakuResponse {
  sections: ChatTabSakuSection[]
  followUps: CopilotFollowUp[]
  context: ChatTabConversationContext
}

export interface ChatTabContextItem {
  index: number
  label: string
  type: 'action' | 'risk' | 'opportunity' | 'product' | 'customer'
  data: CopilotAction | CopilotRisk | CopilotOpportunity | CopilotPriority | { name: string; value: number }
}

export interface ChatTabConversationContext {
  lastTopic: string | null
  lastItems: ChatTabContextItem[]
  lastItemType: string | null
}

export type ChatTabCustomerRow = Awaited<ReturnType<typeof listCustomers>>["data"][number]

export interface ChatTabMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sections?: ChatTabSakuSection[]
  followUps?: CopilotFollowUp[]
  timestamp: Date
}

export interface ChatTabStarterCard {
  Icon: LucideIcon
  label: string
  query: string
}

export interface ChatTabStarterGroup {
  Icon: LucideIcon
  title: string
  cards: ChatTabStarterCard[]
}

export type OpportunitiesTabFilter = 'all' | OpportunityCategory

export type RisksTabFilter = 'all' | RiskSeverity
