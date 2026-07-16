import { notFound } from "next/navigation";

import { InventoryValueManager } from "@/components/reports/inventory-value-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type InventoryValuePageProps = {
  params: Promise<{ locale: string }>;
};

// Reports → Inventory Value & Dead Stock.
// Inventory cost/value, value-by-category, top sellers (30d) and dead-stock
// (tied-up capital) — all derived from live product + sales data.
export default async function InventoryValuePage({ params }: InventoryValuePageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <InventoryValueManager dictionary={dictionary.reportsInventory} locale={locale} />;
}
