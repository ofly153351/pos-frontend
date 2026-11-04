// Below-cost check (B16). Owner policy: selling below cost is allowed after a
// localized warning and confirmation; the backend never blocks it.

function toNumber(value: unknown): number {
  if (value === "" || value === null || value === undefined) return Number.NaN;
  return Number(value);
}

/**
 * Returns the lowest price the product will actually sell at when that price is
 * below a positive cost, otherwise null. A special price applies when it is set
 * and positive; base price applies otherwise.
 */
export function belowCostPrice(basePrice: unknown, specialPrice: unknown, costPrice: unknown): number | null {
  const cost = toNumber(costPrice);
  if (!Number.isFinite(cost) || cost <= 0) return null;
  const candidates = [toNumber(basePrice), toNumber(specialPrice)].filter((n) => Number.isFinite(n) && n > 0);
  if (candidates.length === 0) return null;
  const lowest = Math.min(...candidates);
  return lowest < cost ? lowest : null;
}
