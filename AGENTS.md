<!-- BEGIN:nextjs-agent-rules -->
# AGENTS.md (Frontend)

## Overview
This is the frontend of a POS (Point of Sale) web application.

Built with:
- Next.js (App Router)
- TypeScript
- Zustand (global state)
- TanStack Query (data fetching)
- i18n (multi-language support)

---

## Requirements

### 1. i18n (Required)
- All UI must support multi-language
- Do NOT hardcode text
- Use `/locales/th.json` and `/locales/en.json`
- Default: English

---

### 2. State Management
Use Zustand for:
- auth state
- user data
- UI state (modal, theme)

Avoid:
- React Context for global state

---

### 3. Data Fetching
Use TanStack Query:
- Queries → GET
- Mutations → POST/PUT/DELETE
- Handle loading & error states

---

### 4. Middleware (Next.js)
Implement:
- auth protection
- role-based routing

Example:
- /dashboard → authenticated only
- /admin → admin only

---

### 5. API Layer
- Use Axios or fetch wrapper
- Centralize API logic in `/services`
- Attach token via interceptor

---

## Folder Structure

/app/[locale]
/app/[locale]/(user)
/app/[locale]/(admin)
/components
/hooks
/store
/services
/middleware
/types
/lib

---

## UI Rules
- Clean POS layout — fast interaction is the top priority
- Use smooth, purposeful animations/transitions for interactive UI (drawer, modal, submenu, toggle) with consistent easing and duration
- All popups/modals/drawers must support closing with the `Escape` key
- Mobile responsive

### Theme: POS Today (violet/purple)
The design system uses a **violet/purple** palette throughout. Token file: `/theme/theme.css`. Showcase: `/theme/theme-components.html`.

**Core palette:**
| Role | Value | Tailwind |
|---|---|---|
| Brand primary | `#7C3AED` | `violet-600` / `sky-600` (remapped) |
| Sidebar bg | `#1E1B4B` | `indigo-950` |
| Page bg | violet-tinted white | `bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_35%,_#f8fafc_100%)]` |
| Card | white + violet border | `bg-white border border-violet-100 shadow-sm rounded-xl` |
| Input border | `border-violet-200` focus: `border-violet-400 ring-2 ring-violet-100` |
| Section/table bg | `bg-violet-50/40` |

**Tailwind mapping:** `sky-*` utilities are remapped to violet in `globals.css` via `@theme inline`. All `sky-*` classes render as violet automatically.

**Buttons:**
- Primary / CTA: `bg-violet-600 text-white hover:bg-violet-700`
- Secondary / outline: `border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`
- Ghost / text: `text-violet-600 hover:bg-violet-50`
- Danger: keep red (`bg-red-600`, `text-red-600`) — do NOT change
- **Cursor:** `button:not(:disabled) { cursor: pointer }` is set globally in `globals.css` — do NOT add `cursor-pointer` to individual buttons; disabled buttons automatically get the default cursor

**Form inputs / selects / textareas:**
- `border-violet-200 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100`
- Error state: `border-rose-300 bg-rose-50/70`

**Sidebar (dark indigo):**
- Container: `bg-indigo-950`
- Nav items inactive: `text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg`
- Nav items active: `border-l-[3px] border-violet-400 bg-violet-900 text-white rounded-r-lg`
- Sub-items active: `bg-violet-800/80 text-violet-200`
- Icons inactive: `bg-violet-900/60 text-violet-300`
- Store card: `border border-violet-800/50 bg-violet-900/30`

**Backgrounds (avoid empty/bare white sections):**
- Page wrapper: violet-tinted gradient (not plain white or `bg-gray-50`)
- Empty states / placeholders: `bg-violet-50/40 border-dashed border-violet-200`
- Table/section wrappers: `bg-violet-50/40` or `bg-white border border-violet-100`
- Progress/track bars: `bg-violet-100/50`
- Neutral badges: `bg-violet-100 text-violet-700`
- Avatar / initials: `bg-violet-600 text-white`

**Status colors (keep as-is):** emerald = active/success, rose/red = error/danger, amber = warning

