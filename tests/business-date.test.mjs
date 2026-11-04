import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load() {
  const source = readFileSync(new URL("../lib/business-date.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Intl, Date });
  return mod.exports;
}
const { todayBusinessDate, toBusinessDate, formatBusinessDate } = load();

// B02 — run this file under several TZ values; results must not change.
test("today is the Bangkok calendar day, not the UTC day", () => {
  // 00:30 Bangkok on 4 Nov = 17:30 UTC on 3 Nov.
  assert.equal(todayBusinessDate(new Date("2026-11-03T17:30:00Z")), "2026-11-04");
  assert.equal(todayBusinessDate(new Date("2026-11-04T16:59:00Z")), "2026-11-04");
  assert.equal(todayBusinessDate(new Date("2026-11-04T17:00:00Z")), "2026-11-05");
});

test("API values keep their business day for edit prefill", () => {
  assert.equal(toBusinessDate("2026-11-04T00:00:00Z"), "2026-11-04"); // submitted date (UTC midnight)
  assert.equal(toBusinessDate("2026-11-03T17:30:00Z"), "2026-11-04"); // legacy sale instant
  assert.equal(toBusinessDate("2026-11-04T07:00:00+07:00"), "2026-11-04");
  assert.equal(toBusinessDate(""), "");
  assert.equal(toBusinessDate(null), "");
  assert.equal(toBusinessDate("not-a-date"), "");
});

test("display does not shift with the viewer's timezone", () => {
  const a = formatBusinessDate("2026-11-04T00:00:00Z", "short", "en-GB");
  const b = formatBusinessDate("2026-11-03T17:30:00Z", "short", "en-GB");
  assert.equal(a, "04/11/2026");
  assert.equal(b, "04/11/2026");
  assert.match(formatBusinessDate("2026-11-04T00:00:00Z", "medium", "th-TH"), /4 พ\.ย\. 2569/);
});
