import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Execute the real route/layout with only framework hooks and child components
// replaced. No HTTP server, browser, storage, or financial mutations are needed.
function harness(locale, initialPath, historyLength = 2) {
  let pathname = initialPath;
  let effects = [];
  const navigations = [];
  const timers = [];
  const storage = new Map();
  const router = {
    back: () => navigations.push("back"),
    replace: (url) => navigations.push(url),
    push: (url) => { navigations.push(url); pathname = url; },
  };
  const Cashier = () => null;
  const Sidebar = () => null;
  const Drawer = () => null;
  const react = {
    ...require("react"),
    use: () => ({ locale }),
    useState: (initial) => [initial, () => {}],
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    useEffect: (fn) => effects.push(fn),
  };
  function load(relativePath) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
      exports,
      require: (name) => {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return require(name);
        if (name === "next/navigation") return { useRouter: () => router, usePathname: () => pathname };
        if (name === "next/dynamic") return { default: () => Cashier };
        if (name.includes("user-workspace-sidebar")) return { UserWorkspaceSidebar: Sidebar };
        if (name.includes("sidebar-drawer")) return { SidebarDrawer: Drawer };
        return new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null });
      },
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      window: { history: { length: historyLength } },
      requestAnimationFrame: (fn) => { fn(); return 1; },
      cancelAnimationFrame: () => {},
      setTimeout: (fn) => { timers.push(fn); return timers.length; },
      clearTimeout: () => {},
    });
    return exports;
  }
  const Page = load("../app/[locale]/(user)/(workspace)/sales/page.tsx").default;
  const { UserWorkspaceLayout } = load("../components/layouts/user-workspace-layout.tsx");
  function render() {
    effects = [];
    const tree = UserWorkspaceLayout({
      children: pathname === `/${locale}/sales` ? Page({ params: Promise.resolve({ locale }) }) : null,
      locale, salesDictionary: {}, shell: {}, titles: {},
    });
    for (const effect of effects) effect();
    return tree;
  }
  function find(tree, type) {
    if (!tree || typeof tree !== "object") return undefined;
    if (tree.type === type) return tree;
    for (const child of [tree.props?.children].flat(Infinity)) {
      const match = find(child, type);
      if (match) return match;
    }
  }
  function navigateFromCashierDrawer() {
    const { CashierModal } = load("../components/sales/cashier-modal.tsx");
    const tree = CashierModal({ dictionary: {}, locale, navLabels: {}, onClose: () => router.push(`/${locale}/dashboard`) });
    find(tree, Drawer).props.onNavigate();
    for (const timer of timers) timer();
  }
  return { render, navigations, navigateFromCashierDrawer, cashier: (tree) => find(tree, Cashier), sidebar: (tree) => find(tree, Sidebar) };
}

for (const locale of ["th", "en"]) {
  for (const historyLength of [1, 4]) {
    test(`${locale} direct sales entry with history length ${historyLength} mounts cashier without navigating away`, () => {
      const app = harness(locale, `/${locale}/sales`, historyLength);
      const tree = app.render();
      assert.deepEqual(app.navigations, [], "route entry must not pop history or redirect");
      assert.ok(app.cashier(tree), "sales route mounts the cashier without a storage handoff");
    });
  }
  test(`${locale} register menu navigates to sales and mounts the same cashier`, () => {
    const app = harness(locale, `/${locale}/dashboard`);
    const tree = app.render();
    assert.equal(app.cashier(tree), undefined);
    app.sidebar(tree).props.onOpenCashier();
    assert.deepEqual(app.navigations, [`/${locale}/sales`]);
    assert.ok(app.cashier(app.render()));
  });
  test(`${locale} explicit cashier close has a deterministic in-app destination`, () => {
    const app = harness(locale, `/${locale}/sales`);
    const cashier = app.cashier(app.render());
    assert.ok(cashier);
    cashier.props.onClose();
    assert.deepEqual(app.navigations, [`/${locale}/dashboard`]);
    assert.equal(app.cashier(app.render()), undefined);
  });
  test(`${locale} cashier drawer navigation does not schedule a competing dashboard redirect`, () => {
    const app = harness(locale, `/${locale}/sales`);
    app.navigateFromCashierDrawer();
    assert.deepEqual(app.navigations, [], "the drawer Link owns navigation; route change unmounts the cashier");
  });
}
