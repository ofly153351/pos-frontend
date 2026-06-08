"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

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
  unitOptions: ProductUnit[];
};

type ProductFieldProps = {
  badgeTone?: "optional" | "required";
  badgeText?: string;
  children: ReactNode;
  label: string;
};

function ProductSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
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
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-10 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
        className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:text-sm file:font-medium file:text-violet-700 focus:border-violet-500"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
    </ProductField>
  );
}

function POSPreviewCard({
  formState,
  posPreviewLabel,
  posStatusActive,
  posStatusInactive,
  productTypes,
  unitOptions,
}: {
  formState: ProductInput;
  posPreviewLabel: string;
  posStatusActive: string;
  posStatusInactive: string;
  productTypes: ProductType[];
  unitOptions: ProductUnit[];
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!formState.image) { setImageUrl(null); return; }
    const url = URL.createObjectURL(formState.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formState.image]);

  const categoryName = productTypes.find((t) => t.id === formState.product_type_id)?.name;
  const unitName = unitOptions.find((u) => u.id === formState.unit_id)?.name;

  const formattedPrice = useMemo(() => {
    const n = Number(formState.base_price);
    if (!formState.base_price || Number.isNaN(n)) return "฿0.00";
    return new Intl.NumberFormat("th-TH", { currency: "THB", minimumFractionDigits: 2, style: "currency" }).format(n);
  }, [formState.base_price]);

  const specialFormattedPrice = useMemo(() => {
    const n = Number(formState.special_price);
    if (!formState.special_price || Number.isNaN(n) || n <= 0) return null;
    return new Intl.NumberFormat("th-TH", { currency: "THB", minimumFractionDigits: 2, style: "currency" }).format(n);
  }, [formState.special_price]);

  return (
    <div className="sticky top-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {posPreviewLabel}
      </p>
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="relative aspect-square bg-gradient-to-br from-violet-50 to-slate-100">
          {imageUrl ? (
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
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
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

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-6 rounded-2xl bg-violet-700 px-6 py-6 text-white">
        <div className="flex items-center gap-4">
          <button
            aria-label={closeLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              {quickActionLabel}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold">
              {isEditing ? formLabels.titleEdit : formLabels.titleCreate}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              aria-checked={Boolean(formState.is_active)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                Boolean(formState.is_active) ? "bg-white/90" : "bg-white/20"
              }`}
              onClick={() =>
                onFormStateChange((current) => ({ ...current, is_active: !current.is_active }))
              }
              role="switch"
              type="button"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  Boolean(formState.is_active) ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="hidden text-xs font-medium uppercase tracking-wide text-white/60 sm:block">
              {Boolean(formState.is_active) ? posStatusActive : posStatusInactive}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <form onSubmit={onSubmit}>
        <div className="xl:grid xl:grid-cols-[1fr_288px] xl:gap-8">
          {/* Form fields */}
          <div className="space-y-6">
            <ProductSection title={formLabels.detailsSection}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
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
                </div>
                <div className="space-y-5">
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
                </div>
              </div>
            </ProductSection>

            <ProductSection title={formLabels.pricingSection}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
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
                <div className="space-y-5">
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
                </div>
              </div>
            </ProductSection>

            <ProductSection title={formLabels.setupSection}>
              <ProductField badgeText={formLabels.optionalLabel} label={formLabels.descriptionLabel}>
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  onChange={(event) =>
                    onFormStateChange((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder={formLabels.descriptionLabel}
                  value={formState.description ?? ""}
                />
              </ProductField>
            </ProductSection>

            <ProductSection title={formLabels.storageAssignmentSection}>
              <StorageAssignmentCard
                value={formState.storage_location ?? ""}
                onChange={(value) =>
                  onFormStateChange((current) => ({ ...current, storage_location: value }))
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
                }}
              />
            </ProductSection>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
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
          </div>

          {/* POS Preview — right column, xl+ only */}
          <div className="mt-6 hidden xl:mt-0 xl:block">
            <POSPreviewCard
              formState={formState}
              posPreviewLabel={posPreviewLabel}
              posStatusActive={posStatusActive}
              posStatusInactive={posStatusInactive}
              productTypes={productTypes}
              unitOptions={unitOptions}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

export { ProductFormDrawer as ProductFormModal };
