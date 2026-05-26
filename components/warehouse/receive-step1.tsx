"use client";

import { ArrowLeft, Store } from "lucide-react";
import { Loader2 } from "lucide-react";

import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import type { Warehouse as WarehouseType } from "@/types/warehouse";
import type { Location } from "@/services/locations";
import type { Supplier } from "@/services/suppliers";
import type { ReceiveDictionary, HeaderForm } from "./receive-shared";
import { formatDateTimeLabel, formatNumber } from "./receive-shared";
import { SummaryCard } from "./receive-cards";

export type ReceiveStep1Props = {
  dictionary: ReceiveDictionary;
  headerErrors: Partial<Record<keyof HeaderForm, string>>;
  headerForm: HeaderForm;
  isPending: boolean;
  isView: boolean;
  allLocationsCount: number;
  locations: Location[];
  locationsQueryError: unknown;
  locationsQueryIsError: boolean;
  locationsQueryIsLoading: boolean;
  receipt: GoodsReceiptDraft;
  selectedWarehouseId: string;
  stepLinks: { step2: string };
  suppliers: Supplier[];
  warehouses: WarehouseType[];
  onCancel: () => void;
  onFieldChange: <K extends keyof HeaderForm>(field: K, value: HeaderForm[K]) => void;
  onSave: (nextHref: string) => void;
};

export function ReceiveStep1({
  dictionary,
  headerErrors,
  headerForm,
  allLocationsCount,
  isPending,
  isView,
  locations,
  locationsQueryError,
  locationsQueryIsError,
  locationsQueryIsLoading,
  receipt,
  selectedWarehouseId,
  stepLinks,
  suppliers,
  warehouses,
  onCancel,
  onFieldChange,
  onSave,
}: ReceiveStep1Props) {
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Store className="h-5 w-5 text-violet-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{dictionary.step1Title}</h2>
          <p className="text-sm text-slate-500">{dictionary.helperStep1}</p>
        </div>
      </div>

      {isView ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard label={dictionary.labelDocumentNo} value={receipt.document_no} />
          <SummaryCard label={dictionary.labelWarehouse} value={receipt.warehouse_name ?? "-"} />
          <SummaryCard label={dictionary.labelSupplier} value={receipt.supplier_name ?? "-"} />
          <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
          <SummaryCard label={dictionary.labelReferenceNo} value={receipt.reference_no ?? "-"} />
          <SummaryCard label={dictionary.labelVatPercent} value={`${formatNumber(receipt.vat_percent)}%`} />
          <div className="md:col-span-2">
            <SummaryCard label={dictionary.labelNote} value={receipt.note ?? "-"} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelDocumentNo}</span>
              <input
                className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-slate-600"
                disabled
                value={receipt.document_no}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelWarehouse}</span>
              <select
                className={`rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                  headerErrors.warehouseId ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
                }`}
                onChange={(e) => onFieldChange("warehouseId", e.target.value)}
                value={headerForm.warehouseId}
              >
                <option value="">{dictionary.placeholderSelectWarehouse}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {headerErrors.warehouseId ? (
                <span className="text-xs text-rose-600">{headerErrors.warehouseId}</span>
              ) : null}
            </label>

            {locationsQueryIsError ? (
              <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {locationsQueryError instanceof Error ? locationsQueryError.message : dictionary.stateLoadingLocations}
              </div>
            ) : locations.length === 0 && selectedWarehouseId && !locationsQueryIsLoading ? (
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {allLocationsCount > 0 ? dictionary.validationWarehouseOnlySalePoints : dictionary.validationWarehouseWithoutLocations}
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelSupplierOptional}</span>
              <select
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => onFieldChange("supplierId", e.target.value)}
                value={headerForm.supplierId}
              >
                <option value="">{dictionary.placeholderSelectSupplier}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelReceivedAt}</span>
              <input
                className={`rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                  headerErrors.receivedAt ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
                }`}
                onChange={(e) => onFieldChange("receivedAt", e.target.value)}
                type="datetime-local"
                value={headerForm.receivedAt}
              />
              {headerErrors.receivedAt ? (
                <span className="text-xs text-rose-600">{headerErrors.receivedAt}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelReferenceNo}</span>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(e) => onFieldChange("referenceNo", e.target.value)}
                placeholder={dictionary.placeholderReferenceNo}
                value={headerForm.referenceNo}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <span>{dictionary.labelVatPercent}</span>
              <input
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                min="0"
                onChange={(e) => onFieldChange("vatPercent", e.target.value)}
                step="0.01"
                type="number"
                value={headerForm.vatPercent}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                checked={headerForm.vatIncluded}
                className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-300"
                onChange={(e) => onFieldChange("vatIncluded", e.target.checked)}
                type="checkbox"
              />
              {dictionary.labelVatIncluded}
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{dictionary.labelNote}</span>
            <textarea
              className="min-h-32 rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              maxLength={500}
              onChange={(e) => onFieldChange("note", e.target.value)}
              placeholder={dictionary.placeholderNote}
              value={headerForm.note}
            />
            <span className="text-right text-xs text-slate-500">{headerForm.note.length}/500</span>
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              onClick={onCancel}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              {dictionary.actionCancel}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isPending}
              onClick={() => onSave(stepLinks.step2)}
              type="button"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? dictionary.actionSaving : dictionary.actionSaveAndContinue}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
