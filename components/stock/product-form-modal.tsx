"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import type {
  ManagementDictionary,
  ProductFormLabels,
} from "@/components/stock/types";
import { StorageAssignmentCard } from "@/components/stock/storage-assignment-card";
import type {
  ProductBrand,
  ProductInput,
  ProductType,
  ProductUnit,
} from "@/types/product";

type ProductFormDrawerProps = {
  closeLabel: string;
  formLabels: ProductFormLabels;
  formState: ProductInput;
  isOpen: boolean;
  isPending: boolean;
  isEditing: boolean;
  managementDictionary: ManagementDictionary;
  onClose: () => void;
  onFormStateChange: (updater: (current: ProductInput) => ProductInput) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  productBrands: ProductBrand[];
  productTypes: ProductType[];
  quickActionLabel: string;
  supplierOptions: { id: string; name: string }[];
  unitOptions: ProductUnit[];
};

type ProductFieldProps = {
  badgeTone?: "optional" | "required";
  badgeText?: string;
  children: ReactNode;
  label: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

function ProductSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <h3 className="mb-3 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({
  children,
  defaultOpen = false,
  hint,
  optionalText,
  summary,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  hint?: string;
  optionalText?: string;
  summary?: ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-100/60 md:px-5"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span>{title}</span>
            {optionalText ? (
              <span className="text-xs font-normal text-slate-400">({optionalText})</span>
            ) : null}
          </h3>
          {summary ? (
            <div className="mt-0.5 truncate text-xs text-slate-500">{summary}</div>
          ) : hint && !open ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{hint}</p>
          ) : null}
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="px-4 pb-4 md:px-5 md:pb-5">{children}</div> : null}
    </section>
  );
}

