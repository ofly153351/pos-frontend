// Pure mapping from the backend per-location stock list (GET
// /stores/:storeID/locations/:locationID/products) into the candidate rows the
// stock-count wizard shows, plus the optional category narrowing.
//
// The endpoint returns products with system stock > 0 AT the chosen location
// (quantity comes from the same source the count uses as the authoritative
// system quantity). This module is the single source of truth shared by
// stock-count-manager.tsx and scripts/test-count-candidates.ts — no JSX, so a
// bare `bun` process can import it.
//
// Rationale (user-directed 2026-09-04): the count sheet must be scoped by the
// BACKEND per-location stock list, never by client-side filtering over the whole
// catalog — the catalog endpoint caps its limit (~200) and warehouse/zone
// matching against free-text storage_location strings is unreliable.
import type { LocationProduct } from "@/services/locations";

export type CountCandidate = {
  /** product id (product_id) */
  id: string;
  name: string;
  sku: string;
  barcode: string;
  /** System on-hand AT the count location (the endpoint only returns > 0 rows). */
  quantity: number;
  minStock: number;
  /** Valuation basis for variance severity: cost_price ?? base_price. */
  costBasis: number;
  /** Product master category (product_type_id) — used by the category filters. */
  categoryId: string;
  /** Display label of the single count location; every row is assigned to it. */
  locationLabel: string;
};

export type CountCandidatesOptions = {
  /** When set, only products of this category are kept ("" / null = all). */
  categoryId?: string | null;
  /** Label of the location being counted — stamped on every candidate row. */
  locationLabel: string;
};

export function buildCountCandidates(rows: LocationProduct[], options: CountCandidatesOptions): CountCandidate[] {
  const out: CountCandidate[] = [];
  for (const row of rows) {
    // Backend contract says quantity > 0; keep the defensive drop so a future
    // caller that passes 0 rows cannot leak "count nothing here" items.
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) continue;
    if (options.categoryId && row.category_id !== options.categoryId) continue;
    out.push({
      id: row.product_id,
      name: row.product_name,
      sku: row.sku ?? "",
      barcode: row.barcode ?? "",
      quantity: row.quantity,
      minStock: row.min_stock ?? 0,
      costBasis: row.cost_price ?? row.base_price ?? 0,
      categoryId: row.category_id ?? "",
      locationLabel: options.locationLabel,
    });
  }
  return out;
}
