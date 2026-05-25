import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { StorageLocationPage } from "@/components/warehouse/storage-location-page";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function StorageLocationsPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <StorageLocationPage dictionary={dictionary.storageLocations} locale={locale} />;
}
