import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const component = readFileSync(new URL("../components/settings/receipt-payment-settings.tsx", import.meta.url), "utf8");
const th = JSON.parse(readFileSync(new URL("../locales/th.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../locales/en.json", import.meta.url), "utf8"));

test("receipt header offers a localized preview action and no inline preview section", () => {
  assert.match(component, /activeTab === "receipt"[\s\S]*?onClick=\{\(\) => setPreviewOpen\(true\)\}[\s\S]*?t\.page\.previewButton/);
  assert.doesNotMatch(component, /<section aria-label=\{t\.previewLabel\}/);
  assert.ok(th.receiptSettings.page.previewButton);
  assert.ok(en.receiptSettings.page.previewButton);
});

test("preview is a centered accessible dialog with a close action and the live iframe", () => {
  assert.match(component, /<dialog[\s\S]*?ref=\{previewDialogRef\}[\s\S]*?aria-label=\{t\.previewLabel\}/);
  assert.ok(/dialog\.showModal\(\)/.test(component), "opens the native dialog modally");
  assert.match(component, /onClick=\{\(\) => setPreviewOpen\(false\)\}/);
  assert.match(component, /<iframe srcDoc=\{previewSrcdoc\}/);
  assert.ok(th.receiptSettings.page.closePreview);
  assert.ok(en.receiptSettings.page.closePreview);
});

test("preview dialog omits the API source badge", () => {
  assert.ok(!component.includes("t.previewApiLabel"), "API source label is not rendered");
  assert.ok(!component.includes('className="text-xs text-violet-600"'), "badge wrapper is removed");
});
