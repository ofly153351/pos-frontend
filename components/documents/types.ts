import type { DocumentType } from "@/types/document";
import type { DocumentListQuery } from "@/types/document";
import type { SalesHistoryDict } from "@/components/sales/sales-history-dict";
import type { DateFilterValue } from "@/components/shared/date-range-filter";
import type { cancelDocument } from "@/services/documents";
import type { DocumentListItem } from "@/types/document";
import type { DocumentStats } from "@/types/document";
import type { DocumentStatus } from "@/types/document";
import type { RelatedDocument } from "@/types/document";
import type { SalesDictionary } from "@/components/sales/types";

export type CreateDocumentModalDict = {
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  customerSearchPlaceholder: string;
  deliveryOrderSelectLabel: string;
  deliveryOrderSelectPlaceholder: string;
  deliveryOrderSearchPlaceholder: string;
  deliveryOrderNoMatch: string;
  deliveryOrderNumber: string;
  noDeliveryOrdersSelected: string;
  removeItem: string;
  noCustomersFound: string;
  documentDate: string;
  optionalDueDate: string;
  validUntil?: string;
  priceValidityDays?: string;
  deliveryTerms?: string;
  deliveryLeadTimeDays?: string;
  poReceivedDate?: string;
  description: string;
  productSearch: string;
  scanWithCamera: string;
  productNotFound: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  addItem: string;
  enableVat: string;
  notes: string;
  subtotal: string;
  total: string;
  cancel: string;
  create: string;
  creating?: string;
  createSuccess: string;
  createError: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
  selectShippingAddressLabel?: string;
};

export type CreateDocumentModalLineItem = {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_type: "" | "PERCENT" | "AMOUNT";
  discount_value: number;
};

export type CreateDocumentModalProps = {
  dict: CreateDocumentModalDict;
  initialType: DocumentType;
  onClose: () => void;
  onSuccess: () => void;
};

export type DocumentFilterBarDict = {
  searchPlaceholder: string;
  filter: string;
  resetFilter: string;
  allTypes: string;
  allStatuses: string;
  allPayments: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
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
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
};

export type DocumentFilterBarProps = {
  dict: DocumentFilterBarDict;
  salesDict: SalesHistoryDict;
  query: DocumentListQuery;
  dateFilter: DateFilterValue;
  onDateFilterChange: (value: DateFilterValue) => void;
  onChange: (q: Partial<DocumentListQuery>) => void;
  onReset: () => void;
  locale?: string;
};

