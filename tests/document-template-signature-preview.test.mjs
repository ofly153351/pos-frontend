import { readFileSync } from "node:fs";
import { test } from "node:test";
import { strict as assert } from "node:assert";

const component = readFileSync(new URL("../components/settings/document-templates-settings.tsx", import.meta.url), "utf8");
const screenStyles = component.match(/const PREVIEW_SCREEN_STYLES = `([^`]+)`;/)?.[1];

test("Standard's raw A4 preview shows signatures at the bottom without changing print CSS", () => {
  assert.ok(screenStyles, "Standard preview styles must be present");
  assert.match(screenStyles, /@media screen\{/);
  assert.match(screenStyles, /\.page\[data-show-signature="true"\]\{[^}]*padding-bottom:47mm!important/);
  assert.match(screenStyles, /\.page\[data-show-signature="true"\] \.signature-source\{[^}]*display:flex!important/);
  assert.match(screenStyles, /\.page\[data-show-signature="true"\] \.signature-source\{[^}]*position:absolute/);
  assert.match(screenStyles, /\.page\[data-show-signature="true"\] \.signature-source\{[^}]*bottom:16mm/);
});
