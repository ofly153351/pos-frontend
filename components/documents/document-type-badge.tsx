import { FileBadge, FileDigit, FileMinus, FileQuestion, FileText, Receipt, Truck } from "lucide-react";
import type { DocumentType } from "@/types/document";

type Dict = {
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
};

type Config = { label: string; className: string; darkClassName: string; icon: React.ComponentType<{ className?: string }> };

function getConfig(type: DocumentType, d: Dict): Config {
  switch (type) {
    case "INVOICE":     return { label: d.typeInvoice,    className: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",   darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: FileText };
    case "RECEIPT":     return { label: d.typeReceipt,    className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200", darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: Receipt };
    case "TAX_INVOICE": return { label: d.typeTaxInvoice, className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",         darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: FileBadge };
    case "QUOTATION":   return { label: d.typeQuotation,  className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",      darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: FileQuestion };
    case "BILL":        return { label: d.typeBill,       className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",      darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: FileDigit };
    case "CREDIT_NOTE":    return { label: d.typeCreditNote,     className: "bg-red-100 text-red-600 ring-1 ring-red-200",       darkClassName: "bg-white/20 text-white ring-1 ring-white/30",  icon: FileMinus };
    case "DELIVERY_ORDER": return { label: d.typeDeliveryOrder ?? "ใบส่งของ", className: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200", darkClassName: "bg-white/20 text-white ring-1 ring-white/30", icon: Truck };
  }
}

type Props = { type: DocumentType; dict: Dict; onDark?: boolean; compact?: boolean };

export function DocumentTypeBadge({ type, dict, onDark, compact }: Props) {
  const cfg = getConfig(type, dict);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${onDark ? cfg.darkClassName : cfg.className}`}>
      {!compact && <Icon className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}