// Always-visible labelled subsection INSIDE the main card (divider + header, no collapse).
function FormSubsection({
  children,
  hint,
  optionalText,
  title,
}: {
  children: ReactNode;
  hint?: string;
  optionalText?: string;
  title: string;
}) {
  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {optionalText ? (
          <span className="text-xs font-normal text-slate-400">({optionalText})</span>
        ) : null}
      </div>
      {hint ? <p className="-mt-1 mb-3 text-xs text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

function ProductField({
  badgeText,
  badgeTone = "optional",
  children,
  label,
}: ProductFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {badgeText ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              badgeTone === "required"
                ? "bg-violet-100 text-violet-700"
                : "bg-violet-100 text-violet-700"
            }`}
          >
            {badgeText}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function ProductTextInput({
  badgeText,
  badgeTone,
  label,
  min,
  onChange,
  placeholder,
  step,
  type,
  value,
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  type?: "number" | "text";
  value?: string;
}) {
  return (
    <ProductField badgeText={badgeText} badgeTone={badgeTone} label={label}>
      <input
        className={inputClass}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        step={step}
        type={type ?? "text"}
        value={value ?? ""}
      />
    </ProductField>
  );
}

function ProductSelectField({
  badgeText,
  badgeTone,
  label,
  noResultsLabel = "ไม่พบรายการ",
  onChange,
  options: opts,
  value,
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  label: string;
  noResultsLabel?: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(() => opts.find((o) => o.id === value)?.name ?? "");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return opts;
    const q = search.toLowerCase();
    return opts.filter((o) => o.name.toLowerCase().includes(q));
  }, [opts, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the visible text to the selected value when value/options change
    setSearch(opts.find((o) => o.id === value)?.name ?? "");
  }, [value, opts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <ProductField badgeText={badgeText} badgeTone={badgeTone} label={label}>
      <div className="relative" ref={ref}>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          onChange={(e) => {
            setSearch(e.target.value);
            onChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={label}
          value={search}
        />
        {open && opts.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-slate-400">{noResultsLabel}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-violet-50 ${
                    opt.id === value ? "bg-violet-50 font-medium text-violet-700" : "text-slate-700"
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setSearch(opt.name);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {opt.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </ProductField>
  );
}

function ProductNativeSelectField({
  badgeText,
  badgeTone,
  disabled = false,
  emptyLabel,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  disabled?: boolean;
  emptyLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  value: string;
}) {
  return (
    <ProductField badgeText={badgeText} badgeTone={badgeTone} label={label}>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">{disabled ? emptyLabel : placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </ProductField>
  );
}

function ProductFileField({
  badgeText,
  badgeTone,
  label,
  onChange,
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <ProductField badgeText={badgeText} badgeTone={badgeTone} label={label}>
      <input
        className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:text-sm file:font-medium file:text-violet-700 focus:border-violet-500"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
    </ProductField>
  );
}

// Compact status toggle field (grid cell) — synced to the same is_active as the header toggle.
function ProductStatusField({
  activeText,
  inactiveText,
  label,
  onToggle,
  value,
}: {
  activeText: string;
  inactiveText: string;
  label: string;
  onToggle: () => void;
  value: boolean;
}) {
  return (
    <div className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">{label}</span>
      <button
        aria-checked={value}
        className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition ${
          value ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
        }`}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span className={`text-sm font-medium ${value ? "text-emerald-700" : "text-slate-500"}`}>
          {value ? activeText : inactiveText}
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            value ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

function POSPreviewCard({
  formState,
  productTypes,
  posStatusActive,
  posStatusInactive,
  unitOptions,
}: {
  formState: ProductInput;
  productTypes: ProductType[];
  posStatusActive: string;
  posStatusInactive: string;
  unitOptions: ProductUnit[];
}) {
  const imageUrl = useMemo(
    () => (formState.image ? URL.createObjectURL(formState.image) : null),
    [formState.image],
  );

  useEffect(() => {
    if (!imageUrl) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const categoryName = productTypes.find((t) => t.id === formState.product_type_id)?.name;
  const unitName = unitOptions.find((u) => u.id === formState.unit_id)?.name;

  const formattedPrice = useMemo(() => {
    const n = Number(formState.base_price);
    if (!formState.base_price || Number.isNaN(n)) return "฿0";
    return new Intl.NumberFormat("th-TH", { currency: "THB", minimumFractionDigits: 0, style: "currency" }).format(n);
  }, [formState.base_price]);

  const specialFormattedPrice = useMemo(() => {
    const n = Number(formState.special_price);
    if (!formState.special_price || Number.isNaN(n) || n <= 0) return null;
    return new Intl.NumberFormat("th-TH", { currency: "THB", minimumFractionDigits: 0, style: "currency" }).format(n);
  }, [formState.special_price]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="relative aspect-square bg-gradient-to-br from-violet-50 to-slate-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-5xl font-black text-slate-200">
                {formState.name ? formState.name.slice(0, 2).toUpperCase() : "—"}
              </span>
            </div>
          )}
          <div className="absolute right-2 top-2">
            {formState.is_active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {posStatusActive}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {posStatusInactive}
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          {categoryName ? (
            <span className="mb-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              {categoryName}
            </span>
          ) : null}
          <p className="line-clamp-2 font-semibold leading-relaxed text-slate-900">
            {formState.name || <span className="text-slate-300">—</span>}
          </p>
          {formState.sku ? (
            <p className="mt-0.5 font-mono text-xs text-slate-400">{formState.sku}</p>
          ) : null}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              {specialFormattedPrice ? (
                <>
                  <p className="text-xl font-bold text-violet-700">{specialFormattedPrice}</p>
                  <p className="text-xs text-slate-400 line-through">{formattedPrice}</p>
                </>
              ) : (
                <p className="text-xl font-bold text-violet-700">{formattedPrice}</p>
              )}
            </div>
            {unitName ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                /{unitName}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {formState.barcode || formState.sku ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-xs text-slate-500">{formState.barcode ?? formState.sku}</p>
        </div>
      ) : null}
    </div>
  );
}

export function ProductFormDrawer({
  closeLabel,
  formLabels,
  formState,
  isEditing,
  isOpen,
  isPending,
  onClose,
  onFormStateChange,
  onSubmit,
  productBrands,
  productTypes,
  quickActionLabel,
  supplierOptions,
  unitOptions,
}: ProductFormDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const posPreviewLabel = formLabels.posPreviewLabel ?? "POS Preview";
  const posStatusActive = formLabels.posStatusActive ?? "Active";
  const posStatusInactive = formLabels.posStatusInactive ?? "Inactive";
  const isActive = Boolean(formState.is_active);
  const optionalText = formLabels.optionalLabel;
  const toggleActive = () =>
    onFormStateChange((current) => ({ ...current, is_active: !current.is_active }));

  const previewCard = (
    <POSPreviewCard
      formState={formState}
      posStatusActive={posStatusActive}
      posStatusInactive={posStatusInactive}
      productTypes={productTypes}
      unitOptions={unitOptions}
    />
  );

  return (
    <div className="w-full">
      {/* Page header — compact */}
      <div className="mb-4 rounded-2xl bg-violet-700 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <button
            aria-label={closeLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            onClick={onClose}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {quickActionLabel}
            </p>
            <h1 className="text-xl font-semibold">
              {isEditing ? formLabels.titleEdit : formLabels.titleCreate}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs font-medium uppercase tracking-wide text-white/60 sm:block">
              {isActive ? posStatusActive : posStatusInactive}
            </span>
            <button
              aria-checked={isActive}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                isActive ? "bg-white/90" : "bg-white/20"
              }`}
              onClick={toggleActive}
              role="switch"
              type="button"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        {/* Mobile / tablet preview — collapsible summary (hidden on desktop where the sticky panel shows) */}
        <div className="mb-4 lg:hidden">
          <CollapsibleSection summary={formState.name || "—"} title={posPreviewLabel}>
            {previewCard}
          </CollapsibleSection>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 xl:gap-8">
          {/* One compact merged card: product info + price & stock + optional collapsibles */}
          <div className="space-y-4">
            <ProductSection title={formLabels.detailsSection}>
              <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                {/* Left column */}
                <div className="space-y-4">
                  <ProductTextInput
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.nameLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, name: value }))
                    }
                    value={formState.name}
                  />
                  <ProductSelectField
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.unitTypeLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, unit_id: value }))
                    }
                    options={unitOptions.map((u) => ({ id: u.id, name: u.name }))}
                    value={formState.unit_id ?? ""}
                  />
                  <ProductSelectField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.categoryLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, product_type_id: value }))
                    }
                    options={productTypes.map((t) => ({ id: t.id, name: t.name }))}
                    value={formState.product_type_id ?? ""}
                  />
                  <ProductSelectField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.brandLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, brand_id: value }))
                    }
                    options={productBrands.map((b) => ({ id: b.id, name: b.name }))}
                    value={formState.brand_id ?? ""}
                  />
                  <ProductTextInput
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.basePriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, base_price: value }))
                    }
                    placeholder="0.00"
                    type="number"
                    value={formState.base_price}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.costPriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, cost_price: value }))
                    }
                    placeholder="0.00"
                    type="number"
                    value={formState.cost_price}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.specialPriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, special_price: value }))
                    }
                    placeholder="0.00"
                    type="number"
                    value={formState.special_price}
                  />
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <ProductFileField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.imageLabel}
                    onChange={(file) =>
                      onFormStateChange((current) => ({ ...current, image: file }))
                    }
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.skuLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, sku: value }))
                    }
                    value={formState.sku}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.barcodeLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, barcode: value }))
                    }
                    value={formState.barcode ?? ""}
                  />
                  <ProductNativeSelectField
                    badgeText={formLabels.optionalLabel}
                    disabled={supplierOptions.length === 0}
                    emptyLabel={formLabels.supplierEmptyLabel}
                    label={formLabels.supplierLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, supplier_id: value }))
                    }
                    options={supplierOptions}
                    placeholder={formLabels.supplierPlaceholder}
                    value={formState.supplier_id ?? ""}
                  />
                  {!isEditing ? (
                    <ProductTextInput
                      badgeText={formLabels.optionalLabel}
                      label={formLabels.initialStockLabel}
                      min="0"
                      onChange={(value) =>
                        onFormStateChange((current) => ({ ...current, initial_stock: value }))
                      }
                      step="1"
                      type="number"
                      value={formState.initial_stock ?? ""}
                    />
                  ) : null}
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.minStockLabel}
                    min="0"
                    onChange={(value) =>
                      onFormStateChange((current) => ({ ...current, min_stock: value }))
                    }
                    step="1"
                    type="number"
                    value={formState.min_stock ?? "0"}
                  />
                  <ProductStatusField
                    activeText={posStatusActive}
                    inactiveText={posStatusInactive}
                    label={formLabels.activeLabel}
                    onToggle={toggleActive}
                    value={isActive}
                  />
                </div>
              </div>

              {/* Optional sections — always visible, organized inside the same card */}
              <div className="mt-4 space-y-4">
                <FormSubsection optionalText={optionalText} title={formLabels.storageAssignmentSection}>
                  <StorageAssignmentCard
                    value={formState.default_location_id ?? ""}
                    onChange={(locationId, label) =>
                      onFormStateChange((current) => ({
                        ...current,
                        default_location_id: locationId,
                        storage_location: label,
                      }))
                    }
                    labels={{
                      hint: formLabels.storageAssignmentHint,
                      warehouseLabel: formLabels.warehouseLabel,
                      zoneLabel: formLabels.zoneLabel,
                      locationLabel: formLabels.storageLocationLabel,
                      optionalLabel: formLabels.optionalLabel,
                      placeholder: formLabels.storagePlaceholder,
                      selectWarehouseFirst: formLabels.storageSelectWarehouseFirst,
                      noWarehouses: formLabels.storageNoWarehouses,
                      noLocations: formLabels.storageNoLocations,
                      currentLabel: formLabels.storageCurrentLabel,
                      clearLabel: formLabels.storageClearLabel,
                      unavailableLabel: formLabels.storageUnavailableLabel,
                    }}
                  />
                  {!formState.default_location_id ? (
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      <span aria-hidden="true">⚠</span>
                      <span>{formLabels.defaultLocationWarning}</span>
                    </p>
                  ) : null}
                </FormSubsection>

                <FormSubsection optionalText={optionalText} title={formLabels.descriptionLabel}>
                  <textarea
                    className="min-h-[80px] w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    onChange={(event) =>
                      onFormStateChange((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={formLabels.descriptionLabel}
                    value={formState.description ?? ""}
                  />
                </FormSubsection>
              </div>
            </ProductSection>
          </div>

          {/* POS Preview — sticky right column, desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {posPreviewLabel}
              </p>
              {previewCard}
            </div>
          </aside>
        </div>

        {/* Sticky bottom action bar — always visible while editing */}
        <div className="sticky bottom-0 z-20 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-[0_-6px_20px_-8px_rgba(15,23,42,0.18)] backdrop-blur">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={onClose}
            type="button"
          >
            {closeLabel}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:bg-violet-400"
            disabled={isPending}
            type="submit"
          >
            {isPending ? (
              <>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                </svg>
                <span>{formLabels.saving}</span>
              </>
            ) : (
              isEditing ? formLabels.save : formLabels.createProduct
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export { ProductFormDrawer as ProductFormModal };
