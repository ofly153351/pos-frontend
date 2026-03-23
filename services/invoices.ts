import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest, authorizedRawRequest } from "@/services/api";
import type {
  CreateInvoiceInput,
  CreateInvoicePaymentInput,
  Invoice,
} from "@/types/invoice";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

export function listInvoices() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Invoice[]>(`/api/stores/${storeId}/invoices`);
}

export function getInvoiceById(invoiceId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Invoice>(`/api/stores/${storeId}/invoices/${invoiceId}`);
}

export function createInvoice(input: CreateInvoiceInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Invoice>(`/api/stores/${storeId}/invoices`, {
    body: input,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function createInvoicePayment(
  invoiceId: string,
  input: CreateInvoicePaymentInput,
) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Invoice>(
    `/api/stores/${storeId}/invoices/${invoiceId}/payments`,
    {
      body: input,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function downloadInvoicePdf(invoiceId: string) {
  const storeId = ensureStoreId();
  return authorizedRawRequest<Blob>(
    `/api/stores/${storeId}/invoices/${invoiceId}/pdf`,
    {
      method: "GET",
      responseType: "blob",
    },
  );
}
