"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Combobox-style page-size selector.
 * Replaces native <select> which has popup positioning issues
 * inside scroll containers on iPad/iOS.
 *
 * Minimal ghost style — no border, just hover/focus bg.
 * Designed to sit inside a card footer without visual noise.
 */
export function PageSizeDropdown({
  value,
  options,
  perPageLabel,
  onChange,
}: {
  value: number;
  options: number[];
  perPageLabel: string;
  onChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 outline-none transition-colors hover:bg-violet-50 hover:text-violet-700 focus:ring-2 focus:ring-violet-100"
      >
        <span className="tabular-nums font-medium text-slate-700">{value}</span>
        <span className="text-xs">{perPageLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-1.5 min-w-[130px] overflow-hidden rounded-xl border border-violet-100 bg-white py-1 shadow-lg ring-1 ring-violet-100/50">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                n === value
                  ? "bg-violet-50 font-medium text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="tabular-nums">{n} {perPageLabel}</span>
              {n === value && <Check className="h-3.5 w-3.5 text-violet-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
