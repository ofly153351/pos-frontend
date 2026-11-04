import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const src = ts.transpileModule(fs.readFileSync(new URL("../lib/inflight.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { sharedRequest } = await import("data:text/javascript," + encodeURIComponent(src));

test("concurrent callers share one request; settled requests are not cached", async () => {
  let calls = 0;
  const run = () => { calls++; return new Promise((r) => setTimeout(() => r(calls), 5)); };
  const [a, b, c] = await Promise.all([sharedRequest("k", run), sharedRequest("k", run), sharedRequest("k", run)]);
  assert.equal(calls, 1);
  assert.deepEqual([a, b, c], [1, 1, 1]);
  assert.equal(await sharedRequest("k", run), 2);
});

test("a failure is shared and then cleared", async () => {
  let calls = 0;
  const bad = () => { calls++; return Promise.reject(new Error("x")); };
  await assert.rejects(Promise.all([sharedRequest("e", bad), sharedRequest("e", bad)]));
  assert.equal(calls, 1);
  await assert.rejects(sharedRequest("e", bad));
  assert.equal(calls, 2);
});
