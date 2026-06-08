import { notFound } from "next/navigation";

import { InventoryManager } from "@/components/stock/inventory-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type InventoryPageProps = {
  params: Promise<{ locale: string }>;
};

// Inventory module — stock quantity management (levels, adjustment, movements).
// Product master-data lives at /stock and cannot adjust stock.
export default async function InventoryPage({ params }: InventoryPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <InventoryManager dictionary={dictionary.inventory} locale={locale} />;
}