**Fonts:** `Sarabun` (Thai-compatible) loaded in `globals.css`. JetBrains Mono for code/numbers.

- Watch hydration: avoid browser-only branches or browser-only data (window/date/random) inside server-rendered components so the markup stays deterministic between server/client
- For Client Components rendered by App Router, keep the first client render structurally identical to the server HTML. If browser-only state is required, defer it with `useEffect` and use a stable mount-safe fallback instead of changing classes/text/DOM shape during hydration
- Avoid invalid HTML nesting because the browser may repair the DOM differently from React's expected tree and trigger hydration mismatch errors

---

## Structure Rules
- Keep global shared types in `/types`
- Keep browser storage and shared helpers in `/lib`
- Keep backend API integration in `/services`
- Prefer Next.js Route Handlers as a backend-for-frontend proxy when browser CORS would block direct API calls
- Use route groups such as `(user)` and `(admin)` to separate cashier/user flows from admin management flows
- Keep the onboarding flow in this order: `auth -> subscription -> setup/store -> workspace`
- Keep auth UI in `/components/auth`
- Keep route files thin and move logic into reusable modules

---

## Coding Rules
- TypeScript strict
- Functional components only
- Reusable components
- Avoid unnecessary re-renders

---

---

## Shared UI Components

### Notifications — always use these, never inline colored divs

#### `toast` — floating notification (bottom-right, auto-dismiss)
Use for: async action results (save, delete, API mutations, print).

```tsx
import { toast } from "@/components/ui/toast";

toast.success("บันทึกสำเร็จ");
toast.error("เกิดข้อผิดพลาด");
toast.info("กำลังดำเนินการ...");
toast.warning("คำเตือน");
// Custom duration (ms):
toast.error("ข้อความ", 8000);
```

`<Toaster />` is already mounted in `app/layout.tsx` — do **not** add it again.

#### `<Alert>` — inline persistent banner
Use for: validation errors, form-level feedback, persistent state warnings.

```tsx
import { Alert } from "@/components/ui/alert";

<Alert tone="error">กรุณาเลือก warehouse ก่อน</Alert>
<Alert tone="warning" onDismiss={() => setError("")}>{error}</Alert>
<Alert tone="success">อัปโหลดสำเร็จ</Alert>
<Alert tone="info" className="mt-2">ข้อมูลเพิ่มเติม</Alert>
```

Tones: `"success" | "error" | "info" | "warning"` — all match the violet/purple theme.

---

## Instructions for Agent
- Follow the tech stack strictly
- Do not introduce new libraries
- Keep UI and logic separated
- Always integrate with backend API properly
- Use `toast` / `<Alert>` for all notifications — never write inline `border-rose-200 bg-rose-50` divs

---

## Scope Rules (IMPORTANT — read first)

### Frontend Only
- Make changes to D:/Fork/pos-frontend ONLY
- Do NOT modify D:/Fork/pos-backend unless explicitly told to
- If a feature requires a backend endpoint that doesn't exist: implement with MOCK DATA in the frontend service (clearly comment // MOCK — replace when BE endpoint ready)

### No New npm Packages
Do not install new packages. Use only what is already in package.json.

---

## Shared Components — Use These, Don't Rebuild

| Component | Import | Use for |
|-----------|--------|---------|
| DateRangeFilter | @/components/shared/date-range-filter | Date range picker (today/7d/30d/custom) with Bangkok timezone |
| DrawerShell | @/components/warehouse/inventory/drawer-shell (or activity-logs variant) | Slide-in right drawer with backdrop + Esc close |
| ReportKpiCard | @/components/reports/report-kpi-card | KPI stat card with icon, label, value, hint |
| toast.success/error/info | @/components/ui/toast | All async action results — NEVER inline colored divs |
| Alert | @/components/ui/alert | Inline validation/persistent banners |
| ConfirmModal | Already in codebase | Confirmation dialogs |
| QueryErrorState | @/components/ui/query-error-state | Error states in queries |
| Skeleton | @/components/ui/skeleton | Loading states |

---

## Activity Center (components/activity-logs/)

