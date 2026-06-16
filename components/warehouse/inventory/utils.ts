import type { Location } from "@/services/locations";
import type {
  ProductStockSummary,
  WarehouseStockStatus,
} from "@/types/warehouse-inventory";
import type {
  EnrichedStockLocation,
  ProductLocationBreakdown,
} from "./types";

const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  currency: "THB",
  maximumFractionDigits: 0,
  style: "currency",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value ?? 0);
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value ?? 0);
}

// Tone classes for a status chip — text + color, never color alone.
export function statusChipClass(status: WarehouseStockStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    case "low_stock":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
    case "out_of_stock":
      return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
  }
}

// Bar tone for the in-warehouse total cell.
export function totalBarClass(status: WarehouseStockStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-500";
    case "low_stock":
      return "bg-amber-500";
    case "out_of_stock":
      return "bg-rose-400";
  }
}

// Join a product's per-location stock with location metadata and scope it to one
// warehouse. Inactive locations are KEPT in the totals (they still hold stock) but
// are flagged so the UI can disable them as operation destinations.
export function buildProductLocationBreakdown(
  summary: ProductStockSummary | undefined,
  locations: Location[],
  warehouseId: string,
): ProductLocationBreakdown {
  const empty: ProductLocationBreakdown = {
    sale: [],
    storage: [],
    readyStock: 0,
    storageStock: 0,
    totalStock: 0,
  };
  if (!summary || !warehouseId) return empty;

  const locById = new Map(locations.map((l) => [l.id, l]));
  const sale: EnrichedStockLocation[] = [];
  const storage: EnrichedStockLocation[] = [];

  for (const row of summary.locations ?? []) {
    const meta = locById.get(row.location_id);
    // Scope strictly to the selected warehouse. A stock row whose location is in
    // another warehouse (or unknown) is excluded from this warehouse's view.
    if (!meta || meta.warehouse_id !== warehouseId) continue;

    const entry: EnrichedStockLocation = {
      location_id: row.location_id,
      name: meta.name || row.location_name,
      code: meta.code,
      warehouse_name: meta.warehouse_name ?? row.warehouse_name,
      zone_name: meta.zone_name,
      floor_name: meta.floor_name,
      is_sale_point: Boolean(meta.is_sale_point),
      is_active: Boolean(meta.is_active),
      quantity: row.quantity,
    };
    if (entry.is_sale_point) sale.push(entry);
    else storage.push(entry);
  }

  const readyStock = sale.reduce((sum, l) => sum + l.quantity, 0);
  const storageStock = storage.reduce((sum, l) => sum + l.quantity, 0);
  return {
    sale,
    storage,
    readyStock,
    storageStock,
    totalStock: readyStock + storageStock,
  };
}

// Compact path label: "Zone · Floor" (whichever parts exist).
export function locationPath(loc: EnrichedStockLocation): string {
  return [loc.zone_name, loc.floor_name].filter(Boolean).join(" · ");
}