export type DocumentPageClientDocumentDict = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  filter: string;
  resetFilter: string;
  allTypes: string;
  allStatuses: string;
  allCustomers: string;
  allStaff: string;
  allPayments: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder: string;
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
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
  statsTotal: string;
  statsPending: string;
  statsOverdue: string;
  statsPaid: string;
  exportExcel: string;
  printReport: string;
  createDocument: string;
  selectedCount: string;
  print: string;
  send: string;
  changeStatus: string;
  delete: string;
  cancelSelection: string;
  colDocumentNo: string;
  colType: string;
  colCustomer: string;
  colDate: string;
  colDueDate: string;
  colAmount: string;
  colStatus: string;
  colPaymentStatus: string;
  colActions: string;
  showing: string;
  of: string;
  records: string;
  perPage: string;
  copy: string;
  moreOptions: string;
  deliveryDate: string;
  poReference: string;
  poReferencePlaceholder: string;
  invoiceReference: string;
  completeDelivery: string;
  deliveryCompleteSuccess: string;
  deliveryCompleteError: string;
  previewTitle: string;
  receiptTemplateTitle: string;
  receiptTemplateDescription: string;
  receiptTemplate1Description: string;
  receiptTemplate2Description: string;
  receiptTemplateLabel: string;
  receiptTemplate1: string;
  receiptTemplate2: string;
  documentNo: string;
  date: string;
  dueDate: string;
  customer: string;
  items: string;
  subtotal: string;
  vat: string;
  total: string;
  relatedDocs: string;
  viewFull: string;
  downloadPDF: string;
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  customerSearchPlaceholder: string;
  deliveryOrderSelectLabel: string;
  deliveryOrderSelectPlaceholder: string;
  deliveryOrderSearchPlaceholder: string;
  deliveryOrderNoMatch: string;
  deliveryOrderNumber: string;
  noDeliveryOrdersSelected: string;
  removeItem: string;
  noCustomersFound: string;
  documentDate: string;
  optionalDueDate: string;
  priceValidityDays: string;
  deliveryTerms: string;
  deliveryLeadTimeDays: string;
  poReceivedDate: string;
  addItem: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  enableVat: string;
  notes: string;
  cancel: string;
  create: string;
  createSuccess: string;
  createError: string;
  deleteSuccess: string;
  deleteError: string;
  statusUpdateSuccess: string;
  statusUpdateError: string;
  noDocuments: string;
  noDocumentsHint: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  confirm: string;
  units: string;
  phone: string;
  sellerTaxId: string;
  loading: string;
  requestFailed: string;
  noResults: string;
  tabDocuments: string;
  tabReceipts: string;
  receiptPaymentMethod: string;
  receiptViewBtn: string;
  receiptInvoiceBtn: string;
  receiptEmpty: string;
  receiptLoadError: string;
  receiptStatsTotal: string;
  receiptStatsPaid: string;
  receiptStatsAmount: string;
  receiptModeName: string;
  printAll: string;
  printError: string;
  productSearch: string;
  scanWithCamera: string;
  productNotFound: string;
  // Row actions + bulk (Phase 1)
  duplicate: string;
  duplicateSuccess: string;
  duplicateError: string;
  printPreview: string;
  convertTo: string;
  recordPayment: string;
  paySuccess: string;
  payError: string;
  cancelDocument: string;
  cancelSuccess: string;
  cancelError: string;
  confirmCancelDoc: string;
  confirmDeleteDoc: string;
  convertSuccess: string;
  convertError: string;
  pdfError: string;
  comingSoon: string;
  email: string;
  share: string;
};

export type DocumentPageClientProps = { dictionary: DocumentPageClientDocumentDict; salesDict: SalesHistoryDict };

export type DocumentPreviewPanelDict = {
  previewTitle: string;
  viewFull: string;
  loading: string;
  relatedDocs: string;
  email: string;
  share: string;
  comingSoon: string;
  moreOptions: string;
  print: string;
  receiptTemplateTitle: string;
  receiptTemplateDescription: string;
  receiptTemplate1: string;
  receiptTemplate1Description: string;
  receiptTemplate2Description: string;
  receiptTemplate2: string;
  receiptTemplateLabel: string;
  deliveryDate: string;
  poReference: string;
  poReferencePlaceholder: string;
  invoiceReference: string;
  completeDelivery: string;
  deliveryCompleteSuccess: string;
  deliveryCompleteError: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder: string;
  cancel: string;
  confirm: string;
  cancelDocument: string;
  confirmCancelDoc: string;
  cancelSuccess: string;
  cancelError: string;
};

export type DocumentPreviewPanelProps = {
  documentId: string;
  documentNo?: string;
  documentType?: DocumentType;
  paymentStatus?: string;      // "UNPAID" | "PARTIAL" | "PAID"
  documentStatus?: string;     // "PENDING" | "COMPLETED" | "CANCELLED" | ...

  dict: DocumentPreviewPanelDict;
  onClose: () => void;
  onNavigate?: (id: string) => void; // jump to another document in the lineage
};

export type DocumentPrintClientDict = {
  loading: string;
  requestFailed: string;
  print: string;
  cancel: string;
  noDocuments: string;
};

export type DocumentPrintClientProps = {
  documentId: string;
  dict: DocumentPrintClientDict;
  copy?: number; // 0-based copy index; -1/undefined = whole set
};

