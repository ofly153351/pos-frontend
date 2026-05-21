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
| Brand gradient | violet → pink 135° | `bg-gradient-to-br from-violet-600 to-pink-500` |
| Sidebar bg | `#1E1B4B` | `indigo-950` |
| Page bg | violet-tinted white | `bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_35%,_#f8fafc_100%)]` |
| Card | white + violet border | `bg-white border border-violet-100 shadow-sm rounded-xl` |
| Input border | `border-violet-200` focus: `border-violet-400 ring-2 ring-violet-100` |
| Section/table bg | `bg-violet-50/40` |

**Tailwind mapping:** `sky-*` utilities are remapped to violet in `globals.css` via `@theme inline`. All `sky-*` classes render as violet automatically.

**Buttons:**
- Primary / CTA: `bg-gradient-to-br from-violet-600 to-pink-500 text-white hover:from-violet-700 hover:to-pink-600`
- Secondary / outline: `border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`
- Ghost / text: `text-violet-600 hover:bg-violet-50`
- Danger: keep red (`bg-red-600`, `text-red-600`) — do NOT change

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
- Avatar / initials: `bg-gradient-to-br from-violet-600 to-pink-500 text-white`

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

## Instructions for Agent
- Follow the tech stack strictly
- Do not introduce new libraries
- Keep UI and logic separated
- Always integrate with backend API properly
<!-- END:nextjs-agent-rules -->
