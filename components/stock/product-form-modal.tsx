"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type {
  ManagementDictionary,
  ProductFormLabels,
} from "@/components/stock/types";
import type {
  ProductBrand,
  ProductInput,
  ProductType,
  ProductUnit,
} from "@/types/product";

type ProductFormModalProps = {
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

function ProductModalSection({
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
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-200 text-slate-600"
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
  onChange,
  placeholder,
  type,
  value,
  min,
  step,
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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
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
  onChange,
  options: opts,
  value,
  noResultsLabel = "ไม่พบรายการ",
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  label: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  value: string;
  noResultsLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(() => {
    const found = opts.find((o) => o.id === value);
    return found ? found.name : "";
  });
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return opts;
    const q = search.toLowerCase();
    return opts.filter((o) => o.name.toLowerCase().includes(q));
  }, [opts, search]);

  // Sync search when value changes externally
  useEffect(() => {
    const found = opts.find((o) => o.id === value);
    setSearch(found ? found.name : "");
  }, [value, opts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 outline-none transition focus:border-blue-500"
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(""); // clear ID, user is typing free-text
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={label}
          value={search}
        />
        {open && opts.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-slate-400">{noResultsLabel}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                    opt.id === value ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700"
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
        className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 focus:border-blue-500"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
    </ProductField>
  );
}

function ProductActiveToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
      <button
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-700" : "bg-slate-300"
        } ${label ? "" : "ml-auto"}`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function ProductModalFooter({
  cancelLabel,
  isPending,
  modeTitle,
  onClose,
  submitLabel,
}: {
  cancelLabel: string;
  isPending: boolean;
  modeTitle: string;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4">
      <p className="max-w-xl text-sm text-slate-500">{modeTitle}</p>
      <div className="flex justify-end gap-3">
        <button
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={onClose}
          type="button"
        >
          {cancelLabel}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <>
              <svg aria-hidden="true" className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
              <span>{submitLabel}</span>
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );
}

function ProductSummaryCard({
  activeLabel,
  activeValue,
  categoryLabel,
  categoryValue,
  priceLabel,
  priceValue,
  quantityLabel,
  quantityValue,
  title,
  unitLabel,
  unitValue,
}: {
  activeLabel: string;
  activeValue: string;
  categoryLabel: string;
  categoryValue: string;
  priceLabel: string;
  priceValue: string;
  quantityLabel: string;
  quantityValue: string;
  title: string;
  unitLabel: string;
  unitValue: string;
}) {
  return null;
}

export function ProductFormModal({
  closeLabel,
  formLabels,
  formState,
  isEditing,
  isOpen,
  isPending,
  managementDictionary,
  onClose,
  onFormStateChange,
  onSubmit,
  productBrands,
  productTypes,
  quickActionLabel,
  unitOptions,
}: ProductFormModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        isOpen
          ? "pointer-events-auto bg-slate-950/45 opacity-100"
          : "pointer-events-none bg-slate-950/0 opacity-0"
      }`}
    >
      <div
        className={`h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.98] opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    {quickActionLabel}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                    {isEditing ? formLabels.titleEdit : formLabels.titleCreate}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    aria-checked={Boolean(formState.is_active)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                      Boolean(formState.is_active) ? "bg-white/90" : "bg-white/20"
                    }`}
                    onClick={() =>
                      onFormStateChange((current) => ({
                        ...current,
                        is_active: !current.is_active,
                      }))
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
                  <span className="text-xs font-medium tracking-wide text-white/60 uppercase">
                    {Boolean(formState.is_active) ? "Active" : "Inactive"}
                  </span>
                </div>
          </div>
        </div>

        <div className="h-[calc(92vh-108px)] overflow-y-auto p-6">
          <div className="flex items-center justify-end">
            <button
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              {closeLabel}
            </button>
          </div>

          <form className="mt-6 space-y-6" onSubmit={onSubmit}>
            <ProductModalSection title={formLabels.detailsSection}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <ProductTextInput
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.nameLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        name: value,
                      }))
                    }
                    value={formState.name}
                  />
                  <ProductTextInput
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.basePriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        base_price: value,
                      }))
                    }
                    placeholder="0.00"
                    value={formState.base_price}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.costPriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        cost_price: value,
                      }))
                    }
                    placeholder="0.00"
                    value={formState.cost_price}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.specialPriceLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        special_price: value,
                      }))
                    }
                    placeholder="0.00"
                    value={formState.special_price}
                  />
                  <ProductTextInput
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.quantityLabel}
                    min="0"
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        quantity: value,
                      }))
                    }
                    step="1"
                    type="number"
                    value={formState.quantity ?? "0"}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.minStockLabel}
                    min="0"
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        min_stock: value,
                      }))
                    }
                    step="1"
                    type="number"
                    value={formState.min_stock ?? "0"}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.maxStockLabel}
                    min="0"
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        max_stock: value,
                      }))
                    }
                    step="1"
                    type="number"
                    value={formState.max_stock ?? "0"}
                  />
                </div>

                <div className="space-y-5">
                  <ProductSelectField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.brandLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        brand_id: value,
                      }))
                    }
                    options={productBrands.map((b) => ({ id: b.id, name: b.name }))}
                    value={formState.brand_id ?? ""}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.productCodeLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        product_code: value,
                      }))
                    }
                    value={formState.product_code}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.skuLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        sku: value,
                      }))
                    }
                    value={formState.sku}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.barcodeLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        barcode: value,
                      }))
                    }
                    value={formState.barcode ?? ""}
                  />
                  <ProductTextInput
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.storageLocationLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        storage_location: value,
                      }))
                    }
                    value={formState.storage_location}
                  />
                  <ProductSelectField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.categoryLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        product_type_id: value,
                      }))
                    }
                    options={productTypes.map((t) => ({ id: t.id, name: t.name }))}
                    value={formState.product_type_id ?? ""}
                  />

                  <ProductSelectField
                    badgeText={formLabels.requiredLabel}
                    badgeTone="required"
                    label={formLabels.unitTypeLabel}
                    onChange={(value) =>
                      onFormStateChange((current) => ({
                        ...current,
                        unit_id: value,
                      }))
                    }
                    options={unitOptions.map((u) => ({ id: u.id, name: u.name }))}
                    value={formState.unit_id ?? ""}
                  />
                  <ProductFileField
                    badgeText={formLabels.optionalLabel}
                    label={formLabels.imageLabel}
                    onChange={(file) =>
                      onFormStateChange((current) => ({
                        ...current,
                        image: file,
                      }))
                    }
                  />

                  <ProductSummaryCard
                    activeLabel={formLabels.activeLabel}
                    activeValue={
                      Boolean(formState.is_active)
                        ? managementDictionary.activeLabel
                        : managementDictionary.inactiveLabel
                    }
                    categoryLabel={formLabels.categoryLabel}
                    categoryValue={
                      productTypes.find(
                        (type) => type.id === formState.product_type_id,
                      )?.name ?? "-"
                    }
                    priceLabel={formLabels.basePriceLabel}
                    priceValue={formState.base_price || "0.00"}
                    quantityLabel={formLabels.quantityLabel}
                    quantityValue={formState.quantity || "0"}
                    title={formLabels.setupSection}
                    unitLabel={formLabels.unitTypeLabel}
                    unitValue={
                      unitOptions.find((unit) => unit.id === formState.unit_id)
                        ?.name ?? "-"
                    }
                  />
                </div>
              </div>

              <div className="mt-6">
                <ProductField badgeText={formLabels.optionalLabel} label={formLabels.descriptionLabel}>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 min-h-[80px] resize-y"
                    onChange={(event) =>
                      onFormStateChange((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder={formLabels.descriptionLabel}
                    value={formState.description ?? ""}
                  />
                </ProductField>
              </div>
            </ProductModalSection>

            <ProductModalFooter
              cancelLabel={closeLabel}
              isPending={isPending}
              modeTitle={
                isEditing ? formLabels.titleEdit : formLabels.titleCreate
              }
              onClose={onClose}
              submitLabel={
                isEditing ? formLabels.save : formLabels.createProduct
              }
            />
          </form>
        </div>
      </div>
    </div>
  );
}
