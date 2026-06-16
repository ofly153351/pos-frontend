"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, MapPin, Search, Warehouse as WarehouseIcon } from "lucide-react";

import type { Warehouse } from "@/types/warehouse";
import { formatNumber } from "./utils";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  warehouses: Warehouse[];
  value: string;
  onChange: (id: string) => void;
  dict: WarehouseInventoryDictionary;
  locationCount: number;
  productCount: number | null;
  disabled?: boolean;
};

export function WarehouseSelector({
  warehouses,
  value,
  onChange,
  dict,
  locationCount,
  productCount,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => warehouses.find((w) => w.id === value) ?? null, [warehouses, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.code ?? "").toLowerCase().includes(q),
    );
  }, [warehouses, search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full sm:max-w-md">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={dict.selectorLabel}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 disabled:opacity-50"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <WarehouseIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {dict.selectorLabel}
          </span>
          {selected ? (
            <>
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-900">{selected.name}</span>
                {selected.code ? (
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                    {selected.code}
                  </span>
                ) : null}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    selected.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {selected.is_active ? dict.statusActive : dict.statusInactive}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {formatNumber(locationCount)} {dict.locationsUnit}
                {productCount != null ? (
                  <span className="text-slate-300"> · {formatNumber(productCount)} {dict.productsUnit}</span>
                ) : null}
              </span>
            </>
          ) : (
            <span className="block truncate text-sm font-semibold text-slate-400">
              {warehouses.length === 0 ? dict.noWarehouses : dict.selectorPlaceholder}
            </span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={dict.searchWarehousePlaceholder}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">{dict.noWarehouseResults}</li>
            ) : (
              filtered.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={w.id === value}
                    onClick={() => {
                      onChange(w.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-violet-50 ${
                      w.id === value ? "bg-violet-50/60" : ""
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {w.id === value ? <Check className="h-4 w-4 text-violet-600" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{w.name}</span>
                    {w.code ? <span className="shrink-0 font-mono text-[11px] text-slate-400">{w.code}</span> : null}
                    {!w.is_active ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {dict.statusInactive}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
