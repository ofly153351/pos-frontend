// Shared shell texts outside a page dictionary (B25): drawer, copilot, cart,
// error states. Translated via apiErrors.ui in th.json/en.json.
import { getApiErrorMessages } from "@/lib/api-error";

export type UiKey = "mainMenu" | "closeMenu" | "copilotTitle" | "copilotOverview" | "copilotActions" | "copilotInsights" | "copilotChat" | "loadFailed" | "retry" | "cartEmpty" | "clear";

const EN: Record<UiKey, string> = {
  mainMenu: "Main menu", closeMenu: "Close menu", copilotTitle: "Store assistant", copilotOverview: "Overview",
  copilotActions: "To do", copilotInsights: "Insights", copilotChat: "Ask the assistant", loadFailed: "Failed to load data",
  retry: "Try again", cartEmpty: "No items yet", clear: "Clear",
};

export function uiText(key: UiKey): string {
  const ui = (getApiErrorMessages() as Record<string, unknown>).ui as Partial<Record<UiKey, string>> | undefined;
  return ui?.[key] ?? EN[key];
}
