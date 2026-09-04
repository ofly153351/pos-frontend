/**
 * Regression test — count-sheet candidates come from the backend per-location
 * stock list (user-directed 2026-09-04: "filter ตามคลังจาก backend แทน state
 * ฝั่ง client").
 *
 * Guards the pure mapping in components/stock/count-candidates.ts, the single
 * source of truth shared by stock-count-manager.tsx and this test. Run:
 *   bun scripts/test-count-candidates.ts
 *
 * What it locks in:
 *  - The wizard builds its candidate sheet from LocationProduct rows returned by
 *    GET /locations/:id/products (products with system stock > 0 at the chosen
 *    location) — never from a client-side filter over the whole catalog.
 *  - quantity on the row IS the authoritative per-location system qty.
 *  - costBasis = cost_price ?? base_price (variance valuation).
 *  - categoryId drives the category scope/filter.
 */
import { buildCountCandidates } from "../components/stock/count-candidates";
import type { LocationProduct } from "../services/locations";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const row = (over: Partial<LocationProduct>): LocationProduct => ({
  product_id: "pd-1",
  product_name: "โค้ก 325ml",
  sku: "DRINK-001",
  quantity: 12,
  min_stock: 4,
  cost_price: 15.5,
  base_price: 20,
  category_id: "pt-drink",
  ...over,
});

console.log("[1] mapping keeps the backend fields the sheet needs");
{
  const out = buildCountCandidates(
    [
      row({}),
      row({ product_id: "pd-2", product_name: "น้ำเปล่า", sku: "", barcode: "885123", quantity: 2, cost_price: undefined, base_price: 8 }),
    ],
    { locationLabel: "คลังหลัก › โซน A › ชั้นวาง 1" },
  );
  check("row count preserved", out.length === 2, String(out.length));
  const first = out[0];
  check("id = product_id", first.id === "pd-1");
  check("name/sku copied", first.name === "โค้ก 325ml" && first.sku === "DRINK-001");
  check("quantity = authoritative per-location system qty", first.quantity === 12, String(first.quantity));
  check("minStock copied", first.minStock === 4);
  check("costBasis = cost_price when set", first.costBasis === 15.5, String(first.costBasis));
  check("categoryId = category_id", first.categoryId === "pt-drink");
  check("locationLabel stamped", first.locationLabel === "คลังหลัก › โซน A › ชั้นวาง 1");
  const second = out[1];
  check("costBasis falls back to base_price when cost_price missing", second.costBasis === 8, String(second.costBasis));
  check("sku/barcode default to empty string", second.sku === "" && second.barcode === "885123");
}

console.log("[2] rows with quantity <= 0 are never sheet rows (defensive)");
{
  const out = buildCountCandidates(
    [
      row({ product_id: "pd-zero", quantity: 0 }),
      row({ product_id: "pd-neg", quantity: -3 }),
      row({ product_id: "pd-live", quantity: 7 }),
    ],
    { locationLabel: "loc" },
  );
  check("only the positive row survives", out.length === 1 && out[0].id === "pd-live", out.map((c) => c.id).join(","));
}

console.log("[3] category scope filters server rows client-side only as convenience");
{
  const out = buildCountCandidates(
    [row({}), row({ product_id: "pd-snack", category_id: "pt-snack" })],
    { categoryId: "pt-drink", locationLabel: "loc" },
  );
  check("only the matching category remains", out.length === 1 && out[0].id === "pd-1", out.map((c) => c.id).join(","));
}

console.log("[4] empty input → empty sheet");
{
  const out = buildCountCandidates([], { locationLabel: "loc" });
  check("no rows in, no candidates out", out.length === 0);
}

if (fail > 0) {
  console.log(`\nFAIL: ${fail} failed, ${pass} passed`);
  process.exit(1);
}
console.log(`\nALL PASS: ${pass} passed`);
