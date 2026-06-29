"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  FileText,
  Hash,
  Layers,
  Loader2,
  Package,
  Printer,
  Undo2,
  Wallet,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { getAuthSession } from "@/lib/auth-storage";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import { createDocumentFromSale, createSaleReturn, getSaleById, voidSale, type CreateReturnInput } from "@/services/sales";
import type { DocumentType } from "@/types/document";
import type { Sale } from "@/types/sale";

import { ReturnModal } from "./return-modal";
import { SaleDocumentPreviewModal } from "./sale-document-preview-modal";
import {
  SALE_DOCUMENT_TEMPLATES,
  isDocumentAvailable,
  type SaleDocumentKind,
  type SaleDocumentTemplate,
} from "./sale-document-templates";
import type { SalesHistoryDict } from "./sales-history-dict";

const DOC_KIND_TO_TYPE: Partial<Record<SaleDocumentKind, DocumentType>> = {
  TAX_FULL: "TAX_INVOICE",
  DELIVERY: "DELIVERY_ORDER",
  QUOTATION: "QUOTATION",
  CREDIT_NOTE: "CREDIT_NOTE",
  DEBIT_NOTE: "BILL",
};

// Predefined reason presets per action. Last entry "other" forces a free-text note.
const VOID_REASON_KEYS = [
  "voidReasonWrongPrice",
  "voidReasonCustomerCancel",
  "voidReasonDuplicate",
  "voidReasonTest",
] as const;

const RETURN_REASON_KEYS = [
  "returnReasonDefective",
  "returnReasonWrongItem",
  "returnReasonNotSatisfied",
  "returnReasonExpired",
] as const;

const OTHER_REASON = "other";