The /settings/activity-logs page is a business Activity Center (V2). Key files:
- insight-provider.ts — InsightProvider seam. DETERMINISTIC (not AI). Honest Thai business language. Never label output "AI-generated". Future LLM implements same interface.
- restore-activity.ts — forward-only restore. Reapply changes.before through EXISTING update endpoints. NEVER reuse buildProductFormData/buildStoreUpdateFormData (destructive clear-flags). Only changed fields in FormData.
- RESTORABLE_KINDS: product/store/member/receipt_settings/promotion
- Related activities: per-drawer useQuery on resource_id (not limited to current page)
- Reuses: DrawerShell, ReportKpiCard, ConfirmModal — do NOT rebuild them

---

## Finance / Revenue Rules

- Loans (ยืมสินค้า): type='loan' in credit_sales. NOT revenue. Always exclude from finance aggregates.
- Documents (paperwork) ≠ revenue. Only sales table drives revenue figures.
- Credit sales (type='credit') = real AR. Loans = stock-borrow only.
- notLoanSaleSQL: NOT EXISTS (SELECT 1 FROM credit_sales cs WHERE cs.sale_id = s.id AND cs.type = 'loan') — this must be applied in any new finance query too

---

## Server-Side Pagination Pattern with Separate Stats Query

When a list uses server-side pagination (limit/page params to backend):
- Main query: paginated (limit=pageSize, page=currentPage) — for DISPLAY only
- Stats query: separate useQuery with limit=9999, staleTime:30_000 — for counts/KPIs only
- NEVER compute stats from the paginated results (will be wrong on page 2+)
- See stock-manager.tsx allProductsQuery for the reference implementation

---

## Document Rules

- Documents = paperwork only. statuses NOT counted in revenue/finance.
- PDF must use stored totals (toDocData()) — NEVER recompute VAT (causes discount-omitted + VAT-on-pre-discount bug)
- Copy-set: ?copy=N param, BFF must forward it
- Tax Invoice creation: POST /sales/:id/documents { type: "TAX_INVOICE" }

---

## Migration Reference (latest)

| Migration | What |
|-----------|------|
| 016 | activity_logs table |
| 019 | users.card_settings JSONB |
| 020 | expenses table |
| 033-035 | receive flow + default_location_id + auto-resolve |
| 041-042 | location-aware POS deduction + idempotency |
| 043 | ready_stock/storage_stock view |
| 046 | products.deleted_at (soft-delete) |
| 050 | customer shipping address |
| 052 | sale_returns + sale_return_items + returned_quantity |
| 054 | activity_logs.changes JSONB |
| 055 | TAX_INVOICE CreateFromSale |

<!-- END:nextjs-agent-rules -->

## Activity Center (`components/activity-logs/`)

The `/settings/activity-logs` page is a business **Activity Center** (timeline
cards + detail drawer + before/after diff + deterministic insights + forward-only
restore). Key pieces:
- `insight-provider.ts` — the `InsightProvider` seam. The deterministic provider is
  the production impl (numbers + prose derived from the data). **Honest business
  language only — never label output "AI-generated".** A future LLM implements the
  same interface; it enhances narration, never owns the calculation.
- `restore-activity.ts` — forward-only restore re-applies `changes.before` through
  the **existing** module update endpoints. Product/store updates are form-data with
  destructive clear-flags, so restore builds its own minimal FormData (only the
  changed fields) — do NOT reuse `buildProductFormData`/`buildStoreUpdateFormData`.
- Reuses `DrawerShell`, `ReportKpiCard`, `ConfirmModal` — don't rebuild them.
- All strings come from `dictionary.activityLogs` (th + en). Server pagination is
  the scale mechanism (no client virtual scroll).

## Doc Update Reminder (Auto)
At end of every Claude session that modifies this project:
1. Update memory/sessions/ with session summary
2. Update D:/POS/pos-obsidain-knowladge/POS/Features/<relevant>.md
3. Update 00-MOC/POS Features MOC.md Feature Status table
4. Update this AGENTS.md if new shared components / patterns added
