import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load() {
  const source = readFileSync(new URL("../lib/preview-bridge.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports });
  return mod.exports;
}
const { withPreviewBridge, PREVIEW_SANDBOX_SCRIPTS } = load();

test("B29: preview frames never combine scripts with same-origin", () => {
  assert.doesNotMatch(PREVIEW_SANDBOX_SCRIPTS, /allow-same-origin/);
  const root = new URL("../components/", import.meta.url).pathname;
  const offenders = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(name) && /sandbox=["'][^"']*allow-same-origin/.test(readFileSync(p, "utf8"))) offenders.push(p);
    }
  })(root);
  assert.deepEqual(offenders, []);
});

test("B29: bridge injects CSP and the postMessage bridge", () => {
  const out = withPreviewBridge("<html><head><title>x</title></head><body><p>doc</p></body></html>");
  assert.match(out, /<head><meta http-equiv="Content-Security-Policy" content="connect-src 'none'/);
  assert.match(out, /pos-paged/);
  assert.match(out, /pos-print/);
  assert.ok(out.indexOf("pos-print") < out.indexOf("</body>"));
  assert.match(withPreviewBridge("<p>fragment</p>"), /Content-Security-Policy[\s\S]*pos-print/);
});