export type DocumentRowActionsRowActionsDict = {
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

export type DocumentRowActionsProps = {
  doc: DocumentListItem;
  dict: DocumentRowActionsRowActionsDict;
  // Opens the shared preview drawer (which itself carries print / PDF / convert).
  onPreview: () => void;
};

export type DocumentStatsCardsDict = {
  statsTotal: string;
  statsPending: string;
  statsOverdue: string;
  statsPaid: string;
  exportExcel: string;
  printReport: string;
  createDocument: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
};

export type DocumentStatsCardsProps = {
  dict: DocumentStatsCardsDict;
  stats: DocumentStats;
  defaultCreateType?: DocumentType;
  onExport: () => void;
  onPrint: () => void;
  onCreateDocument: (type: DocumentType) => void;
};

export type DocumentStatusBadgeDocDict = {
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

export type DocumentStatusBadgePayDict = { paymentUnpaid: string; paymentPartial: string; paymentPaid: string };

export type DocumentTableDict = {
  colDocumentNo: string;
  colType: string;
  colCustomer: string;
  colDate: string;
  colDueDate: string;
  colAmount: string;
  colStatus: string;
  colPaymentStatus: string;
  colActions: string;
  showing: string;
  of: string;
  records: string;
  perPage: string;
  copy: string;
  print: string;
  moreOptions: string;
  send: string;
  selectedCount: string;
  changeStatus: string;
  delete: string;
  cancelSelection: string;
  loading: string;
  noDocuments: string;
  noDocumentsHint: string;
  noResults: string;
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
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
  createDocument: string;
  // Row actions + bulk
  duplicate: string;
  duplicateSuccess: string;
  duplicateError: string;
  printPreview: string;
  downloadPDF: string;
  convertTo: string;
  recordPayment: string;
  paySuccess: string;
  payError: string;
  cancelDocument: string;
  cancelSuccess: string;
  cancelError: string;
  confirmCancelDoc: string;
  deleteSuccess: string;
  deleteError: string;
  confirmDeleteDoc: string;
  convertSuccess: string;
  convertError: string;
  pdfError: string;
  comingSoon: string;
  printAll: string;
  printError: string;
  cancel: string;
  confirm: string;
};

export type DocumentTableProps = {
  dict: DocumentTableDict;
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  selectedDocId: string | null;
  selectedIds: Set<string>;
  onSelectDoc: (id: string) => void;
  onToggleId: (id: string) => void;
  onToggleAll: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onBulkDelete: () => void;
  onBulkStatus: (status: DocumentStatus) => void;
  onClearSelection: () => void;
  onCreateDocument: () => void;
  isBulkPending?: boolean;
};

export type DocumentTimelineTypeLabels = {
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
};

export type DocumentTimelineProps = {
  items: RelatedDocument[];
  currentId: string;
  label: string;
  typeLabels: DocumentTimelineTypeLabels;
  onSelect?: (id: string) => void;
};

export type DocumentTypeBadgeDict = {
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  typeDeliveryOrder?: string;
};

export type DocumentTypeBadgeConfig = { label: string; className: string; darkClassName: string; icon: React.ComponentType<{ className?: string }> };

export type DocumentTypeBadgeProps = { type: DocumentType; dict: DocumentTypeBadgeDict; onDark?: boolean; compact?: boolean };

export type DocumentsManagerDocumentsManagerProps = {
  dictionary: SalesDictionary;
  salesDict: SalesHistoryDict;
  mode?: "all" | "pending";
};

export type DocumentsManagerDocumentLineItem = {
  id?: string;
  line_total?: number | null;
  product_id?: string | null;
  product_name?: string | null;
  quantity: number;
  total_amount?: number | null;
  unit_price?: number | null;
};

export type DocumentsManagerInvoiceStatus = "unpaid" | "partially_paid" | "paid";
