import { notFound } from "next/navigation";

import { StockManager } from "@/components/stock/stock-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type InventoryPageProps = {
  params: Promise<{ locale: string }>;
};

// Stock / Inventory module — stock levels with adjustment + receiving enabled.
// (The Product master-data list lives at /stock and is read-only for stock.)
export default async function InventoryPage({ params }: InventoryPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <StockManager
      dictionary={dictionary.stock}
      initialSection="stock-levels"
      allowStockActions
    />
  );
}
