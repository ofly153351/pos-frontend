# Dark Mode / Enterprise Theme System — Task List

> **Purpose:** actionable, self-contained checklist to implement the enterprise theme
> system (Dark Mode foundation) later. Read this, then execute phase by phase.
> Full audit rationale: `D:/POS/audit/theme-system/PHASE_0_THEME_AUDIT.md`.
>
> **Status:** Phase 0 (audit) ✅ DONE. Phases 1–8 NOT started.

---

## 0. Hard Constraints (do not violate)

- ✅ **Light theme must stay visually IDENTICAL.** Every light-mode token value = the
  current hardcoded hex. Gate every change with a light-mode screenshot diff.
- ✅ Dark mode is **additive**, not a redesign. No layout/spacing/UX changes.
- ✅ **Print/PDF/barcode must always render light** (legal + paper). Never theme them.
- ✅ Architecture must let **future pages auto-support every theme** with zero per-page work.
- ✅ Keep Thai-first UX. Maintain `tsc = 0`, `eslint = 0`.

---

## 1. Stack Facts (verified)

- Tailwind **v4**, CSS-first (`@theme inline` in `app/globals.css`) — no `tailwind.config.js`.
- Next 16 App Router + React 19 + next-intl (`[locale]` routing).
- No `next-themes`, no `ThemeProvider`, no `.dark`, no `dark:` anywhere yet.
- `globals.css` already remaps `sky-*` → violet (legacy alias) + has a commented dark scaffold.
- ~10,800 hardcoded color-class sites across 216 tsx files (violet 3432, slate 3388,
  white 1349, rose 554, amber 447, emerald 410, red 128, indigo 77, …). 17 hex / 38
  inline-style / 28 rgb files.

---

## 2. Chosen Architecture — Hybrid Semantic Tokens

CSS-variable-backed semantic tokens + class-based switching.

