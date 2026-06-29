import type { DocumentStatus, PaymentStatus } from "@/types/document";

type DocDict = { statusDraft: string; statusPending: string; statusOverdue: string; statusCompleted: string; statusCancelled: string };
type PayDict = { paymentUnpaid: string; paymentPartial: string; paymentPaid: string; paymentToggleHint?: string };

// One-click cycle for the quick toggle: unpaid/partial → paid → unpaid.
function nextPaymentStatus(current: PaymentStatus): PaymentStatus {
  return current === "PAID" ? "UNPAID" : "PAID";
}

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

export function PaymentStatusBadge({
  status,
  dict,
  onCycle,
}: {
  status: PaymentStatus;
  dict: PayDict;
  onCycle?: (next: PaymentStatus) => void;
}) {
  const cfg = PAY_STATUS[status];
  const label: Record<PaymentStatus, string> = {
    UNPAID: dict.paymentUnpaid, PARTIAL: dict.paymentPartial, PAID: dict.paymentPaid,
  };
  const base = `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`;

  if (!onCycle) {
    return <span className={base}>{label[status]}</span>;
  }
  // Clickable quick toggle — stop row-selection from firing.
  return (
    <button
      type="button"
      title={dict.paymentToggleHint ?? "คลิกเพื่อสลับสถานะชำระเงิน"}
      onClick={(e) => {
        e.stopPropagation();
        onCycle(nextPaymentStatus(status));
      }}
      className={`${base} cursor-pointer transition hover:brightness-95 hover:ring-2 hover:ring-violet-200`}
    >
      {label[status]}
    </button>
  );
}
