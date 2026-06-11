import { notFound } from "next/navigation";

import { ExpenseManager } from "@/components/finance/expense-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ExpensesPageProps = {
  params: Promise<{ locale: string }>;
};

// Finance → Expense Records. CRUD over real expenses (Go backend), with monthly
// KPIs, by-category + 6-month trend, all from live data.
export default async function ExpensesPage({ params }: ExpensesPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ExpenseManager dictionary={dictionary.financeExpenses} locale={locale} />;
}
