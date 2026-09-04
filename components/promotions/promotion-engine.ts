// Pure promotion evaluation engine.
// Used by the wizard preview step and (future) checkout integration.

import type { Campaign, PromotionType } from "./promotion-types";

export interface EvalContext {
  unitPrice: number;
  quantity: number;
  customerLevel?: number;       // 1-5 member level
  customerType?: "retail" | "wholesale"; // customer classification
  cylinderType?: "7kg" | "15kg" | "48kg"; // for cylinder_exchange promos
  couponCode?: string;          // entered code at checkout; undefined = preview (gate skipped)
  now?: Date;
}

export interface EvalResult {
  applies: boolean;
  reason?: string;
  discountTotal: number;
  finalTotal: number;
  steps: { label: string; value: string }[];
}

// ── Checkout classification & scope ──────────────────────────────────────────

// Promotion types that discount a single cart line vs. the whole (scoped) bill.
// cylinder_exchange is intentionally excluded from checkout application in this phase.
export const LINE_LEVEL_TYPES: PromotionType[] = [
  "percentage",
  "fixed_amount",
  "fixed_price",
  "buy_x_get_y",
  "member_price",
  "happy_hour",
];

export const BILL_LEVEL_TYPES: PromotionType[] = [
  "coupon",
  "spend_x_discount",
  "bundle",
  "spend_x_gift",
];

// Scope gate — fail-closed: a category/brand/product-scoped promo only matches a
// line whose identity is listed in scopeIds (case-insensitive). Store scope matches all.
export function matchesScope(
  c: Campaign,
  item: { id?: string | null; sku?: string | null; category?: string | null; brand?: string | null },
): boolean {
  if (c.scopeType === "store") return true;
  const ids = c.scopeIds.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0) return false;
  if (c.scopeType === "products") {
    // scopeIds may hold product UUIDs (current ScopePicker behaviour) or SKUs (intended).
    // Check both so existing promos (UUID-stored) and future ones (SKU-stored) both match.
    const sku = item.sku?.trim().toLowerCase();
    const id = item.id?.trim().toLowerCase();
    return !!(sku && ids.includes(sku)) || !!(id && ids.includes(id));
  }
  const value =
    c.scopeType === "category"
      ? item.category
      : c.scopeType === "brand"
        ? item.brand
        : undefined;
  return !!value && ids.includes(value.trim().toLowerCase());
}

// ── Schedule helpers ─────────────────────────────────────────────────────────

export function isWithinSchedule(c: Campaign, now: Date): { ok: boolean; reason?: string } {
  if (c.startDate) {
    const start = new Date(c.startDate);
    if (now < start) return { ok: false, reason: "not_started" };
  }
  if (c.endDate) {
    const end = new Date(c.endDate);
    if (now > end) return { ok: false, reason: "expired" };
  }
  const days = c.daysOfWeek ?? [];
  if (days.length > 0 && !days.includes(now.getDay())) {
    return { ok: false, reason: "wrong_day" };
  }
  if (c.happyHourStart && c.happyHourEnd) {
    const [sh, sm] = c.happyHourStart.split(":").map(Number);
    const [eh, em] = c.happyHourEnd.split(":").map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (cur < start || cur > end) return { ok: false, reason: "outside_happy_hour" };
  }
  return { ok: true };
}

function checkConditions(
  c: Campaign,
  ctx: EvalContext,
): { ok: boolean; reason?: string } {
  const total = ctx.unitPrice * ctx.quantity;
  if (c.minAmount && total < c.minAmount) return { ok: false, reason: "min_amount" };
  if (c.minQty && ctx.quantity < c.minQty) return { ok: false, reason: "min_qty" };
  if (c.memberOnly && (!ctx.customerLevel || ctx.customerLevel < 1))
    return { ok: false, reason: "member_only" };
  if (c.vipOnly && (!ctx.customerLevel || ctx.customerLevel < 5))
    return { ok: false, reason: "vip_only" };
  if (c.customerTypes && c.customerTypes.length > 0) {
    if (!ctx.customerType || !(c.customerTypes as string[]).includes(ctx.customerType))
      return { ok: false, reason: "wrong_customer_type" };
  }
  return { ok: true };
}

