"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

// Cap rendered rows so a large list never mounts as one giant list.
const MAX_RESULTS = 50;

export type EntityComboboxItem = {
  id: string;
  /** Primary label (shown bold). */
  label: string;
  /** Secondary text under the label (member code / phone / …). */
  subtitle?: string;
  /** Small right-aligned badge (e.g. "L1 • 5%"). */
  badge?: string;
  /** Extra keywords matched by search in addition to label/subtitle. */
  keywords?: string[];
};

export type EntityComboboxLabels = {
  placeholder: string;
  noResults: string;
};

type Props = {
  items: EntityComboboxItem[];
  value: string;
  onChange: (id: string) => void;
  labels: EntityComboboxLabels;
  /** Renders an extra pinned row at the end of the dropdown (e.g. "+ create new"). */
  footerOption?: { id: string; label: string; onPick: () => void };
  /** Optional wrapper class for the trigger + dropdown container. */
  className?: string;
  /** Show a small ✕ on the selected value to clear it. */
  clearable?: boolean;
  disabled?: boolean;
};

// Generic searchable picker — the shared combobox for entity lists (customers,
// suppliers, brands, categories, PO numbers). Type-ahead on label/subtitle/
// keywords, ↑/↓ + Enter keyboard nav, capped at MAX_RESULTS rendered rows.
// Replaces native <select>s whose option list is long, dynamic data.
export function EntityCombobox({
  items,
  value,
  onChange,
  labels,
  footerOption,
  className = "",
  clearable = false,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => items.find((it) => it.id === value) ?? null,
    [items, value],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [it.label, it.subtitle ?? "", ...(it.keywords ?? [])]
        .join("\n")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches]);
  // footer option participates in keyboard nav as the last row
  const rowCount = results.length + (footerOption ? 1 : 0);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the search input whenever the dropdown opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (footerOption && active === results.length) {
        footerOption.onPick();
        setOpen(false);
        setQuery("");
      } else if (results[active]) {
        choose(results[active].id);
      }
    } else if (e.key === "Escape") {
      // If the dropdown is open, Escape closes just the dropdown — stop the
      // event from bubbling to document-level Escape handlers (e.g. parent
      // modals that would close themselves over the picker).
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      {selected && !open ? (
        // Selected state — a compact chip; click to search/change.
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition hover:border-violet-300 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{selected.label}</span>
              {selected.subtitle ? (
                <span className="block truncate text-xs text-slate-400">{selected.subtitle}</span>
              ) : null}
            </span>
            {selected.badge ? (
              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                {selected.badge}
              </span>
            ) : null}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {clearable && selected ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="clear"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                ×
              </span>
            ) : null}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            disabled={disabled}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={labels.placeholder}
            value={query}
          />
        </div>
      )}

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length === 0 && !footerOption ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">{labels.noResults}</div>
          ) : (
            <>
              {results.map((it, i) => (
                <button
                  key={`${it.id}-${i}`}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(it.id);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition ${
                    i === active ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{it.label}</span>
                    {it.subtitle ? (
                      <span className="block truncate text-xs text-slate-500">{it.subtitle}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {it.badge ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                        {it.badge}
                      </span>
                    ) : null}
                    {it.id === value ? <Check className="h-4 w-4 text-violet-600" /> : null}
                  </span>
                </button>
              ))}
              {footerOption ? (
                <button
                  type="button"
                  onMouseEnter={() => setActive(results.length)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    footerOption.onPick();
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2 border-t border-slate-100 px-3 py-3 text-left text-sm font-medium text-violet-600 transition ${
                    active === results.length ? "bg-violet-50" : "hover:bg-violet-50"
                  }`}
                >
                  {footerOption.label}
                </button>
              ) : null}
              {matches.length > MAX_RESULTS ? (
                <div className="px-3 py-2 text-center text-[11px] text-slate-400">
                  {results.length} / {matches.length}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
