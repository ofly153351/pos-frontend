import { readFileSync } from "node:fs";
import { test } from "node:test";
import { strict as assert } from "node:assert";

const load = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("all templates compare one mock document with current store identity, without fetching actual documents", () => {
  const component = load("../components/settings/document-templates-settings.tsx");
  const service = load("../services/receipt-settings.ts");
  const type = load("../types/receipt-settings.ts");
  for (const locale of ["th", "en"]) {
    const dictionary = JSON.parse(load(`../locales/${locale}.json`));
    assert.ok(dictionary.documentTemplates.template3, `missing ${locale} template label`);
    assert.match(dictionary.documentTemplates.previewNote, locale === "th" ? /ตัวอย่าง/ : /sample/i);
  }
  assert.match(type, /document_template_key: "standard" \| "classic" \| "template3"/);
  assert.match(service, /fetchDocumentTemplatePreviewHTML/);
  assert.match(component, /\["standard", "classic", "template3"\] as const/);
  for (const key of ["standard", "classic", "template3"]) {
    assert.match(component, new RegExp(`fetchDocumentTemplatePreviewHTML\\(\\{ document_template_key: "${key}"`));
  }
  assert.doesNotMatch(component, /getDocuments|getDocumentTemplatePreviewHtml|sourceId|sourceQuery|noDocuments/);
  assert.match(component, /storeChangedEvent/);
  assert.match(component, /window\.addEventListener\("storage"/);
  assert.match(component, /\.page\.template-template3/);
});

test("settings mock preview uses the same A4 drawer shell as documents without a document ID", () => {
  const settings = load("../components/settings/document-templates-settings.tsx");
  const documents = load("../components/documents/document-preview-panel.tsx");
  assert.match(settings, /<DocumentA4PreviewDrawer/);
  assert.match(documents, /<DocumentA4PreviewDrawer/);
  assert.match(settings, /<DocumentA4PreviewPages/);
  assert.match(documents, /<DocumentA4PreviewPages/);
  assert.doesNotMatch(settings, /<DrawerShell/);
  assert.doesNotMatch(settings, /getDocumentPrintHtml|documentId/);
});

test("each template card has a separate preview action without selecting or saving it", () => {
  const settings = load("../components/settings/document-templates-settings.tsx");
  assert.doesNotMatch(settings, /<aside\b/);
  assert.match(settings, /<div key=\{key\}/);
  assert.match(settings, /onClick=\{\(\) => setDraftOverride/);
  assert.match(settings, /onClick=\{\(\) => \{ setPreviewTemplateKey\(key\); setPreviewOpen\(true\); \}\}/);
  assert.match(settings, /previewsQuery\.data\?\.\[previewTemplateKey\]/);
  assert.doesNotMatch(settings, /<button key=\{key\}[^>]*>[\s\S]*?<button/);
});
