"use client";

import { FileText } from "lucide-react";

import type { Supplier } from "@/services/suppliers";
import type { Warehouse as WarehouseType } from "@/types/warehouse";
import { SummaryCard } from "./receive-cards";
import { formatDateTimeLabel, formatNumber, type HeaderForm, type ReceiveDictionary } from "./receive-shared";

export type ReceiveDocumentSectionProps = {
  dictionary: ReceiveDictionary;
  documentNo: string;
  editable: boolean;
  headerForm: HeaderForm;
  errors: Partial<Record<keyof HeaderForm, string>>;
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  purchaseOrders: { id: string; order_number: string }[];
  purchaseOrderId: string;
  purchaseOrderNo: string;
  locationsWarning: string | null;
  onFieldChange: <K extends keyof HeaderForm>(field: K, value: HeaderForm[K]) => void;
  onPurchaseOrderChange: (poId: string) => void;
};

export function ReceiveDocumentSection({
  dictionary: t,
  documentNo,
  editable,
  headerForm,
  errors,
  warehouses,
  suppliers,
  purchaseOrders,
  purchaseOrderId,
  purchaseOrderNo,
  locationsWarning,
  onFieldChange,
  onPurchaseOrderChange,
}: ReceiveDocumentSectionProps) {
  const supplierName = suppliers.find((s) => s.id === headerForm.supplierId)?.name ?? "-";
  const warehouseName = warehouses.find((w) => w.id === headerForm.warehouseId)?.name ?? "-";
  const isFromPo = Boolean(purchaseOrderId);

  if (!editable) {
    return (
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <FileText className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">{t.sectionDocument}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label={t.labelDocumentNo} value={documentNo} />
          <SummaryCard label={t.sourceLabel} value={isFromPo ? `${t.sourceFromPo} · ${purchaseOrderNo}` : t.sourceDirect} />
          <SummaryCard label={t.labelWarehouse} value={warehouseName} />
          <SummaryCard label={t.labelSupplier} value={supplierName} />
          <SummaryCard label={t.labelReceivedAt} value={formatDateTimeLabel(headerForm.receivedAt)} />
          <SummaryCard label={t.labelReferenceNo} value={headerForm.referenceNo || "-"} />
          <SummaryCard label={t.labelVatPercent} value={`${formatNumber(Number(headerForm.vatPercent || 0))}%`} />
          <div className="md:col-span-2 xl:col-span-3">
            <SummaryCard label={t.labelNote} value={headerForm.note || "-"} />
          </div>
        </div>
      </section>
    );
  }

  const fieldClass = (hasError?: boolean) =>
    `rounded-2xl border bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
      hasError ? "border-rose-300 bg-rose-50/70" : "border-violet-200"
    }`;

  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <FileText className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-900">{t.sectionDocument}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelDocumentNo}</span>
          <input className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-slate-600" disabled value={documentNo} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelPurchaseOrder}</span>
          {isFromPo ? (
            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-slate-700">
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{t.sourceFromPo}</span>
              <span className="nums text-sm">{purchaseOrderNo || purchaseOrderId}</span>
            </div>
          ) : (
            <select className={fieldClass()} onChange={(e) => onPurchaseOrderChange(e.target.value)} value="">
              <option value="">{t.sourceDirect}</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>{po.order_number}</option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelWarehouse}</span>
          <select className={fieldClass(Boolean(errors.warehouseId))} onChange={(e) => onFieldChange("warehouseId", e.target.value)} value={headerForm.warehouseId}>
            <option value="">{t.placeholderSelectWarehouse}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {errors.warehouseId ? <span className="text-xs text-rose-600">{errors.warehouseId}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelSupplierOptional}</span>
          <select className={fieldClass()} onChange={(e) => onFieldChange("supplierId", e.target.value)} value={headerForm.supplierId}>
            <option value="">{t.placeholderSelectSupplier}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelReceivedAt}</span>
          <input className={fieldClass(Boolean(errors.receivedAt))} onChange={(e) => onFieldChange("receivedAt", e.target.value)} type="datetime-local" value={headerForm.receivedAt} />
          {errors.receivedAt ? <span className="text-xs text-rose-600">{errors.receivedAt}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelReferenceNo}</span>
          <input className={fieldClass()} onChange={(e) => onFieldChange("referenceNo", e.target.value)} placeholder={t.placeholderReferenceNo} value={headerForm.referenceNo} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{t.labelVatPercent}</span>
          <input className={fieldClass()} min="0" onChange={(e) => onFieldChange("vatPercent", e.target.value)} step="0.01" type="number" value={headerForm.vatPercent} />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-medium text-slate-700">
          <input checked={headerForm.vatIncluded} className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-300" onChange={(e) => onFieldChange("vatIncluded", e.target.checked)} type="checkbox" />
          {t.labelVatIncluded}
        </label>
      </div>

      {locationsWarning ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{locationsWarning}</div>
      ) : null}

      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
        <span>{t.labelNote}</span>
        <textarea className="min-h-24 rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" maxLength={500} onChange={(e) => onFieldChange("note", e.target.value)} placeholder={t.placeholderNote} value={headerForm.note} />
      </label>
    </section>
  );
}
