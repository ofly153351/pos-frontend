"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, User } from "lucide-react";

import type { Customer } from "@/types/customer";

// Cap rendered rows so a large customer book never mounts as one giant list.
const MAX_RESULTS = 50;

export type CustomerComboboxLabels = {
  placeholder: string;
  noResults: string;
};

// Searchable customer picker (name / phone / member code) — replaces the plain
// native <select> so a shop with hundreds of customers can type-ahead instead of
// scrolling. Mirrors the ProductCombobox interaction model for consistency.
export function CustomerCombobox({
  customers,
  value,
  onChange,
  labels,
}: {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  labels: CustomerComboboxLabels;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => customers.find((c) => c.id === value) ?? null,
    [customers, value],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.member_code ?? "").toLowerCase().includes(q),
    );
  }, [customers, query]);

  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(c: Customer) {
    onChange(c.id);
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
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) choose(results[active]);
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

  function subtitle(c: Customer): string {
    return [c.member_code, c.phone].filter(Boolean).join(" · ");
  }

  return (
    <div ref={boxRef} className="relative">
      {selected && !open ? (
        // Selected state — a compact chip; click to search/change.
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm outline-none transition hover:border-violet-300 focus:border-violet-500"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <User className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{selected.full_name}</span>
              {subtitle(selected) ? (
                <span className="block truncate text-xs text-slate-400">{subtitle(selected)}</span>
              ) : null}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus={open}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
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
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">{labels.noResults}</div>
          ) : (
            <>
              {results.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                    i === active ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{c.full_name}</span>
                    <span className="block truncate text-xs text-slate-500">{subtitle(c) || "—"}</span>
                  </span>
                  {c.id === value ? <Check className="h-4 w-4 shrink-0 text-violet-600" /> : null}
                </button>
              ))}
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
