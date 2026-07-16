import { notFound } from "next/navigation";

import { WarehouseDashboard } from "@/components/warehouse/warehouse-dashboard";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type WarehouseOverviewPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WarehouseOverviewPage({ params }: WarehouseOverviewPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <WarehouseDashboard dictionary={dictionary.inventory.warehouseDashboard} locale={locale as Locale} />;
}
