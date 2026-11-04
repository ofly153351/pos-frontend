import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const src = readFileSync(new URL("../lib/document-actions.ts", import.meta.url), "utf8");
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports, require: () => ({}) });
const { conversionTargets, canRecordPayment, canCancel } = mod.exports;
const j = (v) => JSON.stringify(v);

test("B22: conversion targets mirror the backend matrix", () => {
  assert.equal(j(conversionTargets("DELIVERY_ORDER", "PENDING")), j(["INVOICE", "RECEIPT"]));
  assert.equal(j(conversionTargets("RECEIPT", "COMPLETED")), j(["TAX_INVOICE", "CREDIT_NOTE"]));
  assert.equal(j(conversionTargets("BILL", "PENDING")), j(["RECEIPT"]));
  assert.equal(j(conversionTargets("INVOICE", "CANCELLED")), j([]));
  assert.equal(j(conversionTargets("QUOTATION", "CONVERTED")), j([]));
});

test("B22: payment and cancel follow status rules", () => {
  assert.equal(canRecordPayment("BILL", "PENDING", "PARTIAL"), true);
  assert.equal(canRecordPayment("INVOICE", "CANCELLED", "UNPAID"), false);
  assert.equal(canRecordPayment("QUOTATION", "PENDING", "UNPAID"), false);
  assert.equal(canCancel("COMPLETED"), false);
  assert.equal(canCancel("SENT"), true);
});

test("B22: both document menus use the shared rules", () => {
  for (const f of ["../components/documents/document-row-actions.tsx", "../components/documents/document-preview-panel.tsx"]) {
    const s = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.match(s, /conversionTargets\(/, f);
    assert.match(s, /canRecordPayment\(/, f);
  }
});
