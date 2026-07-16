import { notFound } from "next/navigation";

import { PnlManager } from "@/components/finance/pnl-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type PnlPageProps = {
  params: Promise<{ locale: string }>;
};

// Finance → Profit & Loss. Real-data P&L (sales revenue, COGS at product cost,
// real operating expenses) over a 7/30/90-day or custom window.
export default async function PnlPage({ params }: PnlPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <PnlManager dictionary={dictionary.financePnl} locale={locale} />;
}
