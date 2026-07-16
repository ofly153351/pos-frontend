"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";

import type { WarehouseAction } from "./warehouse-action-bar";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  dict: WarehouseInventoryDictionary;
  actions: WarehouseAction[];
};

// Sticky bottom bar for narrow viewports: the primary action stays inline; the rest
// open in a bottom sheet. Hidden at md+ where the full toolbar is shown.
export function MobileWarehouseActions({ dict, actions }: Props) {
  const [open, setOpen] = useState(false);
  const primary = actions.find((a) => a.primary);
  const rest = actions.filter((a) => !a.primary);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {primary ? (
          <button
            type="button"
            onClick={primary.onClick}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white active:bg-violet-700"
          >
            <primary.icon className="h-4 w-4" />
            {primary.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={dict.moreActions}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 ${primary ? "" : "flex-1"}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          {!primary ? dict.moreActions : null}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" role="dialog" aria-modal="true" aria-label={dict.moreActions}>
          <button type="button" aria-label={dict.close} onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] motion-safe:animate-[slideUp_0.2s_ease-out]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{dict.moreActions}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label={dict.close} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {rest.map(({ key, label, icon: Icon, onClick }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 active:bg-violet-50"
                >
                  <Icon className="h-4 w-4 text-violet-600" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <style jsx global>{`
            @keyframes slideUp {
              from {
                transform: translateY(16px);
                opacity: 0.7;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
