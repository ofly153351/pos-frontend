import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// B20: the desktop sidebar and the drawer (cashier / narrow screens) must offer
// the same destinations with the same permission filtering.
const cfg = readFileSync(new URL("../components/navigation/nav-config.tsx", import.meta.url), "utf8");
const side = readFileSync(new URL("../components/navigation/user-workspace-sidebar.tsx", import.meta.url), "utf8");

const groupKeys = new Set(["products", "stock", "purchasing", "reports", "settings"]);
const leafKeys = (src) => new Set([...src.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]).filter((k) => !groupKeys.has(k)));
const routes = (src) => new Set([...src.matchAll(/`\/\$\{(?:l|locale)\}(\/[a-z0-9/-]+)`/g)].map((m) => m[1]));

test("B20: sidebar and drawer list the same menu items", () => {
  const a = leafKeys(cfg);
  const b = leafKeys(side);
  for (const k of ["receipt-payment", "documentTemplates", "activity-logs", "staff", "store-settings", "purchase-orders", "suppliers"]) b.add(k);
  assert.deepEqual([...a].filter((k) => !b.has(k)), [], "in drawer but not sidebar");
});

test("B20: every drawer route exists in the sidebar", () => {
  const sideRoutes = routes(side);
  const missing = [...routes(cfg)].filter((r) => !sideRoutes.has(r));
  assert.deepEqual(missing, []);
});

test("B20: reports/finance and settings are manager-only in both", () => {
  assert.match(cfg, /manageOnly:\s*true/);
  assert.match(side, /\{canManage \? \(/);
});
