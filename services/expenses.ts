import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseListResult,
  ExpenseSummary,
  UpdateExpenseInput,
} from "@/types/expense";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function getExpenseSummary() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ExpenseSummary>(`/api/stores/${storeId}/expenses/summary`);
}

export type ListExpensesParams = {
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
};

export function listExpenses(params: ListExpensesParams = {}) {
  const storeId = ensureStoreId();
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.categoryId) qs.set("category_id", params.categoryId);
  if (params.paymentMethod) qs.set("payment_method", params.paymentMethod);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 200));
  return authorizedApiRequest<ExpenseListResult>(`/api/stores/${storeId}/expenses?${qs.toString()}`);
}

export function listExpenseCategories() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ExpenseCategory[]>(`/api/stores/${storeId}/expense-categories`);
}

export function createExpenseCategory(input: { name: string; sort_order?: number }) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ExpenseCategory>(`/api/stores/${storeId}/expense-categories`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function createExpense(input: CreateExpenseInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Expense>(`/api/stores/${storeId}/expenses`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function updateExpense(expenseId: string, input: UpdateExpenseInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Expense>(`/api/stores/${storeId}/expenses/${expenseId}`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function deleteExpense(expenseId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<null>(`/api/stores/${storeId}/expenses/${expenseId}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}
