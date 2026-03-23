import { notFound } from "next/navigation";

import { SalesManager } from "@/components/sales/sales-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type SalesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SalesPage({ params }: SalesPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <SalesManager dictionary={dictionary.sales} />;
}
