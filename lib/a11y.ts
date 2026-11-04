// Localized accessible names for common icon-only controls (B31). Texts live in
// the apiErrors.a11y section of th.json/en.json (registered per locale).
import { getApiErrorMessages } from "@/lib/api-error";

export type A11yKey = "previousPage" | "nextPage" | "close" | "listView" | "gridView" | "filter" | "refresh" | "moreActions";

const EN: Record<A11yKey, string> = {
  previousPage: "Previous page", nextPage: "Next page", close: "Close", listView: "List view",
  gridView: "Grid view", filter: "More filters", refresh: "Refresh", moreActions: "More actions",
};

export function a11yLabel(key: A11yKey): string {
  const a = (getApiErrorMessages() as Record<string, unknown>).a11y as Partial<Record<A11yKey, string>> | undefined;
  return a?.[key] ?? EN[key];
}
