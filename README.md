# POS Frontend

Frontend for a Point of Sale (POS) web app, built with Next.js (App Router) and TypeScript.  
It supports multi-language (Thai/English) and integrates with the backend through Next.js Route Handlers (`/app/api/*`) as a backend-for-frontend proxy.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- TanStack Query
- Axios
- Tailwind CSS 4

## Core Features

- Authentication: login, register, logout
- Onboarding flow: `auth -> subscription -> setup/store -> workspace`
- Workspace: dashboard, sales, stock, customers, documents, settings
- Admin zone: admin, plans, users, stock
- i18n: Thai (`th`) and English (`en`) via `locales/*.json`
- Route protection in `proxy.ts` with cookies (`pos-access-token`, `pos-store-id`)

## File Structure

```markdown
.
├── app/
│   ├── [locale]/
│   │   ├── (user)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── subscription/
│   │   │   ├── setup/store/
│   │   │   └── (workspace)/
│   │   │       ├── dashboard/
│   │   │       ├── sales/
│   │   │       ├── stock/
│   │   │       ├── customers/
│   │   │       ├── documents/
│   │   │       └── settings/
│   │   └── (admin)/
│   │       └── admin/
│   └── api/                         # BFF proxy routes
├── components/                      # UI and feature modules
├── services/                        # API service layer
├── lib/                             # utilities, i18n, storage helpers
├── types/                           # shared TypeScript types
├── locales/                         # en.json, th.json
└── proxy.ts                         # route protection / redirects
```

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Required values:

```env
PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
API_BASE_URL=http://localhost:8080
```

- `API_BASE_URL`: backend base URL used by Route Handlers for forwarding requests
- `NEXT_PUBLIC_API_BASE_URL`: client-side fallback base URL when needed

## Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Available scripts:

- `npm run dev` - start dev server (`next dev --webpack`)
- `npm run dev:turbo` - start dev server with Turbo
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Main Routes

- `/` -> redirects to `/{locale}/login`
- `/{locale}/login`
- `/{locale}/register`
- `/{locale}/subscription`
- `/{locale}/setup/store`
- `/{locale}/dashboard`
- `/{locale}/sales`
- `/{locale}/stock`
- `/{locale}/customers`
- `/{locale}/documents`
- `/{locale}/settings`
- `/{locale}/admin/*`

Supported locales: `en` and `th` (default: `en`).

## API Layer (BFF Proxy)

The frontend calls same-origin endpoints such as:

- `/api/auth/login`
- `/api/stores`
- `/api/stores/:storeId/sales`

Route Handlers then forward those requests to the backend (`API_BASE_URL`) via `lib/api-proxy.ts`.  
This helps avoid CORS issues and keeps auth headers/cookies consistent.

## i18n

- Dictionaries live in `locales/en.json` and `locales/th.json`
- Locale config is in `lib/locale-config.ts`
- Dictionary loader is in `lib/i18n.ts`
- Avoid hardcoded UI text

## Development Notes

- This project uses both Server and Client Components, so watch for hydration mismatches
- For browser-only APIs (`window`, `localStorage`), access them inside `useEffect`
- Keep API logic in `services/` and keep route files thin
