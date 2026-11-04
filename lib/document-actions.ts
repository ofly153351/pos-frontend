// Shared document action rules (B22). Mirrors the backend so every menu offers
// the same actions; the backend re-validates every request.
//   - conversions: document/service.go allowedConversions
//   - eligible sources: document/transitions.go CanBeSource
//   - status changes: document/transitions.go CanTransition
//   - payable: document/payments.go payableTarget
import type { DocumentType } from "@/types/document";

const CONVERSIONS: Partial<Record<DocumentType, DocumentType[]>> = {
  QUOTATION: ["INVOICE"],
  INVOICE: ["RECEIPT", "TAX_INVOICE", "DELIVERY_ORDER", "CREDIT_NOTE"],
  RECEIPT: ["TAX_INVOICE", "CREDIT_NOTE"],
  DELIVERY_ORDER: ["INVOICE", "RECEIPT"],
  BILL: ["RECEIPT"],
  TAX_INVOICE: ["CREDIT_NOTE"],
};

const CLOSED = new Set(["CANCELLED", "REJECTED", "EXPIRED", "CONVERTED"]);
const TERMINAL = new Set(["COMPLETED", "CANCELLED", "CONVERTED", "REJECTED", "EXPIRED"]);

export function conversionTargets(type: DocumentType, status: string): DocumentType[] {
  if (CLOSED.has(status)) return [];
  return CONVERSIONS[type] ?? [];
}

export function canRecordPayment(type: DocumentType, status: string, paymentStatus?: string): boolean {
  if (type === "QUOTATION" || type === "CREDIT_NOTE" || type === "RECEIPT") return false;
  return !CLOSED.has(status) && paymentStatus !== "PAID";
}

export function canCancel(status: string): boolean {
  return !TERMINAL.has(status);
}
