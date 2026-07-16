import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest, authorizedRawRequest } from "@/services/api";
import type {
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

// Phase W5 — the legacy invoice-CREATE service is removed: it was orphaned (no caller)
// and the backend endpoint is disabled (ErrInvoiceCreateDisabled). Live invoice creation
// goes through the documents module; invoice reads/payments/PDF below remain active.

export function createInvoicePayment(
  invoiceId: string,
  input: CreateInvoicePaymentInput,
) {
  const storeId = ensureStoreId();
  const body = new FormData();
  body.set("paid_amount", String(input.paid_amount));
  body.set("payment_method", input.payment_method);

  if (input.note) {
    body.set("note", input.note);
  }

  if (input.proof) {
    body.set("proof", input.proof);
  }

  return authorizedApiRequest<Invoice>(
    `/api/stores/${storeId}/invoices/${invoiceId}/payments`,
    {
      body,
      method: "POST",
    },
  );
}

export function unpayInvoice(invoiceId: string, reason: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Invoice>(
    `/api/stores/${storeId}/invoices/${invoiceId}/unpay`,
    {
      body: { reason },
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
}

export function getInvoicePaymentProofPath(invoiceId: string, paymentId: string) {
  const storeId = ensureStoreId();
  return `/api/stores/${storeId}/invoices/${invoiceId}/payments/${paymentId}/proof`;
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
