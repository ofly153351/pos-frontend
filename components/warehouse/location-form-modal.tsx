"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import type { Warehouse } from "@/types/warehouse";
import type { Location } from "@/services/locations";
import type { StorageLocationDictionary, LocationForm, DerivedZone } from "./storage-location-types";

// ── Combobox ──────────────────────────────────────────────────────────────────
function Combobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const query    = value.toLowerCase();
  const filtered = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  const isNew    = value.trim() !== "" && !options.some((o) => o.toLowerCase() === query);
  const showList = open && (filtered.length > 0 || isNew);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          value={value}
          placeholder={placeholder}
          className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <button
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-violet-500"
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
          type="button"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown */}
      {showList && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-violet-100 bg-white shadow-lg">
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((opt) => {
              const selected = opt === value;
              return (
                <li key={opt}>
                  <button
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
                      ${selected
                        ? "bg-violet-50 font-semibold text-violet-700"
                        : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"}`}
                    onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                    type="button"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full
                      ${selected ? "bg-violet-600" : "border border-slate-200 bg-white"}`}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    {opt}
                  </button>
                </li>
              );
            })}

            {/* "Create new" row */}
            {isNew && (
              <li className={filtered.length > 0 ? "border-t border-violet-50 pt-0.5" : ""}>
                <button
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-violet-600 hover:bg-violet-50"
                  onMouseDown={(e) => { e.preventDefault(); select(value); }}
                  type="button"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-violet-400">
                    <Plus className="h-2.5 w-2.5 text-violet-500" />
                  </span>
                  <span className="text-slate-400">New:</span>
                  <span className="font-semibold">"{value}"</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingLocation: Location | null;
  form: LocationForm;
  setField: <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => void;
  formError: string;
  isPending: boolean;
  onSave: () => void;
  warehouses: Warehouse[];
  tree: DerivedZone[];
  dictionary: StorageLocationDictionary;
};

export function LocationFormModal({
  isOpen, onClose, editingLocation, form, setField, formError, isPending, onSave,
  warehouses, tree, dictionary,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zoneOptions  = tree.map((z) => z.name).filter(Boolean);
  const floorOptions = (tree.find((z) => z.name === form.zone_name)?.floors ?? [])
    .map((f) => f.name)
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {editingLocation ? dictionary.editModalTitle : dictionary.addModalTitle}
          </h2>
          <button className="rounded-xl p-1.5 text-slate-400 hover:bg-violet-50" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Warehouse */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formWarehouse} *</label>
            <select
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={form.warehouse_id}
              onChange={(e) => setField("warehouse_id", e.target.value)}
            >
              <option value="">{dictionary.filterWarehousePlaceholder}</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Zone / Floor comboboxes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formZone}</label>
              <Combobox
                value={form.zone_name}
                onChange={(v) => setField("zone_name", v)}
                options={zoneOptions}
                placeholder="A"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formFloor}</label>
              <Combobox
                value={form.floor_name}
                onChange={(v) => setField("floor_name", v)}
                options={floorOptions}
                placeholder="A01"
              />
            </div>
          </div>

          {/* Code / Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formCode} *</label>
              <input
                className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder={dictionary.formCodeHint}
                value={form.code}
                onChange={(e) => setField("code", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{dictionary.formName} *</label>
              <input
                className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder={dictionary.formName}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2.5">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${form.is_active ? "bg-violet-600" : "bg-slate-300"}`}
                onClick={() => setField("is_active", !form.is_active)}
                role="switch"
                aria-checked={form.is_active}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">{dictionary.formActive}</span>
            </label>
            <label className="flex items-center gap-2.5">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${form.is_sale_point ? "bg-violet-600" : "bg-slate-300"}`}
                onClick={() => setField("is_sale_point", !form.is_sale_point)}
                role="switch"
                aria-checked={form.is_sale_point}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_sale_point ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">{dictionary.formSalePoint}</span>
            </label>
          </div>

          {formError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            onClick={onClose}
            type="button"
          >
            {dictionary.cancelButton}
          </button>
          <button
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            disabled={isPending}
            onClick={onSave}
            type="button"
          >
            {isPending ? dictionary.savingButton : dictionary.saveButton}
          </button>
        </div>
      </div>
    </div>
  );
}
