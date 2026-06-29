"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Ban,
  Copy,
  Eye,
  FileBadge,
  FileDown,
  FileMinus,
  FileText,
  Loader2,
  MoreVertical,
  Receipt,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import {
  cancelDocument,
  convertDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentPdfBlob,
  payInvoice,
} from "@/services/documents";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { DocumentListItem, DocumentType } from "@/types/document";

// Labels consumed by the row action menu. A structural subset of the documents dict.
type RowActionsDict = {
  copy: string;
  print: string;
  moreOptions: string;
  duplicate: string;
  duplicateSuccess: string;
  duplicateError: string;
  printPreview: string;
  downloadPDF: string;
  convertTo: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
  recordPayment: string;
  paySuccess: string;
  payError: string;
  cancel: string;
  confirm: string;
  cancelDocument: string;
  cancelSuccess: string;
  cancelError: string;
  confirmCancelDoc: string;
  delete: string;
  deleteSuccess: string;
  deleteError: string;
  confirmDeleteDoc: string;
  convertSuccess: string;
  convertError: string;
  pdfError: string;
};

type Props = {
  doc: DocumentListItem;
  dict: RowActionsDict;
  // Opens the shared preview drawer (which itself carries print / PDF / convert).
  onPreview: () => void;
};

// Valid "Convert to…" targets per source type. Mirrors the backend workflow
// matrix (allowedConversions); the server re-validates every request.
function convertTargetsFor(type: DocumentType): DocumentType[] {
  switch (type) {
    case "QUOTATION":
      return ["INVOICE"];
    case "INVOICE":
      return ["RECEIPT", "TAX_INVOICE", "DELIVERY_ORDER", "CREDIT_NOTE"];
    case "RECEIPT":
      return ["TAX_INVOICE", "CREDIT_NOTE"];
    case "DELIVERY_ORDER":
      return ["INVOICE"];
    case "TAX_INVOICE":
      return ["CREDIT_NOTE"];
    default:
      return [];
  }
}

