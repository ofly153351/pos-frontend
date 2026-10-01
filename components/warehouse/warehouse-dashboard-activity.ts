export type WarehouseTimelineActivityType = "IN" | "OUT" | "SALE" | "TRANSFER" | "ADJUST" | "RETURN";

const supportedActivityTypes = new Set<string>([
  "IN",
  "OUT",
  "SALE",
  "TRANSFER",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUST",
  "RETURN",
]);

export function normalizeWarehouseTimelineActivityType(type: string): WarehouseTimelineActivityType | null {
  if (!supportedActivityTypes.has(type)) return null;
  if (type === "TRANSFER_IN" || type === "TRANSFER_OUT") return "TRANSFER";
  return type as WarehouseTimelineActivityType;
}