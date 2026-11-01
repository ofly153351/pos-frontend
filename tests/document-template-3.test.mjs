import { readFileSync } from "node:fs";
import { test } from "node:test";
import { strict as assert } from "node:assert";

const load = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("template 3 is selectable and compares the same real document", () => {
  const component = load("../components/settings/document-templates-settings.tsx");
  const service = load("../services/documents.ts");
  const type = load("../types/receipt-settings.ts");
  for (const locale of ["th", "en"]) {
    const dictionary = JSON.parse(load(`../locales/${locale}.json`));
    assert.ok(dictionary.documentTemplates.template3, `missing ${locale} template label`);
  }
  assert.match(type, /document_template_key: "standard" \| "classic" \| "template3"/);
  assert.match(service, /templateKey: "standard" \| "classic" \| "template3"/);
  assert.match(component, /\["standard", "classic", "template3"\] as const/);
  assert.match(component, /getDocumentTemplatePreviewHtml\(sourceId, "template3"\)/);
  assert.match(component, /\.page\.template-template3/);
});
