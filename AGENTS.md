AGENTS.md — POS Frontend
1. Project
- Frontend of a POS (Point of Sale) web application.
- Stack: Next.js App Router, TypeScript (strict), Zustand, TanStack Query, i18n.
- Functional components only; keep route files thin and separate UI from logic.
- Reuse existing code and components; avoid unnecessary re-renders.
2. Scope and Dependencies
- Modify D:/Fork/pos-frontend only.
- Do not modify pos-backend unless explicitly instructed.
- Do not install new npm packages; use dependencies already in package.json.
- If a required backend endpoint does not exist, use clearly marked frontend mock data:
  // MOCK — replace when BE endpoint ready.
3. i18n
- All UI text must support Thai and English; do not hardcode UI strings.
- Use /locales/th.json and /locales/en.json.
- Default language: English.
4. Architecture
- Global state (auth, user, shared UI state) belongs in Zustand; avoid React Context for global state.
- Use TanStack Query for server state: queries for GET, mutations for POST/PUT/DELETE.
- Handle loading and error states.
- Centralize API integration in /services; use an Axios or fetch wrapper and attach auth tokens through the shared interceptor.
- Prefer Next.js Route Handlers as a BFF proxy when browser CORS prevents direct API calls.
- Keep shared types in /types, browser storage/helpers in /lib, and reusable hooks in /hooks.
- Organize routes under /app/[locale], using (user) and (admin) route groups where appropriate.
- Middleware must protect authenticated routes and enforce role-based access.
- Onboarding order: auth → subscription → store setup → workspace. Keep auth UI in /components/auth.
5. UI/UX Design System
- Prioritize fast POS workflows, clear hierarchy, compact layouts, and mobile responsiveness.
- Follow the existing POS Today violet/purple theme in /theme/theme.css and /theme/theme-components.html.
- Primary: #7C3AED (violet-600); sidebar: #1E1B4B (indigo-950).
- Use the violet-tinted page background, white cards with violet borders, violet input focus states, and the documented sidebar states.
- sky-* Tailwind utilities are remapped to violet in globals.css; do not remap them again.
- Keep danger/error red, success emerald, and warning amber.
- Use Sarabun for Thai-compatible UI and JetBrains Mono for code/numeric displays.
- Use purposeful, consistent transitions for drawers, modals, menus, and toggles.
- Every popup, modal, and drawer must close with Escape.
- Avoid hydration mismatches: keep initial server/client markup deterministic, defer browser-only state to useEffect, and use valid HTML nesting.
6. Shared Components and Feedback
- Reuse existing components; do not rebuild equivalents:
  - DateRangeFilter: @/components/shared/date-range-filter
  - DrawerShell: @/components/warehouse/inventory/drawer-shell (or activity-logs variant)
  - ReportKpiCard: @/components/reports/report-kpi-card
  - ConfirmModal, QueryErrorState, and Skeleton from the existing codebase.
- Async action feedback (save/delete/API/print): use toast from @/components/ui/toast.
- Persistent validation or state feedback: use <Alert> from @/components/ui/alert.
- <Toaster /> is already mounted in app/layout.tsx; do not add another.
- Never use inline colored notification/banner divs in place of toast or <Alert>.
7. Business-Critical Rules
- Loans (credit_sales.type = 'loan') are stock-borrow records, not revenue; exclude them from every finance aggregate.
- Credit sales (type = 'credit') are real accounts receivable.
- Documents/paperwork are not revenue. Revenue figures must be driven by the sales table.
- Finance queries involving sales must exclude loans using:
  NOT EXISTS (SELECT 1 FROM credit_sales cs WHERE cs.sale_id = s.id AND cs.type = 'loan').
- Documents are paperwork only; document statuses must not be counted as revenue.
- PDF generation must use stored totals from toDocData(); never recalculate VAT.
- Preserve ?copy=N through the BFF.
- Tax Invoice creation: POST /sales/:id/documents with { type: "TAX_INVOICE" }.
7b. P1 Shared Helpers and Rules (owner-approved 2026-11-04)
- Business dates: use lib/business-date.ts (todayBusinessDate, toBusinessDate, formatBusinessDate). Never use toISOString().slice(0, 10) or the browser timezone for business dates.
- API errors: use friendlyMessage / setFromApiError / showApiError from lib/form-errors (backed by lib/api-error.ts). They translate backend field codes, HTTP statuses and 409 details.reason through the apiErrors section of th.json and en.json. 400/409/422 show as warnings. Do not show raw backend text, and do not hard-code Thai or English fallbacks.
- Below-cost prices: warn and confirm (lib/price-checks.ts). Never block.
- Payments: always go through the confirmed PaymentDialog (POST /documents/:id/payments with an Idempotency-Key). Never flip payment flags.
- Credit notes: issue them from the original document with a reason (CreditReasonModal). Never create standalone credit notes.
- Loans (credit_sales.type='loan') are goods. Never add them to money totals.
- Previews: never combine allow-scripts with allow-same-origin. Use lib/preview-bridge.ts (withPreviewBridge, printPreviewFrame, PREVIEW_SANDBOX_SCRIPTS) and talk to frames only via postMessage. Inert pages use sandbox="".
- Identity placeholders: render skeletons until real store/user data loads. Never show fake names.

8. Data and Pagination
- For server-paginated lists, use the paginated query only for display.
- Fetch stats separately (reference: stock-manager.tsx allProductsQuery) with limit=9999 and staleTime: 30_000.
- Never calculate totals, counts, or KPIs from the current page's rows.
9. Activity Center
- /settings/activity-logs is a business Activity Center: timeline, detail drawer, before/after diff, deterministic insights, and forward-only restore.
- insight-provider.ts is deterministic and derives figures/prose from data. Never describe its output as AI-generated.
- A future LLM may implement the same interface for narration only; calculations remain data-derived.
- restore-activity.ts must reapply changes.before through existing update endpoints.
- For product/store FormData restores, build minimal FormData containing only changed fields. Do not reuse destructive buildProductFormData or buildStoreUpdateFormData.
- Related activities use a per-drawer query by resource_id; reuse DrawerShell, ReportKpiCard, and ConfirmModal.
- All Activity Center strings belong in dictionary.activityLogs (Thai and English). Use server pagination; do not add client virtual scrolling.
10. Documentation
At the end of each session that modifies this project:
1. Add a session summary under memory/sessions/.
2. Update the relevant file under D:/POS/pos-obsidain-knowladge/POS/Features/.
3. Update 00-MOC/POS Features MOC.md Feature Status table.
4. Update this AGENTS.md if shared components or project-wide patterns changed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
