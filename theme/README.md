# POS Today — Design System

## Files

| File | Purpose |
|---|---|
| `theme.css` | Master CSS custom property tokens |
| `theme-components.html` | Full component showcase (open in browser) |

## Quick Start

```css
/* Import in any CSS file */
@import '/theme/theme.css';
```

Already imported globally via `app/globals.css`.

## Token Groups

### Brand
```css
var(--color-brand-primary)       /* #7C3AED violet-600 — buttons, links */
var(--color-brand-deep)          /* #6D28D9 violet-700 — hover states */
var(--color-brand-accent)        /* #EC4899 pink-500  — gradient end, badges */
var(--color-brand-gradient)      /* violet → pink, 135° — CTAs, table headers */
```

### Navigation (Sidebar)
```css
var(--color-nav-bg)              /* #1E1B4B indigo-950 */
var(--color-nav-hover)           /* #312E81 indigo-900 */
var(--color-nav-active)          /* #4C1D95 violet-900 */
var(--color-nav-text)            /* #C4B5FD violet-300 */
```

### Semantic
```css
var(--color-success)             /* #10B981 */
var(--color-warning)             /* #F59E0B */
var(--color-danger)              /* #EF4444 */
var(--color-info)                /* #3B82F6 */
```

### Tailwind Mapping

`sky-*` utilities are remapped to violet in `globals.css @theme inline`:

| Old class | Renders as |
|---|---|
| `bg-sky-600` | violet-600 (`#7C3AED`) |
| `border-sky-300` | violet-300 (`#C4B5FD`) |
| `text-sky-700` | violet-700 (`#6D28D9`) |
| `ring-sky-100` | violet-100 (`#ede9fe`) |

Existing components using `sky-*` automatically render in violet — no code changes needed.

## Gradient Usage Rules

Use gradient **only** on:
- Sidebar header / logo area
- Primary CTA buttons
- KPI icon boxes
- Table header row

**Never** on: body text, form labels, page backgrounds, card bodies.

## Dark Mode

Toggle by setting `data-theme="dark"` on `<html>`. All tokens override automatically.

```js
document.documentElement.setAttribute('data-theme', 'dark');
```
