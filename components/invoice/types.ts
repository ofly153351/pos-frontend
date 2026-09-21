import type { Sale } from "@/types/sale";

export type InvoiceA4InvoiceDict = {
  title: string;
  combinedTitle: string;
  invoiceNo: string;
  date: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  seller: string;
  sellerTaxId: string;
  notConfigured: string;
  no: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotal: string;
  itemDiscount: string;
  billDiscount: string;
  beforeVat: string;
  vat: string;
  total: string;
  note: string;
  originalCopy: string;
  generalCustomer: string;
  cash: string;
  transfer: string;
  card: string;
  promptpay: string;
  vatIncluded: string;
  vatExcluded: string;
};

export type InvoiceA4Props = {
  sale: Sale;
  dict: InvoiceA4InvoiceDict;
  invoiceNo: string;
};

export type InvoicePrintClientInvoiceDict = {
  title: string;
  shortTitle: string;
  taxInvoiceTitle: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  seller: string;
  sellerTaxId: string;
  buyerTaxId: string;
  notConfigured: string;
  combinedTitle: string;
  no: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotal: string;
  itemDiscount: string;
  billDiscount: string;
  beforeVat: string;
  vat: string;
  total: string;
  note: string;
  originalCopy: string;
  formatFull: string;
  formatShort: string;
  print: string;
  close: string;
  loading: string;
  notFound: string;
  generalCustomer: string;
  cash: string;
  transfer: string;
  card: string;
  promptpay: string;
  vatIncluded: string;
  vatExcluded: string;
  page: string;
  of: string;
};

export type InvoicePrintClientProps = {
  saleId: string;
  dict: InvoicePrintClientInvoiceDict;
};

export type InvoicePrintClientFormat = "full" | "short";

export type InvoiceShortInvoiceDict = {
  shortTitle: string;
  taxInvoiceTitle: string;
  invoiceNo: string;
  date: string;
  reference: string;
  customer: string;
  phone: string;
  cashier: string;
  paymentMethod: string;
  sellerTaxId: string;
  notConfigured: string;
  no: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  subtotal: string;
  itemDiscount: string;
  billDiscount: string;
  beforeVat: string;
  vat: string;
  total: string;
  note: string;
  generalCustomer: string;
  cash: string;
  transfer: string;
  card: string;
  promptpay: string;
  vatIncluded: string;
  vatExcluded: string;
};

export type InvoiceShortProps = {
  sale: Sale;
  dict: InvoiceShortInvoiceDict;
  invoiceNo: string;
};

export type SignatureBlockProps = {
  leftTH: string;
  leftEN: string;
  rightTH?: string;
  rightEN?: string;
};
