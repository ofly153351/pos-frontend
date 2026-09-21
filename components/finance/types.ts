import type { Expense } from "@/types/expense";
import type { ExpenseCategory } from "@/types/expense";
import type { ExpenseDictionary } from "@/components/finance/finance-types";
import type { PnlDictionary } from "@/components/finance/pnl-types";

export type ExpenseFormModalProps = {
  dictionary: ExpenseDictionary;
  categories: ExpenseCategory[];
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  /** Called after a new category is created so the parent can refetch its list. */
  onCategoryCreated?: () => void;
};

export type ExpenseFormModalFormErrors = Partial<Record<"expense_date" | "category_id" | "description" | "amount", string>>;

export type ExpenseManagerProps = { dictionary: ExpenseDictionary; locale: string };

export type PnlManagerProps = { dictionary: PnlDictionary; locale: string };

export type RevenueCostProfitBarsRcpRow = {
  label: string;
  value: number;
  tone: "revenue" | "cost" | "profit";
};

export type ExpenseManagerKpiItem = { label: string; value: string; icon: import("lucide-react").LucideIcon; iconBg: string; iconColor: string; hint?: string };

export type PnlManagerKpiItem = {
  label: string;
  value: string;
  icon: import("lucide-react").LucideIcon;
  iconBg: string;
  iconColor: string;
  hint?: string;
  emphasis?: boolean;
  warning?: boolean;
  valueTone?: "default" | "danger";
};

export type PnlManagerFlowStep = {
  key: string;
  label: string;
  value: number;
  icon: import("lucide-react").LucideIcon;
  tone: "revenue" | "cost" | "profit";
  result?: boolean;
  badge?: string;
};

export type PnlManagerInsight = { key: string; tone: "danger" | "warning" | "success" | "info"; title: string; desc: string };
