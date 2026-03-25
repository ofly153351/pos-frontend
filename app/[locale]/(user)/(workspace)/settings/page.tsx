import { notFound } from "next/navigation";

import { StoreManagementPanel } from "@/components/store/store-management-panel";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type StoreSettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StoreSettingsPage({ params }: StoreSettingsPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <StoreManagementPanel
      dictionary={dictionary.storeManagement}
    />
  );
}