// ── Per-type discount calculator ─────────────────────────────────────────────

function calcDiscount(c: Campaign, ctx: EvalContext): number {
  const { unitPrice, quantity } = ctx;
  const subtotal = unitPrice * quantity;

  switch (c.type as PromotionType) {
    case "percentage":
      return subtotal * ((c.percentOff ?? 0) / 100);

    case "fixed_amount":
      return Math.min(c.amountOff ?? 0, subtotal);

    case "fixed_price":
      if (c.fixedPrice == null) return 0;
      return Math.max(0, subtotal - c.fixedPrice * quantity);

    case "buy_x_get_y": {
      const buy = c.buyQty ?? 1;
      const get = c.getQty ?? 1;
      const sets = Math.floor(quantity / (buy + get));
      return sets * get * unitPrice;
    }

    case "spend_x_discount":
      if (subtotal >= (c.minSpend ?? 0)) return Math.min(c.discountAmount ?? 0, subtotal);
      return 0;

    case "spend_x_gift":
      // Gift has no monetary discount on the cart total itself
      return 0;

    case "bundle":
      if (c.bundlePrice == null) return 0;
      return Math.max(0, subtotal - c.bundlePrice);

    case "member_price":
      if (c.memberPrice == null) return 0;
      return Math.max(0, subtotal - c.memberPrice * quantity);

    case "coupon":
      // For preview purposes treat coupon as a flat amount
      return Math.min(c.amountOff ?? 0, subtotal);

    case "happy_hour":
      return subtotal * ((c.percentOff ?? 0) / 100);

    case "cylinder_exchange": {
      // Check if the cylinder size being exchanged is in the allowed list
      if (c.cylinderTypes && c.cylinderTypes.length > 0 && ctx.cylinderType) {
        if (!(c.cylinderTypes as string[]).includes(ctx.cylinderType)) return 0;
      }
      return Math.min(c.exchangeDiscount ?? 0, subtotal);
    }

    default:
      return 0;
  }
}

// ── Public entry point ───────────────────────────────────────────────────────

export function evaluatePromotion(c: Campaign, ctx: EvalContext): EvalResult {
  const now = ctx.now ?? new Date();
  const subtotal = ctx.unitPrice * ctx.quantity;
  const steps: { label: string; value: string }[] = [];

  // 1 — draft/paused
  if (c.status === "draft") {
    return { applies: false, reason: "draft", discountTotal: 0, finalTotal: subtotal, steps };
  }
  if (c.status === "paused") {
    return { applies: false, reason: "paused", discountTotal: 0, finalTotal: subtotal, steps };
  }

  // 2 — schedule
  const schedCheck = isWithinSchedule(c, now);
  if (!schedCheck.ok) {
    return {
      applies: false,
      reason: schedCheck.reason,
      discountTotal: 0,
      finalTotal: subtotal,
      steps,
    };
  }

  // 3 — conditions
  const condCheck = checkConditions(c, ctx);
  if (!condCheck.ok) {
    return {
      applies: false,
      reason: condCheck.reason,
      discountTotal: 0,
      finalTotal: subtotal,
      steps,
    };
  }

  // 3.5 — coupon code gate. Only enforced when a code context is supplied (checkout);
  // the wizard simulator passes no couponCode, so previews still show the value.
  if (c.type === "coupon" && ctx.couponCode !== undefined) {
    const entered = ctx.couponCode.trim().toLowerCase();
    const required = (c.couponCode ?? "").trim().toLowerCase();
    if (!required || entered !== required) {
      return { applies: false, reason: "coupon_mismatch", discountTotal: 0, finalTotal: subtotal, steps };
    }
  }

  // 4 — calculate
  const discount = calcDiscount(c, ctx);
  const final = Math.max(0, subtotal - discount);

  return {
    applies: true,
    discountTotal: discount,
    finalTotal: final,
    steps,
  };
}