- `:root` holds **light** values (= today's hex → Light unchanged).
- `.dark` overrides the same variables with dark values.
- Tokens exposed as Tailwind utilities via `@theme inline` (`bg-surface`, `text-primary`…).
- Switch by toggling `.dark` on `<html>` (next-themes). Use `[data-theme="…"]` layering so
  future themes (Corporate / Brand / White-Label) plug in without touching components.
- **Why not** pure auto-remap (breaks `white`/ramp ambiguity + print) or full hand-edit of
  10.8k sites (weeks, high regression risk). Hybrid = primitives migration + reviewed codemod.

---

## PHASE 1 — Design Token System (additive, safe)

- [ ] Add dark variant to `globals.css`:
  ```css
  @custom-variant dark (&:where(.dark, .dark *));
  ```
- [ ] Define semantic CSS variables in `:root` (light = current hex) — groups:
  - **Background:** `--bg-default` (#F9FAFB), `--bg-surface` (#FFFFFF), `--bg-elevated`,
    `--bg-sidebar` (#1E1B4B), `--bg-modal` (#FFFFFF)
  - **Text:** `--text-primary` (#111827/#1e293b), `--text-secondary` (#64748b),
    `--text-tertiary` (#94a3b8), `--text-inverse` (#fff), `--text-disabled`
  - **Border:** `--border-default` (#E5E7EB / violet-100), `--border-soft`, `--border-focus` (#7C3AED)
  - **Status** (each: `-subtle-bg`, `-text`, `-border`, `-solid`, `-on-solid`):
    `--success` (emerald), `--warning` (amber), `--danger` (rose), `--info` (blue/indigo)
  - **Interactive:** `--primary` (violet-600), `--secondary`, `--hover`, `--active`,
    `--selected`, `--disabled`
  - **Other:** `--overlay` (rgba(15,23,42,0.4)), `--shadow-sm/md/lg`, `--shadow-brand`,
    `--radius-*`
  - **Print (IMMUTABLE — never themed):** `--print-text` (#1e293b), `--print-heading` (#1e1b4b),
    `--print-brand` (#6d28d9), `--print-border` (#e2e8f0), `--print-danger` (#dc2626)
- [ ] Add `.dark { … }` block overriding all of the above (except `--print-*`). Suggested
  dark scale: page `#0f172a` (slate-950), surface `#1e293b` (slate-900), elevated `#334155`
  (slate-800); text primary `#f1f5f9`, secondary `#cbd5e1`, tertiary `#94a3b8`; brand keep
  violet but consider `#a78bfa` (violet-400) for on-dark contrast; status `*-subtle-bg` →
  900/950 tints, `*-text` → 300/400.
- [ ] Lock print to light regardless of theme:
  ```css
  @media print { :root { color-scheme: light; } }
  /* + wrap printed subtrees in style="color-scheme: light" */
  ```

## PHASE 2 — Semantic Tokens as Tailwind Utilities

- [ ] In `@theme inline`, map utilities to the vars so classes exist:
  `--color-surface`, `--color-elevated`, `--color-primary-fg` (text-primary), `--color-secondary-fg`,
  `--color-border-default`, `--color-success-subtle`, `--color-danger-text`, etc.
- [ ] Produce a **mapping table** (old class → semantic token) for the codemod (Phase 3).
- [ ] Smoke-test: a throwaway page using only new tokens renders correctly in both modes.

## PHASE 3 — Component Migration (leverage-ordered)

### 3a. Shared primitives FIRST (covers most surface area)
Migrate to semantic tokens + add `dark:` where needed:
- [ ] `components/ui/*` — Alert, Toast, ConfirmModal, SuccessPopup, Skeleton, QueryErrorState,
      FieldError (also fix `text-red-500` → danger token), Spinner, Badge, Card, Tabs, Tooltip
- [ ] Buttons / Inputs / Select / Textarea (input bg/border/placeholder/focus-ring) — see C1
- [ ] Modals / Drawers + **single `--overlay` backdrop token** (replace `bg-black/40`,
      `bg-slate-900/60`, `bg-slate-900/40`, `rgba(15,10,50,0.65)`)
- [ ] Table (header bg/text, row hover, borders)
- [ ] Sidebar / Navbar / Notification dropdown / Profile menu — handle **C3 dark-navbar**
      (sidebar already dark in light; give deliberate dark treatment, not invisible)

### 3b. Codemod the neutral/surface long tail (REVIEW each, not blind)
Mapping:
| Old | New |
|-----|-----|
| `bg-white` (surface) | `bg-surface` |
| `text-slate-900` / `-800` | `text-primary` |
| `text-slate-600` / `-500` | `text-secondary` |
| `text-slate-400` | `text-tertiary` |
| `border-violet-100` / `border-slate-200` | `border-default` |
| `bg-slate-50` | `bg-default` / `bg-subtle` |
| `focus:ring-violet-100` | `focus:ring-[--border-focus]` |
| **KEEP literal** | `text-white` (on brand), `bg-violet-600/700` (brand solids) |

### 3c. Status system (C5) — de-duplicate
- [ ] Create one `lib/status-tokens.ts` (or CSS classes) for severity/status/urgency.
- [ ] Replace inline maps in: `document-status-badge`, `document-type-badge`,
      copilot `insights-tab`/`risks-tab`/`actions-tab`/`overview-tab`, `notification-dropdown`,
      `dashboard-manager` (KPI cards), `document-stats-cards`, `warehouse-dashboard`,
      `chat-tab` (emoji bg), `auth-form` (password strength).

### 3d. Gradients & shadows (C6)
- [ ] Replace hardcoded gradient hex in className with tokens / `dark:` variants:
      `user-workspace-layout.tsx:211`, `user-workspace-shell.tsx:46`,
      `admin-workspace-shell.tsx:35`, `card-settings-modal.tsx:237`, `cashier-modal.tsx:88`,
      `auth-shell.tsx`
- [ ] Tokenize shadows: `rgba(124,58,237,0.1/.18)` → `--shadow-brand`,
      `rgba(15,23,42,0.18)` → `--shadow-md`, `rgba(0,0,0,0.5)` → `--shadow-lg`

### 3e. Charts (C4) — recharts has only this lib
- [ ] Build `useChartTheme()` hook returning resolved colors per mode
      (grid, axisText, tooltipBg/Border/Text, series[], success, danger).
- [ ] Thread into: `revenue-profit-line-chart`, `bar-trend-chart`, `sales-by-hour-chart`,
      `category-donut-chart`, `dashboard-manager` (area + gradient stops),
      `warehouse-dashboard` (bars). CSS-bar charts (`revenue-cost-profit-bars`,
      `category-value-bars`) + SVG bars `warehouse-section.tsx` → add `dark:` shades.

### 3f. Print lock (C2) — DO NOT theme; only protect
Centralize hex into `--print-*` (immutable) + add "PRINT-ONLY, do not theme" comments:
- [ ] `invoice-a4.tsx`, `invoice-short.tsx`, `invoice-print-client.tsx`
- [ ] `documents/document-print-client.tsx`, `document-page-client.tsx:540`
- [ ] `sales/sale-document-preview-modal.tsx` (#555/#ccc)
- [ ] `lib/label.ts` (LABEL_CSS), `lib/label-raster.ts` (white canvas), `lib/barcode.ts` (#0f172a)
- [ ] Keep LINE brand `#00B900` (`add-supplier-modal.tsx`) as immutable brand token.

## PHASE 4 — Dark Mode Validation (per-route sweep)
- [ ] Toggle `.dark`, visit every module (Dashboard, Sales, POS, Purchasing, Goods Receiving,
      Inventory, Warehouse, Products, Customers, Suppliers, Finance, Reports, Settings, Profile).
- [ ] Check: no invisible text/icons/borders, no white-on-white / black-on-black, readable
      tables/badges/charts/dialogs/dropdowns/tooltips/calendars/pagination/toasts.

## PHASE 5 — Contrast (WCAG AA)
- [ ] Verify every token text/bg pair ≥ AA (4.5:1 body, 3:1 large/UI). Primary, secondary,
      disabled, placeholder, links, status colors — both modes.

## PHASE 6 — Third-party
- [ ] recharts: confirm `useChartTheme` covers grid/axis/tooltip/series in dark. No other UI lib.

## PHASE 7 — Theme Switching
- [ ] Install + wire `next-themes` (SSR-safe, persisted, `.dark` on `<html>`).
- [ ] Add toggle (settings + topbar). Architecture via `[data-theme]` for future themes
      (Corporate / Brand / White-Label / customer-specific). Document how to add a theme.

## PHASE 8 — Regression Protection
- [ ] ESLint rule banning raw color classes in new code (`no-restricted-syntax` /
      eslint-plugin-tailwindcss) — require semantic tokens.
- [ ] Optional stylelint for CSS. Add CI check. New components inherit theme automatically.

---

## Decisions to confirm before Phase 3
1. Dark surface scale (default proposed: page `slate-950` / surface `slate-900` / elevated `slate-800`).
2. Brand in dark: keep `violet-600` vs lighten to `violet-400` for contrast.
3. Sidebar dark treatment (C3): keep brand-dark vs elevated neutral surface.
4. Migration aggressiveness: Hybrid (recommended) confirmed? (vs full hand-edit / minimal auto-remap).

## Validation gates (every phase)
- `npx tsc --noEmit` = 0, `npx eslint` = 0.
- **Light screenshot diff = identical** (hard gate).
- Dark per-route sweep + WCAG AA before ship.
