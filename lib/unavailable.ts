// Copy for features that are not connected to the backend yet (B27).
import { getApiErrorMessages } from "@/lib/api-error";

type Key = "unavailableTitle" | "gatewayUnavailableBody" | "comingSoonShort";
const EN: Record<Key, string> = {
  unavailableTitle: "Not available yet",
  gatewayUnavailableBody: "The payment gateway is not connected yet, so these settings cannot be saved.",
  comingSoonShort: "Coming soon",
};

export function unavailableText(key: Key): string {
  const u = (getApiErrorMessages() as Record<string, unknown>).unavailable as Partial<Record<Key, string>> | undefined;
  return u?.[key] ?? EN[key];
}
