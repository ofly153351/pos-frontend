import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/sales/cashier-modal.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Stateful component-boundary harness, not browser/payment E2E. Execute the real
// cashier handlers while replacing only framework hooks and child components.
function cashierHarness(locale) {
  const dictionary = JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url), "utf8")).sales;
  const values = [];
  const refs = [];
  const listeners = new Map();
  const timers = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effects = [];
  let closed = 0;
  let held = 0;
  const SalesManager = () => null;
  const react = {
    ...require("react"),
    useState: (initial) => {
      const i = stateIndex++;
      if (!(i in values)) values[i] = initial;
      return [values[i], (next) => { values[i] = typeof next === "function" ? next(values[i]) : next; }];
    },
    useRef: (initial) => {
      const i = refIndex++;
      return refs[i] ??= { current: initial };
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => { effects.push(fn); },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return require(name);
      if (name.includes("sales-manager")) return { SalesManager };
      return new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null });
    },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    requestAnimationFrame: (fn) => { fn(); return 1; },
    window: {
      addEventListener: (name, fn) => { listeners.set(name, fn); },
      removeEventListener: (name) => { listeners.delete(name); },
    },
  });
  function render() {
    stateIndex = 0;
    refIndex = 0;
    effects = [];
    const tree = exports.CashierModal({ dictionary, locale, navLabels: {}, onClose: () => { closed++; } });
    for (const effect of effects) effect();
    const manager = find(tree, (node) => node.type === SalesManager);
    manager.props.ref.current = { holdBill: () => { held++; } };
    return tree;
  }
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return undefined;
    if (predicate(tree)) return tree;
    for (const child of [tree.props?.children].flat(Infinity)) {
      const result = find(child, predicate);
      if (result) return result;
    }
  }
  function text(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node !== "object") return String(node);
    return [node.props?.children].flat(Infinity).map(text).join("");
  }
  function button(tree, label) {
    const matches = [];
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "button" && (node.props["aria-label"] === label || text(node).includes(label))) matches.push(node);
      for (const child of [node.props?.children].flat(Infinity)) visit(child);
    }
    visit(tree);
    // Confirmation options follow the toolbar; select the actual dialog action
    // when both share a localized Hold label.
    return matches.at(-1);
  }
  return {
    dictionary, render,
    setCart: (count) => { find(render(), (node) => node.type === SalesManager).props.onCartItemsChange(count); },
    click: (tree, label) => { const target = button(tree, label); assert.ok(target, `missing ${label}`); target.props.onClick(); },
    escape: () => { listeners.get("keydown")?.({ key: "Escape" }); },
    flushTimers: () => { while (timers.length) timers.shift()(); },
    hasConfirmation: (tree) => !!find(tree, (node) => node.type === "h3" && text(node).includes(dictionary.confirmCloseTitle.replace("{count}", "2"))),
    closed: () => closed,
    held: () => held,
  };
}

for (const locale of ["th", "en"]) {
  test(`${locale} nonempty cart requires confirmation before closing`, () => {
    const app = cashierHarness(locale);
    app.setCart(2);
    app.click(app.render(), app.dictionary.closeCashierLabel);
    app.flushTimers();
    assert.equal(app.closed(), 0);
    assert.ok(app.hasConfirmation(app.render()));
    app.click(app.render(), app.dictionary.confirmCloseCancelLabel);
    assert.equal(app.hasConfirmation(app.render()), false);
    assert.equal(app.closed(), 0);
  });
  test(`${locale} Escape prompts for a nonempty cart; discard explicitly closes`, () => {
    const app = cashierHarness(locale);
    app.setCart(2);
    app.render();
    app.escape();
    assert.ok(app.hasConfirmation(app.render()));
    app.flushTimers();
    assert.equal(app.closed(), 0);
    app.click(app.render(), app.dictionary.confirmCloseDiscardLabel);
    app.flushTimers();
    assert.equal(app.closed(), 1);
  });
  test(`${locale} hold option delegates to SalesManager without discarding the cart`, () => {
    const app = cashierHarness(locale);
    app.setCart(2);
    app.click(app.render(), app.dictionary.closeCashierLabel);
    app.click(app.render(), app.dictionary.holdBillLabel);
    app.flushTimers();
    assert.equal(app.held(), 1);
    assert.equal(app.closed(), 0);
    assert.equal(app.hasConfirmation(app.render()), false);
  });
}
