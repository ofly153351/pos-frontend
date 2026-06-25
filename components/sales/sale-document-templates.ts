import {
  Download,
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Receipt,
  ScrollText,
  Share2,
  Truck,
  type LucideIcon,
} from "lucide-react";

/**
 * Document Template Engine — config-driven registry of every business document
 * one sale transaction can produce. The Sales-History detail viewer renders this
 * list as a document switcher; the preview modal renders the chosen template.
 *
 * Adding a document type = append one row here (+ a render `source`). Layout and
 * transaction data are shared; only the template differs. Nothing is hard-coded.
 */

export type SaleDocumentKind =
  | "RECEIPT"
  | "TAX_FULL"
  | "TAX_SHORT"
  | "DELIVERY"
  | "QUOTATION"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

/**
 * Where the rendered document comes from — the single source of truth.
 * `sale-doc` reuses the SAME backend templates the Documents menu prints
 * (internal/platform/dochtml), so forms are identical across the app.
 */
export type SaleDocumentSource =
  // Backend 80mm thermal receipt HTML (GET /sales/:id/receipt). Doubles as the
  // abbreviated tax invoice (ใบกำกับภาษีอย่างย่อ).
  | { mode: "receipt-html" }
  // Backend document form rendered from the sale (GET /sales/:id/document?type=).
  // docType is a dochtml DocumentType: TAX_INVOICE | QUOTATION | DELIVERY_ORDER | …
  | { mode: "sale-doc"; docType: string }
  // Template registered but not wired yet (future-ready in the UI).
  | { mode: "future" };

export type SaleDocumentTemplate = {
  kind: SaleDocumentKind;
  /** i18n key inside the `salesHistory` dictionary. */
  labelKey: string;
  icon: LucideIcon;
  source: SaleDocumentSource;
};

export const SALE_DOCUMENT_TEMPLATES: SaleDocumentTemplate[] = [
  { kind: "RECEIPT", labelKey: "docReceipt", icon: Receipt, source: { mode: "receipt-html" } },
  { kind: "TAX_FULL", labelKey: "docTaxFull", icon: FileText, source: { mode: "sale-doc", docType: "TAX_INVOICE" } },
  { kind: "TAX_SHORT", labelKey: "docTaxShort", icon: ScrollText, source: { mode: "receipt-html" } },
  { kind: "DELIVERY", labelKey: "docDelivery", icon: Truck, source: { mode: "sale-doc", docType: "DELIVERY_ORDER" } },
  { kind: "QUOTATION", labelKey: "docQuotation", icon: FileSpreadsheet, source: { mode: "sale-doc", docType: "QUOTATION" } },
  { kind: "CREDIT_NOTE", labelKey: "docCreditNote", icon: FileMinus, source: { mode: "sale-doc", docType: "CREDIT_NOTE" } },
  { kind: "DEBIT_NOTE", labelKey: "docDebitNote", icon: FilePlus, source: { mode: "sale-doc", docType: "DEBIT_NOTE" } },
];

export function isDocumentAvailable(t: SaleDocumentTemplate): boolean {
  return t.source.mode !== "future";
}

/**
 * Document Actions — layered on top of rendering. Every available document
 * supports these. To add Email / LINE / etc. later, append a row here and add a
 * branch in the modal's action dispatcher — no rendering logic is duplicated.
 */
export type DocumentActionKind = "print" | "pdf" | "share" | "email" | "line";

export type DocumentActionDef = {
  kind: DocumentActionKind;
  labelKey: string;
  icon: LucideIcon;
  /** Not wired to a backend yet — shown but only surfaces a "coming soon" notice. */
  future?: boolean;
};

export const DOCUMENT_ACTIONS: DocumentActionDef[] = [
  { kind: "print", labelKey: "actPrint", icon: Printer },
  { kind: "pdf", labelKey: "actPdf", icon: Download },
  { kind: "share", labelKey: "actShare", icon: Share2 },
  { kind: "email", labelKey: "actEmail", icon: Mail, future: true },
  { kind: "line", labelKey: "actLine", icon: MessageCircle, future: true },
];
