import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { WarehousesContent } from "./content";

type WarehousesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WarehousesPage({ params }: WarehousesPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <WarehousesContent
      dictionary={dictionary.warehouseInventory}
      transferDict={dictionary.stock.warehouses}
      adjustDict={dictionary.inventory.adjust}
      locale={locale}
    />
  );
}
