import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const src = readFileSync(new URL("../lib/product-defaults.ts", import.meta.url), "utf8");
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports });
const { newProductDefaults } = mod.exports;

test("B17: new products never inherit the first brand/category/unit", () => {
  assert.equal(JSON.stringify(newProductDefaults([{ id: "u1" }, { id: "u2" }])), JSON.stringify({ brand_id: "", product_type_id: "", unit_id: "" }));
  assert.equal(newProductDefaults([{ id: "only" }]).unit_id, "only");
  assert.equal(newProductDefaults([{ id: "off", is_active: false }, { id: "on" }]).unit_id, "on");
  assert.equal(newProductDefaults([]).unit_id, "");
});
