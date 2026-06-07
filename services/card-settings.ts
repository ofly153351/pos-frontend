import { authorizedApiRequest } from "@/services/api";
import type { CardSettings } from "@/lib/card-settings";

// Per-user card settings persisted server-side (scoped to the authenticated user via JWT).
export function fetchCardSettings() {
  return authorizedApiRequest<CardSettings>("/api/me/card-settings");
}

export function updateCardSettings(settings: CardSettings) {
  return authorizedApiRequest<CardSettings>("/api/me/card-settings", {
    body: settings,
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}
