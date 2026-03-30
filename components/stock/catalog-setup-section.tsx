"use client";

import { Pencil, Trash2 } from "lucide-react";

import type { ManagementDictionary, UnitsDictionary } from "@/components/stock/types";
import type { ProductType, ProductUnit } from "@/types/product";

type CatalogSetupSectionProps = {
  catalogSearch: string;
  isCategoriesView: boolean;
  managementDictionary: ManagementDictionary;
  onDeleteType: (productTypeId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onEditType: (productType: ProductType) => void;
  onEditUnit: (unit: ProductUnit) => void;
  onOpenCreateTypeModal: () => void;
  onOpenCreateUnitModal: () => void;
  onSearchChange: (value: string) => void;
  onToggleType: (productType: ProductType) => void;
  onToggleUnit: (unit: ProductUnit) => void;
  productTypes: ProductType[];
  productUnits: ProductUnit[];
  searchPlaceholder: string;
  typeError: string;
  unitError: string;
  unitsDictionary: UnitsDictionary;
};

export function CatalogSetupSection({
  catalogSearch,
  isCategoriesView,
  managementDictionary,
  onDeleteType,
  onDeleteUnit,
  onEditType,
  onEditUnit,
  onOpenCreateTypeModal,
  onOpenCreateUnitModal,
  onSearchChange,
  onToggleType,
  onToggleUnit,
  productTypes,
  productUnits,
  searchPlaceholder,
  typeError,
  unitError,
  unitsDictionary,
}: CatalogSetupSectionProps) {
  return (
    <>
      <section
        className={`rounded-2xl bg-white p-6 shadow-sm ${
          isCategoriesView ? "ring-2 ring-blue-200" : ""
        }`}
        id="categories"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{managementDictionary.title}</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              value={catalogSearch}
            />
            <button
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={onOpenCreateTypeModal}
              type="button"
            >
              {managementDictionary.createTypeButton}
            </button>
            <button
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              onClick={onOpenCreateUnitModal}
              type="button"
            >
              {managementDictionary.createUnitButton}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {managementDictionary.typeTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {managementDictionary.typesCountLabel}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                {productTypes.length}
              </span>
            </div>

            {productTypes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {productTypes.map((productType) => (
                  <div
                    key={productType.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {productType.name}
                        </p>
                        {productType.description ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {productType.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          productType.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {productType.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        aria-label={managementDictionary.editLabel}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-700 transition hover:bg-slate-100"
                        onClick={() => onEditType(productType)}
                        title={managementDictionary.editLabel}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => onToggleType(productType)}
                        type="button"
                      >
                        {productType.is_active
                          ? unitsDictionary.deactivateLabel
                          : unitsDictionary.activateLabel}
                      </button>
                      <button
                        aria-label={unitsDictionary.deleteLabel}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                        onClick={() => onDeleteType(productType.id)}
                        title={unitsDictionary.deleteLabel}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{managementDictionary.typeEmpty}</p>
            )}

            {typeError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {typeError}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {managementDictionary.unitTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {managementDictionary.unitsCountLabel}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                {productUnits.length}
              </span>
            </div>

            {productUnits.length > 0 ? (
              <div className="mt-4 space-y-3">
                {productUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {unit.name}
                        </p>
                        {unit.description ? (
                          <p className="mt-2 text-xs text-slate-500">{unit.description}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          unit.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {unit.is_active
                          ? managementDictionary.activeLabel
                          : managementDictionary.inactiveLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        aria-label={managementDictionary.editLabel}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-700 transition hover:bg-slate-100"
                        onClick={() => onEditUnit(unit)}
                        title={managementDictionary.editLabel}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => onToggleUnit(unit)}
                        type="button"
                      >
                        {unit.is_active
                          ? unitsDictionary.deactivateLabel
                          : unitsDictionary.activateLabel}
                      </button>
                      <button
                        aria-label={unitsDictionary.deleteLabel}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                        onClick={() => onDeleteUnit(unit.id)}
                        title={unitsDictionary.deleteLabel}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{managementDictionary.unitEmpty}</p>
            )}

            {unitError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {unitError}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