export function DocumentRowActions({ doc, dict: d, onPreview }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [confirmKind, setConfirmKind] = useState<null | "cancel" | "delete">(null);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();

  // Refresh the list (stats + rows) after any mutation.
  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const isCancelled = doc.status === "CANCELLED";
  const isCompleted = doc.status === "COMPLETED";
  const isDraft = doc.status === "DRAFT";
  const isPaid = doc.payment_status === "PAID";

  const convertTargets = convertTargetsFor(doc.type);
  const canPay =
    !isCancelled &&
    !isPaid &&
    (doc.type === "INVOICE" || (doc.type === "DELIVERY_ORDER" && !!doc.source_document_id));
  const canCancel = !isCancelled && !isCompleted;
  const canDelete = isDraft;

  function close() {
    setMenuOpen(false);
  }

  // Open the menu as a body portal anchored to the trigger button. This escapes the
  // row's opacity dimming + stacking context (cancelled rows use opacity-60, which
  // both fades the menu and traps it under the fixed backdrop) and the table's
  // overflow clip.
  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const MENU_W = 192; // w-48
      setMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - MENU_W) });
    }
    setMenuOpen(true);
  }

  // Re-fetch the full document (the list row carries no items) and POST a fresh
  // copy: same type / customer / items / pricing / discounts, but no document
  // number, dates, payment or workflow status (server assigns those anew).
  function handleDuplicate() {
    close();
    startTransition(async () => {
      try {
        const full = await getDocument(doc.id);
        const today = new Date().toISOString().slice(0, 10);
        await createDocument({
          type: full.type,
          customer_id: full.customer_id,
          ...(full.customer_id ? {} : { customer_name: full.customer_name }),
          document_date: today,
          vat_rate: full.vat_rate,
          notes: full.notes,
          items: full.items.map((it) => ({
            product_id: it.product_id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_type: it.discount_type,
            discount_value: it.discount_value,
          })),
        });
        refresh();
        toast.success(d.duplicateSuccess);
      } catch {
        toast.error(d.duplicateError);
      }
    });
  }

  function handlePdf() {
    close();
    startTransition(async () => {
      try {
        const blob = await getDocumentPdfBlob(doc.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.document_no_full || doc.document_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(d.pdfError);
      }
    });
  }

  function handleConvert(target: DocumentType) {
    close();
    startTransition(async () => {
      try {
        await convertDocument(doc.id, target);
        refresh();
        toast.success(d.convertSuccess);
      } catch {
        toast.error(d.convertError);
      }
    });
  }

  function handlePay() {
    close();
    // DELIVERY_ORDER settles its linked invoice; INVOICE settles itself.
    const targetId = doc.type === "DELIVERY_ORDER" ? doc.source_document_id : doc.id;
    if (!targetId) return;
    startTransition(async () => {
      try {
        await payInvoice(targetId);
        refresh();
        toast.success(d.paySuccess);
      } catch {
        toast.error(d.payError);
      }
    });
  }

  // Cancel / Delete open a themed confirmation modal (see render below) instead of
  // window.confirm; the actual mutation runs from the modal's onConfirm.
  function handleCancel() {
    close();
    setConfirmKind("cancel");
  }

  function handleDelete() {
    close();
    setConfirmKind("delete");
  }

  function runCancel() {
    startTransition(async () => {
      try {
        await cancelDocument(doc.id);
        refresh();
        toast.success(d.cancelSuccess);
      } catch {
        toast.error(d.cancelError);
      } finally {
        setConfirmKind(null);
      }
    });
  }

  function runDelete() {
    startTransition(async () => {
      try {
        await deleteDocument(doc.id);
        refresh();
        toast.success(d.deleteSuccess);
      } catch {
        toast.error(d.deleteError);
      } finally {
        setConfirmKind(null);
      }
    });
  }

  const convertLabel: Record<string, string> = {
    INVOICE: d.typeInvoice,
    RECEIPT: d.typeReceipt,
    TAX_INVOICE: d.typeTaxInvoice,
    CREDIT_NOTE: d.typeCreditNote,
    DELIVERY_ORDER: d.typeDeliveryOrder ?? "ใบส่งของ",
  };
  const convertIcon: Record<string, typeof FileText> = {
    INVOICE: FileText,
    RECEIPT: Receipt,
    TAX_INVOICE: FileBadge,
    CREDIT_NOTE: FileMinus,
    DELIVERY_ORDER: Truck,
  };

  return (
    <div ref={wrapRef} className="relative flex items-center gap-0.5">
      {/* Quick: duplicate */}
      <button
        title={d.duplicate}
        disabled={isPending}
        onClick={handleDuplicate}
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 disabled:opacity-40"
        type="button"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      </button>

      {/* Quick: open preview drawer (carries print / pdf / convert) */}
      <button
        title={d.printPreview}
        onClick={onPreview}
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
        type="button"
      >
        <Eye className="h-4 w-4" />
      </button>

      {/* Overflow menu */}
      <button
        ref={btnRef}
        title={d.moreOptions}
        onClick={toggleMenu}
        className={`rounded-md p-1.5 transition-colors hover:bg-violet-50 hover:text-violet-600 ${
          menuOpen ? "bg-violet-50 text-violet-600" : "text-slate-400"
        }`}
        type="button"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && menuPos && createPortal(
        <>
          {/* Outside-click catcher */}
          <div className="fixed inset-0 z-[70]" onClick={close} />
          <div
            className="fixed z-[71] w-48 overflow-hidden rounded-lg border border-violet-100 bg-white py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <MenuItem icon={Eye} label={d.printPreview} onClick={() => { close(); onPreview(); }} />
            <MenuItem icon={FileDown} label={d.downloadPDF} onClick={handlePdf} />
            <MenuItem icon={Copy} label={d.duplicate} onClick={handleDuplicate} />

            {convertTargets.length > 0 && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {d.convertTo}
                </p>
                {convertTargets.map((t) => {
                  const Icon = convertIcon[t] ?? ArrowRightLeft;
                  return (
                    <MenuItem
                      key={t}
                      icon={Icon}
                      label={convertLabel[t] ?? t}
                      onClick={() => handleConvert(t)}
                    />
                  );
                })}
              </>
            )}

            {(canPay || canCancel || canDelete) && <div className="my-1 border-t border-slate-100" />}
            {canPay && (
              <MenuItem icon={Wallet} label={d.recordPayment} onClick={handlePay} tone="emerald" />
            )}
            {canCancel && (
              <MenuItem icon={Ban} label={d.cancelDocument} onClick={handleCancel} tone="rose" />
            )}
            {canDelete && (
              <MenuItem icon={Trash2} label={d.delete} onClick={handleDelete} tone="rose" />
            )}
          </div>
        </>,
        document.body,
      )}

      {confirmKind && (
        <ConfirmModal
          open
          tone="danger"
          title={confirmKind === "cancel" ? d.cancelDocument : d.delete}
          message={confirmKind === "cancel" ? d.confirmCancelDoc : d.confirmDeleteDoc}
          confirmLabel={d.confirm}
          cancelLabel={d.cancel}
          loading={isPending}
          onConfirm={confirmKind === "cancel" ? runCancel : runDelete}
          onClose={() => setConfirmKind(null)}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "slate",
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  tone?: "slate" | "rose" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-600 hover:bg-rose-50"
      : tone === "emerald"
        ? "text-emerald-700 hover:bg-emerald-50"
        : "text-slate-700 hover:bg-violet-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5 opacity-70" />
      {label}
    </button>
  );
}
