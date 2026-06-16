"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { createWarehouse, updateWarehouse } from "@/services/warehouses";
import type { Warehouse } from "@/types/warehouse";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  warehouse: Warehouse | null;
  dict: WarehouseInventoryDictionary;
  onClose: () => void;
  onSaved: (warehouse: Warehouse) => void;
};

type FormState = {
  name: string;
  code: string;
  contact_name: string;
  phone: string;
  address: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  code: "",
  contact_name: "",
  phone: "",
  address: "",
  is_active: true,
};

export function WarehouseForm({ open, mode, warehouse, dict, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && warehouse) {
      setForm({
        name: warehouse.name ?? "",
        code: warehouse.code ?? "",
        contact_name: warehouse.contact_name ?? "",
        phone: warehouse.phone ?? "",
        address: warehouse.address ?? "",
        is_active: warehouse.is_active,
      });
    } else {
      setForm(emptyForm);
    }
    setNameError(false);
    const t = window.setTimeout(() => nameRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, mode, warehouse, onClose]);

  if (!open) return null;

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  async function handleSubmit() {
    if (!form.name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        is_active: form.is_active,
      };
      const result =
        mode === "edit" && warehouse
          ? await updateWarehouse(warehouse.id, payload)
          : await createWarehouse(payload);
      toast.success(mode === "edit" ? dict.updatedToast : dict.createdToast);
      onSaved(result.data);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : dict.saveError);
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "edit" ? dict.formEditTitle : dict.formCreateTitle;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.formCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <Field label={dict.fieldName} required>
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => {
                patch({ name: e.target.value });
                if (nameError) setNameError(false);
              }}
              className={inputClass(nameError)}
            />
            {nameError ? <p className="mt-1 text-xs text-rose-500">{dict.nameRequired}</p> : null}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={dict.fieldCode}>
              <input
                value={form.code}
                disabled={mode === "edit"}
                onChange={(e) => patch({ code: e.target.value })}
                placeholder={dict.fieldCodePlaceholder}
                className={`${inputClass(false)} ${mode === "edit" ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""}`}
              />
            </Field>
            <Field label={dict.fieldContact}>
              <input value={form.contact_name} onChange={(e) => patch({ contact_name: e.target.value })} className={inputClass(false)} />
            </Field>
          </div>

          <Field label={dict.fieldPhone}>
            <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} className={inputClass(false)} />
          </Field>

          <Field label={dict.fieldAddress}>
            <textarea rows={3} value={form.address} onChange={(e) => patch({ address: e.target.value })} className={`${inputClass(false)} resize-none`} />
          </Field>

          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => patch({ is_active: !form.is_active })}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50"
          >
            <span className="text-sm font-semibold text-slate-700">{dict.fieldActive}</span>
            <span className={`relative h-6 w-11 rounded-full transition ${form.is_active ? "bg-violet-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.is_active ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>

          <p className="rounded-xl bg-violet-50/60 px-3 py-2.5 text-xs leading-relaxed text-violet-700">{dict.zoneHelper}</p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {dict.formCancel}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {saving ? dict.saving : mode === "edit" ? dict.formSaveEdit : dict.formSaveCreate}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function inputClass(error: boolean): string {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 ${
    error
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-violet-400 focus:ring-violet-100"
  }`;
}
