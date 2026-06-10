import { notFound } from "next/navigation";

import { InventoryManager } from "@/components/stock/inventory-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type InventoryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

// Inventory module — stock quantity management (levels, adjustment, movements).
// Product master-data lives at /stock and cannot adjust stock.
export default async function InventoryPage({ params, searchParams }: InventoryPageProps) {
  const { locale } = await params;
  const { status } = await searchParams;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <InventoryManager dictionary={dictionary.inventory} locale={locale} initialStatus={status} />;
}
