import type { DocumentStatus, PaymentStatus } from "@/types/document";

type DocDict = {
  statusDraft: string;
  statusPending: string;
  statusOverdue: string;
  statusCompleted: string;
  statusCancelled: string;
  statusSent: string;
  statusAccepted: string;
  statusRejected: string;
  statusExpired: string;
  statusConverted: string;
  statusProcessing: string;
};
type PayDict = { paymentUnpaid: string; paymentPartial: string; paymentPaid: string };

const DOC_STATUS: Record<string, { className: string }> = {
  DRAFT: { className: "bg-slate-100 text-slate-500" },
  PENDING: { className: "bg-amber-100 text-amber-700" },
  SENT: { className: "bg-blue-100 text-blue-700" },
  ACCEPTED: { className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { className: "bg-red-100 text-red-600" },
  EXPIRED: { className: "bg-orange-100 text-orange-700" },
  OVERDUE: { className: "bg-red-100 text-red-600 font-semibold" },
  COMPLETED: { className: "bg-emerald-100 text-emerald-700" },
  CONVERTED: { className: "bg-violet-100 text-violet-700" },
  CANCELLED: { className: "bg-slate-100 text-slate-400 line-through" },
};

const PAY_STATUS: Record<string, { className: string }> = {
  UNPAID: { className: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  PARTIAL: { className: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
  PAID: { className: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" },
};

export function DocumentStatusBadge({ status, dict, isQuotation = false, isDeliveryOrder = false }: { status: DocumentStatus; dict: DocDict; isQuotation?: boolean; isDeliveryOrder?: boolean }) {
  if (isQuotation && status === "PENDING") {
    return <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">-</span>;
  }
  const cfg = DOC_STATUS[status] ?? { className: "bg-slate-100 text-slate-600" };
  const labels: Record<string, string> = {
    DRAFT: dict.statusDraft,
    PENDING: isDeliveryOrder ? dict.statusProcessing : dict.statusPending,
    SENT: dict.statusSent,
    ACCEPTED: dict.statusAccepted,
    REJECTED: dict.statusRejected,
    EXPIRED: dict.statusExpired,
    OVERDUE: dict.statusOverdue,
    COMPLETED: dict.statusCompleted,
    CONVERTED: dict.statusConverted,
    CANCELLED: dict.statusCancelled,
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {labels[status] ?? (status || "—")}
    </span>
  );
}

export function PaymentStatusBadge({ status, dict, isQuotation = false }: { status: PaymentStatus; dict: PayDict; isQuotation?: boolean }) {
  if (isQuotation) {
    return <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">-</span>;
  }
  const cfg = PAY_STATUS[status] ?? { className: "bg-slate-50 text-slate-500" };
  const labels: Record<string, string> = {
    UNPAID: dict.paymentUnpaid,
    PARTIAL: dict.paymentPartial,
    PAID: dict.paymentPaid,
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {labels[status] ?? (status || "—")}
    </span>
  );
}