function baht(n: number | undefined | null): string {
  const v = n ?? 0;
  return "฿" + v.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaleDetailModal({
  saleId,
  dict,
  onClose,
}: {
  saleId: string;
  dict: SalesHistoryDict;
  onClose: () => void;
}) {
  const { role } = useStoreRole();
  // Align with backend: owner/manager (store role) OR platform_admin (global role)
  // may void/return. useStoreRole returns "" for non-members like platform_admin,
  // so the global role must be consulted too — otherwise the buttons stay hidden.
  const isPlatformAdmin = getAuthSession()?.user?.role === "platform_admin";
  const canManage = canManageStore(role) || isPlatformAdmin;

  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SaleDocumentTemplate | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [voidDialog, setVoidDialog] = useState<"void" | null>(null);
  const [voidReasonKey, setVoidReasonKey] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sale-detail", saleId],
    queryFn: () => getSaleById(saleId),
    staleTime: 60_000,
  });
  const sale: Sale | undefined = data?.data;

  function handleClose() {
    setIsClosing(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Let the preview modal own Escape while it is open.
      if (e.key === "Escape" && !previewTemplate) setIsClosing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewTemplate]);

  function paymentLabel(method: string): string {
    switch (method) {
      case "cash":
        return dict.paymentCash;
      case "card":
        return dict.paymentCard;
      case "transfer":
      case "bank_transfer":
        return dict.paymentTransfer;
      case "promptpay":
      case "qr":
        return dict.paymentQr;
      default:
        return dict.paymentOther;
    }
  }

  function handlePrintPreview() {
    const receiptTemplate = SALE_DOCUMENT_TEMPLATES.find((t) => t.kind === "RECEIPT");
    if (receiptTemplate) setPreviewTemplate(receiptTemplate);
  }

  function resetVoidDialog() {
    setVoidDialog(null);
    setVoidReasonKey("");
    setVoidNote("");
  }

  async function handleVoidConfirm() {
    if (!voidDialog || !voidReasonKey) return;
    const presetLabel =
      voidReasonKey === OTHER_REASON ? "" : dict[voidReasonKey as keyof SalesHistoryDict];
    const reason = [presetLabel, voidNote.trim()].filter(Boolean).join(" — ");
    setVoidLoading(true);
    try {
      await voidSale(saleId, { reason: reason || undefined, type: "void" });
      toast.success(dict.voidSuccess);
      resetVoidDialog();
      queryClient.invalidateQueries({ queryKey: ["sale-detail", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    } catch {
      toast.error(dict.voidError);
    } finally {
      setVoidLoading(false);
    }
  }

  async function handleReturnConfirm(input: CreateReturnInput) {
    try {
      await createSaleReturn(saleId, input);
      toast.success(dict.returnSuccess);
      setShowReturnModal(false);
      queryClient.invalidateQueries({ queryKey: ["sale-detail", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    } catch {
      toast.error(dict.voidError);
    }
  }

  async function selectDocument(t: SaleDocumentTemplate) {
    setDocMenuOpen(false);
    if (!isDocumentAvailable(t)) {
      toast.success(dict.docComingSoon);
      return;
    }
    setPreviewTemplate(t);

    const docType = DOC_KIND_TO_TYPE[t.kind];
    if (!docType || !sale) return;

    try {
      // The backend issues the persisted document from the sale's AUTHORITATIVE stored
      // totals (subtotal / discount / VAT / grand total), so it matches the receipt
      // exactly. No client-side reconstruction from gross prices (which used to drop the
      // bill discount and force VAT 7%).
      await createDocumentFromSale(sale.id, docType);
      toast.success(dict.docSaved);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch {
      toast.error(dict.docSaveError);
    }
  }

  const items = sale?.items ?? [];
  const lineCount = items.length;
  const pieces = sale?.total_items ?? items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  // discount_amount is ALREADY the combined item + bill discount (set by the sale
  // repository) — do not add bill_discount_amount again.
  const discountTotal = sale?.discount_amount ?? 0;
  const isVoided = sale?.status === "voided";
  const isFullyReturned = sale?.status === "fully_returned";
  const isPartiallyReturned = sale?.status === "partially_returned";
  const returns = sale?.returns ?? [];
  // Returnable while not voided and at least one line still has units left.
  const anyReturnable = items.some(
    (i) => (i.quantity ?? 0) - (i.returned_quantity ?? 0) > 0,
  );
  const cellClass = "px-3 py-2.5 align-top";

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm smooth-fade sm:p-6"
      onClick={handleClose}
    >
      <div
        className={`flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          isClosing ? "fade-out" : "smooth-fade-up"
        }`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={() => {
          if (isClosing) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 bg-violet-600 px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold leading-tight">{dict.detailTitle}</h2>
              <p className="truncate text-sm text-violet-100">
                {sale?.sale_number ?? saleId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-violet-100 transition hover:bg-white/15 hover:text-white"
            aria-label={dict.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto pretty-scroll">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              {dict.loading}
            </div>
          ) : isError || !sale ? (
            <div className="p-6">
              <Alert tone="error">{dict.errorLoad}</Alert>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <MetaChip label={dict.detailDateTime} value={fmtDateTime(sale.created_at)} />
                <MetaChip
                  label={dict.detailCustomer}
                  value={sale.customer_name || dict.generalCustomer}
                />
                <MetaChip label={dict.detailCashier} value={sale.cashier_name || "—"} />
                <MetaChip
                  label={dict.detailPayment}
                  value={paymentLabel(sale.payment_method ?? "")}
                />
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    isVoided
                      ? "bg-red-50 text-red-600"
                      : isFullyReturned
                        ? "bg-amber-100 text-amber-700"
                        : isPartiallyReturned
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isVoided
                    ? dict.statusVoided
                    : isFullyReturned
                      ? dict.statusFullyReturned
                      : isPartiallyReturned
                        ? dict.statusPartiallyReturned
                        : dict.statusCompleted}
                </span>
              </div>

              {/* Voided banner */}
              {isVoided && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-700">{dict.alreadyVoided}</p>
                    {sale.voided_at && (
                      <p className="text-red-600">
                        {fmtDateTime(sale.voided_at)}
                        {sale.void_reason ? ` — ${sale.void_reason}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Returns history */}
              {returns.length > 0 && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Undo2 className="h-4 w-4 text-violet-500" />
                    <p className="text-sm font-semibold text-violet-800">{dict.returnsHistoryTitle}</p>
                  </div>
                  <div className="space-y-2.5">
                    {returns.map((ret) => (
                      <div key={ret.id} className="rounded-lg border border-violet-100 bg-white p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{ret.return_number}</span>
                          <span className="nums font-semibold text-violet-700">−{baht(ret.refund_amount)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span>{fmtDateTime(ret.created_at)}</span>
                          <span>· {dict.returnRefundedVia} {paymentLabel(ret.refund_method)}</span>
                          {ret.created_by_name && <span>· {dict.returnedBy} {ret.created_by_name}</span>}
                        </div>
                        {(ret.items ?? []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(ret.items ?? []).map((ri) => (
                              <span key={ri.id} className="nums rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                {ri.product_name} ×{ri.quantity}
                              </span>
                            ))}
                          </div>
                        )}
                        {ret.reason && <p className="mt-1 text-xs text-slate-500">{ret.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard
                  icon={<Wallet className="h-4 w-4" />}
                  label={dict.sumNet}
                  value={baht(sale.total_amount)}
                  accent
                />
                <SummaryCard
                  icon={<Layers className="h-4 w-4" />}
                  label={dict.sumItems}
                  value={`${lineCount} ${dict.itemsSuffix}`}
                />
                <SummaryCard
                  icon={<Package className="h-4 w-4" />}
                  label={dict.sumPieces}
                  value={`${pieces} ${dict.piecesSuffix}`}
                />
                <SummaryCard
                  icon={<Hash className="h-4 w-4" />}
                  label={dict.sumPayment}
                  value={paymentLabel(sale.payment_method ?? "")}
                />
              </div>

              {/* Item table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-left">{dict.thNo}</th>
                      <th className="px-3 py-2.5 text-left">{dict.thProduct}</th>
                      <th className="w-28 px-3 py-2.5 text-right">{dict.thUnitPrice}</th>
                      <th className="w-24 px-3 py-2.5 text-center">{dict.thQty}</th>
                      <th className="w-28 px-3 py-2.5 text-right">{dict.thDiscount}</th>
                      <th className="w-32 px-3 py-2.5 text-right">{dict.thLineTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                          {dict.noItems}
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const lineDiscount =
                          item.line_discount_total ??
                          (item.discount_amount_per_unit ?? 0) * (item.quantity ?? 0);
                        const name = item.product_name || item.product_id;
                        return (
                          <tr key={item.id ?? `${item.product_id}-${idx}`} className="text-slate-700">
                            <td className={`${cellClass} text-slate-400 nums`}>{idx + 1}</td>
                            <td className={cellClass}>
                              <span
                                title={name}
                                className="block max-w-[240px] font-medium leading-[1.6] text-slate-800 line-clamp-2 sm:max-w-md"
                              >
                                {name}
                              </span>
                              {item.sku && (
                                <span className="text-xs leading-normal text-slate-400">
                                  {item.sku}
                                </span>
                              )}
                            </td>
                            <td className={`${cellClass} text-right nums`}>
                              {baht(item.unit_price)}
                            </td>
                            <td className={`${cellClass} text-center nums`}>
                              {item.quantity}
                              {item.unit_type ? (
                                <span className="text-slate-400"> {item.unit_type}</span>
                              ) : null}
                            </td>
                            <td className={`${cellClass} text-right nums text-rose-500`}>
                              {lineDiscount > 0 ? `-${baht(lineDiscount)}` : "—"}
                            </td>
                            <td className={`${cellClass} text-right font-semibold nums text-slate-900`}>
                              {baht(item.line_total ?? item.total_amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals + note */}
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-end">
                {sale.note ? (
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {dict.detailNote}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">{sale.note}</p>
                  </div>
                ) : null}
                <div className="w-full shrink-0 rounded-xl border border-violet-100 bg-violet-50/40 p-4 lg:w-80">
                  <TotalRow label={dict.totBeforeDiscount} value={baht(sale.subtotal_amount)} />
                  {discountTotal > 0 && (
                    <TotalRow
                      label={dict.totDiscount}
                      value={`-${baht(discountTotal)}`}
                      tone="rose"
                    />
                  )}
                  {(sale.vat_amount ?? 0) > 0 && (
                    <TotalRow
                      label={`${dict.totVat}${sale.vat_included ? " " + dict.totVatIncluded : ""} ${
                        sale.vat_percent ? `${sale.vat_percent}%` : ""
                      }`}
                      value={baht(sale.vat_amount)}
                    />
                  )}
                  <div className="my-2 border-t border-violet-200" />
                  <TotalRow label={dict.totNet} value={baht(sale.total_amount)} strong />
                  <TotalRow label={dict.totPaid} value={baht(sale.paid_amount)} />
                  <TotalRow label={dict.totChange} value={baht(sale.change_amount)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action bar — transaction-level actions + document switcher */}
        {sale && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
            <ActionButton
              icon={<Printer className="h-4 w-4" />}
              label={dict.actPrint}
              onClick={handlePrintPreview}
              primary
            />
            {canManage && !isVoided && (
              <>
                {anyReturnable && (
                  <ActionButton
                    icon={<Undo2 className="h-4 w-4" />}
                    label={dict.actReturn}
                    onClick={() => setShowReturnModal(true)}
                    muted
                  />
                )}
                {/* Void cancels the WHOLE bill — only allowed on a pristine completed
                    sale; once items are returned, the per-line restock owns the stock. */}
                {sale.status === "completed" && (
                  <ActionButton
                    icon={<Ban className="h-4 w-4" />}
                    label={dict.actVoid}
                    onClick={() => setVoidDialog("void")}
                    danger
                  />
                )}
              </>
            )}

            {/* Document switcher (template engine) */}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setDocMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                <FileText className="h-4 w-4" />
                {dict.issueDocument}
                <ChevronDown className={`h-4 w-4 transition-transform ${docMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {docMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setDocMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 z-20 mb-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl smooth-fade-up">
                    {SALE_DOCUMENT_TEMPLATES.map((t) => {
                      const Icon = t.icon;
                      const available = isDocumentAvailable(t);
                      return (
                        <button
                          key={t.kind}
                          type="button"
                          onClick={() => selectDocument(t)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-violet-50"
                        >
                          <Icon className={`h-4 w-4 ${available ? "text-violet-500" : "text-slate-300"}`} />
                          <span className="flex-1">{dict[t.labelKey as keyof SalesHistoryDict]}</span>
                          {!available && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                              soon
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>

    {/* Centered document preview (Print / PDF / Share / …) */}
    {previewTemplate && sale && (
      <SaleDocumentPreviewModal
        saleId={saleId}
        saleNumber={sale.sale_number ?? saleId.slice(0, 8).toUpperCase()}
        template={previewTemplate}
        dict={dict}
        onClose={() => setPreviewTemplate(null)}
      />
    )}

    {/* Return modal — per-item quantity selector */}
    {showReturnModal && sale && (
      <ReturnModal
        sale={sale}
        dict={dict}
        onClose={() => setShowReturnModal(false)}
        onConfirm={handleReturnConfirm}
      />
    )}

    {/* Void confirmation dialog */}
    {voidDialog && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm smooth-fade"
        onClick={(e) => { e.stopPropagation(); if (!voidLoading) resetVoidDialog(); }}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl smooth-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{dict.voidConfirmTitle}</h3>
              <p className="text-sm text-slate-500">{dict.voidConfirmMsg}</p>
            </div>
          </div>

          {/* Reason picker — required */}
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {dict.reasonSelectLabel} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {VOID_REASON_KEYS.map((k) => {
                const selected = voidReasonKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setVoidReasonKey(k)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-violet-400 bg-violet-50 text-violet-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-violet-500" : "border-slate-300"
                    }`}>
                      {selected && <span className="h-2 w-2 rounded-full bg-violet-500" />}
                    </span>
                    {dict[k as keyof SalesHistoryDict]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setVoidReasonKey(OTHER_REASON)}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  voidReasonKey === OTHER_REASON
                    ? "border-violet-400 bg-violet-50 text-violet-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  voidReasonKey === OTHER_REASON ? "border-violet-500" : "border-slate-300"
                }`}>
                  {voidReasonKey === OTHER_REASON && <span className="h-2 w-2 rounded-full bg-violet-500" />}
                </span>
                {dict.reasonOther}
              </button>
            </div>
          </div>

          {/* Free-text note — optional, required when "other" */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {dict.voidNoteLabel}
              {voidReasonKey === OTHER_REASON ? (
                <span className="text-red-500"> *</span>
              ) : (
                <span className="font-normal text-slate-400"> {dict.notesOptional}</span>
              )}
            </label>
            <textarea
              value={voidNote}
              onChange={(e) => setVoidNote(e.target.value)}
              placeholder={dict.voidReasonPlaceholder}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetVoidDialog}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              disabled={voidLoading}
            >
              {dict.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleVoidConfirm}
              disabled={
                voidLoading ||
                !voidReasonKey ||
                (voidReasonKey === OTHER_REASON && !voidNote.trim())
              }
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {voidLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {dict.confirmBtn}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
      <span className="text-xs text-slate-400">{label}:</span>
      <span className="font-medium text-slate-800">{value}</span>
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 shadow-sm ${
        accent ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={accent ? "text-violet-600" : "text-slate-400"}>{icon}</span>
        {label}
      </div>
      <p
        className={`mt-1.5 truncate text-xl font-bold nums ${
          accent ? "text-violet-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "rose";
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</span>
      <span
        className={`nums ${
          strong
            ? "text-lg font-bold text-violet-700"
            : tone === "rose"
              ? "font-medium text-rose-500"
              : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
  muted,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  muted?: boolean;
  danger?: boolean;
}) {
  const tone = primary
    ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
    : danger
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : muted
        ? "border-slate-200 text-slate-400 hover:bg-slate-50"
        : "border-slate-200 text-slate-600 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${tone}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
