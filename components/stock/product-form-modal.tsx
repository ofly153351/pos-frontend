"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import type {
  ManagementDictionary,
  ProductFormLabels,
} from "@/components/stock/types";
import type { ProductInput, ProductType, ProductUnit } from "@/types/product";

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
  children,
  label,
  onChange,
  value,
}: {
  badgeText?: string;
  badgeTone?: "optional" | "required";
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <ProductField badgeText={badgeText} badgeTone={badgeTone} label={label}>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
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
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <input
        checked={checked}
        className="mt-1"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="block">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
      </span>
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
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
          disabled={isPending}
          type="submit"
        >
          {submitLabel}
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
  return (
    <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
        {title}
      </p>
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl bg-white/8 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">{priceLabel}</p>
          <p className="mt-2 text-sm font-semibold text-white">{priceValue}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/8 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
              {quantityLabel}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{quantityValue}</p>
          </div>
          <div className="rounded-2xl bg-white/8 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
              {unitLabel}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{unitValue}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/8 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">{activeLabel}</p>
          <p className="mt-2 text-sm font-semibold text-white">{activeValue}</p>
        </div>
        <div className="rounded-2xl bg-white/8 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">{categoryLabel}</p>
          <p className="mt-2 text-sm font-semibold text-white">{categoryValue}</p>
        </div>
      </div>
    </aside>
  );
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
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out ${
        isOpen ? "pointer-events-auto bg-slate-950/45 opacity-100" : "pointer-events-none bg-slate-950/0 opacity-0"
      }`}
    >
      <div
        className={`absolute right-0 top-0 h-full w-full overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out md:w-[35vw] ${
          isOpen ? "translate-x-0" : "translate-x-full"
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
          </div>
        </div>

        <div className="h-[calc(100vh-108px)] overflow-y-auto p-6">
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
            <ProductModalSection
              title={formLabels.detailsSection}
            >
              <div className="grid gap-5">
                <ProductTextInput
                  badgeText={formLabels.requiredLabel}
                  badgeTone="required"
                  label={formLabels.nameLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({ ...current, name: value }))
                  }
                  value={formState.name}
                />
                <ProductTextInput
                  badgeText={formLabels.optionalLabel}
                  label={formLabels.skuLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({ ...current, sku: value }))
                  }
                  value={formState.sku}
                />
              </div>
            </ProductModalSection>

            <ProductModalSection
              title={formLabels.amountLabel}
            >
              <div className="grid gap-5">
                <ProductTextInput
                  badgeText={formLabels.requiredLabel}
                  badgeTone="required"
                  label={formLabels.basePriceLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({ ...current, base_price: value }))
                  }
                  placeholder="0.00"
                  value={formState.base_price}
                />
                <ProductTextInput
                  badgeText={formLabels.optionalLabel}
                  label={formLabels.specialPriceLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({ ...current, special_price: value }))
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
                    onFormStateChange((current) => ({ ...current, quantity: value }))
                  }
                  step="1"
                  type="number"
                  value={formState.quantity ?? "0"}
                />
              </div>
            </ProductModalSection>

            <ProductModalSection
              title={formLabels.setupSection}
            >
              <div className="grid gap-5">
                <ProductSelectField
                  badgeText={formLabels.optionalLabel}
                  label={formLabels.categoryLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({ ...current, product_type_id: value }))
                  }
                  value={formState.product_type_id ?? ""}
                >
                  <option value="">-</option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </ProductSelectField>
                <ProductSelectField
                  badgeText={formLabels.requiredLabel}
                  badgeTone="required"
                  label={formLabels.unitTypeLabel}
                  onChange={(value) =>
                    onFormStateChange((current) => ({
                      ...current,
                      unit_type: value as ProductInput["unit_type"],
                    }))
                  }
                  value={formState.unit_type ?? unitOptions[0].code}
                >
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.code}>
                      {unit.name}
                    </option>
                  ))}
                </ProductSelectField>
              </div>

              <div className="mt-5 grid gap-5">
                <ProductFileField
                  badgeText={formLabels.optionalLabel}
                  label={formLabels.imageLabel}
                  onChange={(file) =>
                    onFormStateChange((current) => ({ ...current, image: file }))
                  }
                />
                <ProductActiveToggle
                  checked={Boolean(formState.is_active)}
                  label={formLabels.activeLabel}
                  onChange={(checked) =>
                    onFormStateChange((current) => ({ ...current, is_active: checked }))
                  }
                />
              </div>
            </ProductModalSection>

            <ProductSummaryCard
              activeLabel={formLabels.activeLabel}
              activeValue={
                Boolean(formState.is_active)
                  ? managementDictionary.activeLabel
                  : managementDictionary.inactiveLabel
              }
              categoryLabel={formLabels.categoryLabel}
              categoryValue={
                productTypes.find((type) => type.id === formState.product_type_id)?.name ?? "-"
              }
              priceLabel={formLabels.basePriceLabel}
              priceValue={formState.base_price || "0.00"}
              quantityLabel={formLabels.quantityLabel}
              quantityValue={formState.quantity || "0"}
              title={formLabels.setupSection}
              unitLabel={formLabels.unitTypeLabel}
              unitValue={
                unitOptions.find((unit) => unit.code === formState.unit_type)?.name ?? "-"
              }
            />

            <ProductModalFooter
              cancelLabel={closeLabel}
              isPending={isPending}
              modeTitle={isEditing ? formLabels.titleEdit : formLabels.titleCreate}
              onClose={onClose}
              submitLabel={isEditing ? formLabels.save : formLabels.createProduct}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
