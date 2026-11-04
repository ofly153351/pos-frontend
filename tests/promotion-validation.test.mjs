import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Load the real engine (type-only imports erase to nothing) without a bundler.
function loadEngine() {
  const source = readFileSync(new URL("../components/promotions/promotion-engine.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: () => ({}) });
  return mod.exports;
}

const { evaluatePromotion, invalidDiscountField } = loadEngine();
const base = { id: "p1", name: "P", status: "active", type: "percentage", scopeType: "store", scopeIds: [] };
const ctx = { unitPrice: 100, quantity: 2, now: new Date("2026-11-04T10:00:00Z") };

test("legacy active 150% campaign grants no discount (B04)", () => {
  const res = evaluatePromotion({ ...base, percentOff: 150 }, ctx);
  assert.equal(res.applies, false);
  assert.equal(res.reason, "invalid_parameters");
  assert.equal(res.discountTotal, 0);
  assert.equal(res.finalTotal, 200);
});

test("valid percentages still apply, including 0%, fractional and 100%", () => {
  assert.equal(evaluatePromotion({ ...base, percentOff: 10 }, ctx).discountTotal, 20);
  assert.equal(evaluatePromotion({ ...base, percentOff: 12.5 }, ctx).discountTotal, 25);
  assert.equal(evaluatePromotion({ ...base, percentOff: 100 }, ctx).finalTotal, 0);
  assert.equal(evaluatePromotion({ ...base, percentOff: 0 }, ctx).discountTotal, 0);
});

test("negative, non-finite and missing discount parameters are rejected", () => {
  for (const c of [
    { ...base, percentOff: -5 },
    { ...base, percentOff: Number.NaN },
    { ...base, percentOff: Number.POSITIVE_INFINITY },
    { ...base, percentOff: undefined },
    { ...base, type: "happy_hour", percentOff: 101 },
    { ...base, type: "fixed_amount", amountOff: -1 },
    { ...base, type: "buy_x_get_y", buyQty: 0, getQty: 1 },
    { ...base, type: "member_price", memberPrice: "50" },
  ]) {
    assert.notEqual(invalidDiscountField(c), null, JSON.stringify(c));
    assert.equal(evaluatePromotion(c, ctx).discountTotal, 0, JSON.stringify(c));
  }
});

test("drafts may omit unfinished values but supplied values must be valid; paused is never blocked", () => {
  assert.equal(invalidDiscountField({ ...base, status: "draft" }), null);
  assert.equal(invalidDiscountField({ ...base, status: "draft", percentOff: 150 }), "percentOff");
  assert.equal(invalidDiscountField({ ...base, status: "paused", percentOff: 150 }), null);
  assert.equal(invalidDiscountField({ ...base, status: "active", percentOff: 150 }), "percentOff");
});

test("a discount never exceeds the subtotal or goes negative", () => {
  const big = evaluatePromotion({ ...base, type: "spend_x_discount", minSpend: 0, discountAmount: 999 }, ctx);
  assert.equal(big.discountTotal, 200);
  assert.equal(big.finalTotal, 0);
  const priced = evaluatePromotion({ ...base, type: "fixed_price", fixedPrice: 150 }, ctx);
  assert.equal(priced.discountTotal, 0);
});
