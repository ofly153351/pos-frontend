import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(rel, deps = {}) {
  const source = readFileSync(new URL(rel, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Error, require: (n) => deps[n] ?? {} });
  return mod.exports;
}

class ApiError extends Error {
  constructor(message, status, code, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
const { localizeApiError } = load("../lib/api-error.ts", { "@/services/api": { ApiError } });
const locales = Object.fromEntries(["th", "en"].map((l) => [l, JSON.parse(readFileSync(new URL(`../locales/${l}.json`, import.meta.url), "utf8")).apiErrors]));

test("B23: coded field errors follow the selected language", () => {
  const err = new ApiError("validation failed", 422, "VALIDATION_ERROR", [{ field: "tax_id", code: "tax_id_invalid", message: "tax ID must be 13 digits" }]);
  const th = localizeApiError(err, locales.th);
  const en = localizeApiError(err, locales.en);
  assert.equal(th.fields.tax_id, "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลักและเลขตรวจสอบถูกต้อง");
  assert.equal(en.fields.tax_id, "Tax ID must be 13 digits with a valid check digit");
  assert.equal(th.level, "warning");
  assert.doesNotMatch(en.message, /[ก-๙]/, "English message must not contain Thai");
  assert.doesNotMatch(th.message, /validation failed/);
});

test("B23: 400/409/422 are warnings, others errors; unknown failures stay traceable", () => {
  assert.equal(localizeApiError(new ApiError("x", 409, "CONFLICT"), locales.en).level, "warning");
  assert.equal(localizeApiError(new ApiError("x", 400, "BAD_REQUEST"), locales.en).level, "warning");
  assert.equal(localizeApiError(new ApiError("x", 403, "FORBIDDEN"), locales.en).level, "error");
  const unknown = localizeApiError(new ApiError("boom", 418, "TEAPOT"), locales.th);
  assert.equal(unknown.level, "error");
  assert.match(unknown.message, /418 · TEAPOT/);
  const net = localizeApiError(new Error("Network Error"), locales.en);
  assert.match(net.message, /Network Error/);
});

test("B23: unknown field codes keep the backend message visible", () => {
  const err = new ApiError("validation failed", 422, "VALIDATION_ERROR", [{ field: "x", code: "brand_new", message: "server text" }]);
  assert.equal(localizeApiError(err, locales.en).fields.x, "server text");
});

test("B23: every code and status key exists in both languages", () => {
  for (const section of ["codes", "fields", "status"]) {
    assert.deepEqual(Object.keys(locales.th[section]).sort(), Object.keys(locales.en[section]).sort(), section);
  }
});

const { belowCostPrice } = load("../lib/price-checks.ts");
test("B16: below-cost detection (warn, never block)", () => {
  assert.equal(belowCostPrice("30", "", "40"), 30);
  assert.equal(belowCostPrice("50", "35", "40"), 35);
  assert.equal(belowCostPrice("50", "", "40"), null);
  assert.equal(belowCostPrice("50", "", ""), null);
  assert.equal(belowCostPrice("", "", "40"), null);
  assert.equal(belowCostPrice("50", "0", "40"), null);
});
