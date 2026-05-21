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
The design system has migrated from white-blue to **violet/purple**. Token file: `/theme/theme.css`. Showcase: `/theme/theme-components.html`.

**Core palette:**
| Role | Value | Tailwind (remapped) |
|---|---|---|
| Brand primary | `#7C3AED` | `sky-600` (remapped → violet-600) |
| Brand gradient | violet → pink 135° | use `bg-gradient-to-br from-violet-600 to-pink-500` |
| Sidebar bg | `#1E1B4B` | `indigo-950` |
| Page bg | `#F9FAFB` | `gray-50` / `slate-50` |
| Card | `#FFFFFF` | `white` |

**Tailwind mapping:** `sky-*` utilities are remapped to violet in `globals.css` via `@theme inline`. All existing `sky-*` classes automatically render as violet — no need to change them.

**Rules:**
- Primary buttons: `bg-sky-600` (renders violet) or `bg-gradient-to-br from-violet-600 to-pink-500`
- Sidebar: `bg-indigo-950` with `text-violet-300` nav items
- Active nav: `bg-violet-900` with 3px left border `border-violet-400`
- Focus rings: `ring-2 ring-violet-300` or `shadow-focus` CSS var
- Gradients only on: sidebar header, CTA buttons, KPI icon boxes, table header
- Cards: `bg-white border border-gray-200 shadow-sm rounded-xl` (or `rounded-2xl`)
- Fonts: `Sarabun` (Thai-compatible) loaded in `globals.css`

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

## Instructions for Agent
- Follow the tech stack strictly
- Do not introduce new libraries
- Keep UI and logic separated
- Always integrate with backend API properly
<!-- END:nextjs-agent-rules -->
