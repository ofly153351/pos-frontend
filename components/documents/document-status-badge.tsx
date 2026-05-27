import type { DocumentStatus, PaymentStatus } from "@/types/document";

type DocDict = { statusDraft: string; statusPending: string; statusOverdue: string; statusCompleted: string; statusCancelled: string };
type PayDict = { paymentUnpaid: string; paymentPartial: string; paymentPaid: string };

const DOC_STATUS: Record<DocumentStatus, { className: string }> = {
  DRAFT:     { className: "bg-slate-100 text-slate-500" },
  PENDING:   { className: "bg-amber-100 text-amber-700" },
  OVERDUE:   { className: "bg-red-100 text-red-600 font-semibold" },
  COMPLETED: { className: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { className: "bg-slate-100 text-slate-400 line-through" },
};

const PAY_STATUS: Record<PaymentStatus, { className: string }> = {
  UNPAID:  { className: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  PARTIAL: { className: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
  PAID:    { className: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" },
};

export function DocumentStatusBadge({ status, dict }: { status: DocumentStatus; dict: DocDict }) {
  const cfg = DOC_STATUS[status];
  const label: Record<DocumentStatus, string> = {
    DRAFT: dict.statusDraft, PENDING: dict.statusPending, OVERDUE: dict.statusOverdue,
    COMPLETED: dict.statusCompleted, CANCELLED: dict.statusCancelled,
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {label[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status, dict }: { status: PaymentStatus; dict: PayDict }) {
  const cfg = PAY_STATUS[status];
  const label: Record<PaymentStatus, string> = {
    UNPAID: dict.paymentUnpaid, PARTIAL: dict.paymentPartial, PAID: dict.paymentPaid,
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {label[status]}
    </span>
  );
}
