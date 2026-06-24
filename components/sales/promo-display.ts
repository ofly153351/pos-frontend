// POS sales-screen promotion display index.
//
// Cross-references the active promotion list against the product catalogue to drive
// three POS affordances WITHOUT touching the checkout discount math (that stays in
// sales-manager's promoDiscountAmount):
//   • the promotion tab + per-promo sub-chips (filter products by one campaign)
//   • the per-card discount badge ("ลด 10%", "ซื้อ 3 แถม 1", …)
//   • a store-wide info strip (bill-level / whole-store promos shown, not badged)
//
// Design rule — product-targeting vs store-wide:
//   Only campaigns scoped to specific category / brand / SKUs mark specific products,
//   so only those become chips + badges. Store-scoped promos (e.g. spend-x-discount,
//   coupon) match every product; badging all of them is noise, so they surface once in
//   the info strip instead. Badges are further limited to LINE_LEVEL types — only those
//   cut a single item's price, so only those carry a meaningful per-item label.

import {
  LINE_LEVEL_TYPES,
  isWithinSchedule,
  matchesScope,
} from "@/components/promotions/promotion-engine";
import type { Campaign } from "@/components/promotions/promotion-types";
import type { Product } from "@/types/product";

export type PromoChip = {
  id: string; // campaign id
  name: string; // campaign.name (user-authored, already localized)
  count: number; // number of in-catalogue products matched
};

export type PromoDisplayIndex = {
  /** Sub-chips: one per product-targeting live campaign (scopeType !== "store"). */
  chips: PromoChip[];
  /** Whole-store / bill-level live campaigns — shown as an info strip, not badged. */
  storeWide: Campaign[];
  /** Union of products covered by any chip campaign — drives the tab count + "all" filter. */
  coveredProductIds: Set<string>;
  /** productId → set of chip campaign ids that cover it (per-chip filtering). */
  promoIdsByProduct: Map<string, Set<string>>;
  /** productId → short badge label (line-level, product-scoped, best by priority). */
  badgeByProduct: Map<string, string>;
};

const EMPTY_INDEX: PromoDisplayIndex = {
  chips: [],
  storeWide: [],
  coveredProductIds: new Set(),
  promoIdsByProduct: new Map(),
  badgeByProduct: new Map(),
};

function productScope(p: Product) {
  return {
    id: p.id,
    sku: p.sku,
    category: p.product_type_name ?? p.product_type?.name,
    brand: p.brand_name,
  };
}

export function buildPromoDisplayIndex(
  campaigns: Campaign[] | undefined,
  products: Product[],
  now: Date,
  badgeLabel: (c: Campaign) => string,
): PromoDisplayIndex {
  const live = (campaigns ?? []).filter(
    (c) => c.status === "active" && isWithinSchedule(c, now).ok,
  );
  if (live.length === 0) return EMPTY_INDEX;

  // Store-scoped promos apply to everything → info strip, not chips/badges.
  const storeWide = live.filter((c) => c.scopeType === "store");
  const targeted = live.filter((c) => c.scopeType !== "store");
  if (targeted.length === 0) {
    return { ...EMPTY_INDEX, storeWide };
  }

  const coveredProductIds = new Set<string>();
  const promoIdsByProduct = new Map<string, Set<string>>();
  const badgeByProduct = new Map<string, string>();
  const countById = new Map<string, number>();

  for (const product of products) {
    const scope = productScope(product);
    const matches = targeted.filter((c) => matchesScope(c, scope));
    if (matches.length === 0) continue;

    coveredProductIds.add(product.id);
    const ids = new Set<string>();
    for (const c of matches) {
      ids.add(c.id);
      countById.set(c.id, (countById.get(c.id) ?? 0) + 1);
    }
    promoIdsByProduct.set(product.id, ids);

    // Badge = best LINE_LEVEL match (highest priority wins; ties → first).
    const lineMatches = matches
      .filter((c) => LINE_LEVEL_TYPES.includes(c.type))
      .sort((a, b) => b.priority - a.priority);
    if (lineMatches.length > 0) {
      badgeByProduct.set(product.id, badgeLabel(lineMatches[0]));
    }
  }

  // Chips preserve the campaign's own priority order (highest first), then name.
  const chips: PromoChip[] = targeted
    .filter((c) => (countById.get(c.id) ?? 0) > 0)
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, name: c.name, count: countById.get(c.id) ?? 0 }));

  return { chips, storeWide, coveredProductIds, promoIdsByProduct, badgeByProduct };
}
