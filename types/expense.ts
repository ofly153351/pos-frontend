// Mirrors the Go expense module API (pos-backend/internal/modules/expense).

export type ExpenseCategory = {
  id: string;
  store_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  store_id: string;
  /** ISO timestamp (a DATE column at midnight UTC) — display the date portion. */
  expense_date: string;
  category_id: string;
  category_name: string;
  description: string;
  amount: number;
  payment_method: string;
  note?: string;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseListResult = {
  items: Expense[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ExpenseCategoryTotal = {
  category_id: string;
  name: string;
  total: number;
};

export type ExpenseMonthTotal = {
  /** "YYYY-MM" */
  month: string;
  total: number;
};

export type ExpenseSummary = {
  monthly_total: number;
  monthly_count: number;
  average_amount: number;
  top_category_name: string;
  top_category_total: number;
  by_category: ExpenseCategoryTotal[];
  trend: ExpenseMonthTotal[];
};

export type CreateExpenseInput = {
  /** "YYYY-MM-DD" */
  expense_date: string;
  category_id: string;
  description: string;
  amount: number;
  payment_method: string;
  note?: string;
};

export type UpdateExpenseInput = Partial<CreateExpenseInput>;
