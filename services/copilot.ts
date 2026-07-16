import { getCurrentStoreId } from "@/lib/store-storage"
import { authorizedApiRequest } from "@/services/api"
import type { CopilotOverview } from "@/types/copilot"

export function getCopilotOverview() {
  const storeId = getCurrentStoreId()
  if (!storeId) throw new Error("Missing current store")
  return authorizedApiRequest<CopilotOverview>(`/api/stores/${storeId}/copilot`)
}
