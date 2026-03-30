import { notFound } from "next/navigation";

import { DashboardManager } from "@/components/dashboard/dashboard-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <DashboardManager dictionary={dictionary.dashboard} locale={locale} />;
}
