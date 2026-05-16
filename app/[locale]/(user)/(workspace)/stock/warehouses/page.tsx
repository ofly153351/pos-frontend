import { notFound } from "next/navigation";

import { WarehouseSection } from "@/components/stock/warehouse-section";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

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
    <div className="mx-auto max-w-6xl">
      <WarehouseSection dictionary={dictionary.stock.warehouses} />
    </div>
  );
}
