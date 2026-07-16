import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  AddCreditPaymentInput,
  CreateCreditSaleInput,
  CreditDebtSummary,
  CreditSale,
  ReturnCreditGoodsInput,
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

// The optional idempotency key makes a network-retried / double-submitted credit sale
// safe — the backend returns the original receivable instead of minting a second real
// (stock-deducting) sale + second AR for one cart.
export function createCreditSale(input: CreateCreditSaleInput, idempotencyKey?: string) {
  const storeId = ensureStoreId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return authorizedApiRequest<CreditSale>(`/api/stores/${storeId}/credit-sales`, {
    body: input,
    headers,
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

// Loan return: restock the listed borrowed goods and settle the receivable by their value.
export function returnCreditGoods(creditSaleId: string, input: ReturnCreditGoodsInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<CreditSale>(
    `/api/stores/${storeId}/credit-sales/${creditSaleId}/returns`,
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

// Same-origin BFF URL for the credit-sale billing notice (ใบวางบิล) rendered as
// HTML by the shared document template. Loaded into a modal iframe for in-place
// preview + print (no new tab); the auth cookie rides along to the BFF.
export function getCreditSaleBillUrl(creditSaleId: string): string {
  const storeId = ensureStoreId();
  return `/api/stores/${storeId}/credit-sales/${creditSaleId}/bill`;
}
