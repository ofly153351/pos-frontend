import { notFound } from "next/navigation";

import { StockCountManager } from "@/components/stock/stock-count-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type CountsPageProps = {
  params: Promise<{ locale: string }>;
};

// Stock Counting — physical count sessions, variance vs system, apply corrections.
export default async function StockCountsPage({ params }: CountsPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <StockCountManager dictionary={dictionary.count} locale={locale} />;
}
