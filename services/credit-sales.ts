import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  AddCreditPaymentInput,
  CreateCreditSaleInput,
  CreditDebtSummary,
  CreditSale,
} from "@/types/credit-sale";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function listCreditSales() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale[]>(`/api/stores/${storeId}/credit-sales`);
}

export function getCreditSummary() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditDebtSummary>(`/api/stores/${storeId}/credit-sales/summary`);
}

export function getCreditSale(creditSaleId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale>(`/api/stores/${storeId}/credit-sales/${creditSaleId}`);
}

export function createCreditSale(input: CreateCreditSaleInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale>(`/api/stores/${storeId}/credit-sales`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function addCreditPayment(creditSaleId: string, input: AddCreditPaymentInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale>(
    `/api/stores/${storeId}/credit-sales/${creditSaleId}/payments`,
    { body: input, headers: { "Content-Type": "application/json" }, method: "POST" },
  );
}

export function cancelCreditSale(creditSaleId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale>(
    `/api/stores/${storeId}/credit-sales/${creditSaleId}/cancel`,
    { method: "POST" },
  );
}

// Same-origin BFF URL for the customer statement PDF (opened in a new tab; the
// auth cookie rides along and the BFF forwards it to the statement endpoint).
export function getCreditStatementUrl(creditSaleId: string): string {
  const storeId = ensureStoreId();
  return `/api/stores/${storeId}/credit-sales/${creditSaleId}/statement`;
}
