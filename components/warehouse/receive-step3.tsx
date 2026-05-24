"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type RefObject } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, Loader2, Printer, Trash2, Truck, Upload } from "lucide-react";

import type { GoodsReceiptDraft, GoodsReceiptStockImpact } from "@/types/goods-receipt";
import type { ReceiveDictionary } from "./receive-shared";
import { formatCurrency, formatDateTimeLabel, formatFileSize, formatNumber, formatSignedNumber } from "./receive-shared";
import { SummaryCard } from "./receive-cards";

export type PendingAttachment = {
  id: string;
  file: File;
  isImage: boolean;
  isPdf: boolean;
};

export type ReceiveStep3Props = {
  dictionary: ReceiveDictionary;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  isUploadingAttachment: boolean;
  isView: boolean;
  pendingAttachments: PendingAttachment[];
  receipt: GoodsReceiptDraft;
  stockImpactError: unknown;
  stockImpactIsError: boolean;
  stockImpactIsLoading: boolean;
  stockPreview: GoodsReceiptStockImpact[];
  stepLinks: { step2: string };
  supplierName: string;
  warehouseName: string;
  onAttachmentChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onOpenConfirmDialog: () => void;
  onRemovePendingAttachment: (id: string) => void;
  onBack: () => void;
};

export function ReceiveStep3({
  dictionary,
  fileInputRef,
  isPending,
  isUploadingAttachment,
  isView,
  pendingAttachments,
  receipt,
  stockImpactError,
  stockImpactIsError,
  stockImpactIsLoading,
  stockPreview,
  stepLinks,
  supplierName,
  warehouseName,
  onAttachmentChange,
  onOpenConfirmDialog,
  onRemovePendingAttachment,
  onBack,
}: ReceiveStep3Props) {
  type PreviewTarget = { name: string; url: string; isImage: boolean; isPdf: boolean; isBlobOwned: boolean };
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  function openPendingPreview(attachment: PendingAttachment) {
    const url = URL.createObjectURL(attachment.file);
    setPreview({ name: attachment.file.name, url, isImage: attachment.isImage, isPdf: attachment.isPdf, isBlobOwned: true });
  }

function closePreview() {
    if (preview?.isBlobOwned) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  useEffect(() => {
    if (!preview) return;
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Truck className="h-5 w-5 text-violet-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{dictionary.step3Title}</h2>
          <p className="text-sm text-slate-500">{dictionary.helperStep3}</p>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={dictionary.labelDocumentNo} value={receipt.document_no} />
        <SummaryCard label={dictionary.labelWarehouse} value={warehouseName} />
        <SummaryCard label={dictionary.labelSupplier} value={supplierName} />
        <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
        <SummaryCard label={dictionary.labelSubtotal} value={formatCurrency(receipt.subtotal_amount)} />
        <SummaryCard label={dictionary.labelDiscount} value={formatCurrency(receipt.discount_amount)} />
        <SummaryCard label={dictionary.labelNetAmount} value={formatCurrency(receipt.net_amount)} />
        <SummaryCard label={dictionary.labelTotal} value={formatCurrency(receipt.total_amount)} />
      </div>

      {/* Items table */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{dictionary.labelItems}</p>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              {receipt.items.length}
            </span>
          </div>
          {!isView ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              href={stepLinks.step2}
            >
              {dictionary.actionEditDraft}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {receipt.items.length ? (
          <div className="overflow-x-auto rounded-2xl border border-violet-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelProduct}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">{dictionary.labelLocation}</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">{dictionary.labelQuantity}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelUnitPrice}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">{dictionary.labelLineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-violet-50 last:border-0 hover:bg-violet-50/30">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.product_name}</p>
                      {item.sku ? <p className="text-xs text-slate-400">{item.sku}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.location_name ?? item.location_id}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-900">{formatNumber(item.quantity)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(item.quantity * (item.unit_price ?? 0) - (item.discount_amount ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
            {dictionary.emptyProducts}
          </div>
        )}
      </div>

      {/* Stock impact */}
      <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
        <p className="text-sm font-semibold text-slate-900">{dictionary.labelStockPreview}</p>
        {stockImpactIsLoading ? (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-white px-4 py-8 text-center text-sm text-violet-700">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
            {dictionary.stateLoadingStockPreview}
          </div>
        ) : stockImpactIsError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
            {stockImpactError instanceof Error ? stockImpactError.message : dictionary.emptyStockPreview}
          </div>
        ) : stockPreview.length ? (
          <>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {dictionary.stateStockImpactSummary.replace("{count}", String(stockPreview.length))}
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/60">
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{dictionary.labelProduct}</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{dictionary.labelLocation}</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">{dictionary.stockBefore}</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">{dictionary.stockChange}</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">{dictionary.stockAfter}</th>
                  </tr>
                </thead>
                <tbody>
                  {stockPreview.map((p) => (
                    <tr key={p.item_id} className="border-b border-violet-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{p.product_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.location_name}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{formatNumber(p.before_quantity)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-emerald-600">
                        {formatSignedNumber(p.quantity)}
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-900">
                        {formatNumber(p.after_quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {dictionary.emptyStockPreview}
          </div>
        )}
      </div>

      {/* Attachment */}
      <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{dictionary.labelAttachment}</p>
            <p className="mt-1 text-sm text-slate-500">{dictionary.helperUploadAttachment}</p>
          </div>
          {!isView ? (
            <>
              <input
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                disabled={isUploadingAttachment}
                multiple
                onChange={onAttachmentChange}
                ref={fileInputRef}
                type="file"
              />
              <button
                aria-busy={isUploadingAttachment}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUploadingAttachment}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {isUploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploadingAttachment ? dictionary.actionUploadingAttachment : dictionary.actionUploadAttachment}
              </button>
            </>
          ) : null}
        </div>

        {isUploadingAttachment ? (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
            {dictionary.stateUploadingAttachmentProgress}
          </div>
        ) : null}

        {/* Confirmed attachments (all files, not just last one) */}
        <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{dictionary.labelAttachmentUploaded}</p>
          {receipt.attachments.length ? (
            <ul className="mt-2 space-y-2">
              {receipt.attachments.map((a) => {
                const isImg = a.mime_type.startsWith("image/");
                const isPdf = a.mime_type === "application/pdf";
                return (
                  <li className="flex flex-wrap items-center gap-2" key={a.id}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-900">{a.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(a.size)}</p>
                    </div>
                    {(isImg || isPdf) && a.url ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                        onClick={() => setPreview({ name: a.name, url: a.url, isImage: isImg, isPdf, isBlobOwned: false })}
                        type="button"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {dictionary.actionPreviewAttachment}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">-</p>
          )}
        </div>

        {/* Pending (local queue — will be uploaded on confirm) */}
        <div className="mt-3 rounded-2xl border border-violet-100 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">{dictionary.labelAttachmentPending}</p>
          {!pendingAttachments.length ? (
            <p className="mt-2 text-sm text-slate-500">{dictionary.stateNoPendingAttachments}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pendingAttachments.map((attachment) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2"
                  key={attachment.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{attachment.file.name}</p>
                    <p className="text-xs text-slate-500">
                      {attachment.file.type || dictionary.labelAttachmentUnknownType} • {formatFileSize(attachment.file.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(attachment.isImage || attachment.isPdf) ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                        onClick={() => openPendingPreview(attachment)}
                        type="button"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {dictionary.actionPreviewAttachment}
                      </button>
                    ) : null}
                    {!isView ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        onClick={() => onRemovePendingAttachment(attachment.id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {dictionary.actionRemoveAttachment}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isView ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              {dictionary.actionBack}
            </button>
            <div className="group relative">
              <button
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
                disabled
                type="button"
              >
                <Printer className="h-4 w-4" />
                {dictionary.actionPrint}
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                {dictionary.statePrintAfterConfirm}
              </div>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60"
            disabled={isPending || receipt.status === "confirmed"}
            onClick={onOpenConfirmDialog}
            type="button"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {dictionary.actionConfirm}
          </button>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={closePreview}
          role="presentation"
        >
          <div
            className="flex w-full max-w-4xl flex-col rounded-2xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{preview.name}</p>
              <button
                className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                onClick={closePreview}
                type="button"
              >
                {dictionary.actionClose}
              </button>
            </div>
            {preview.isImage ? (
              <img
                alt={preview.name}
                className="max-h-[75vh] w-full rounded-xl object-contain"
                src={preview.url}
              />
            ) : preview.isPdf ? (
              <iframe
                className="h-[75vh] w-full rounded-xl border border-violet-100"
                src={preview.url}
                title={preview.name}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
