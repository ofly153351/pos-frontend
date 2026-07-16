import { notFound } from "next/navigation";

import { SummaryManager } from "@/components/reports/summary-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type SummaryPageProps = {
  params: Promise<{ locale: string }>;
};

// Reports → Executive Summary. Single-page business overview (real sales, COGS,
// expenses, inventory) over a 7/30/90-day or custom window.
export default async function SummaryPage({ params }: SummaryPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <SummaryManager dictionary={dictionary.summaryReport} locale={locale} />;
}
