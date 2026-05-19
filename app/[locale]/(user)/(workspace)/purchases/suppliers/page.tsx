import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { SupplierManager } from "@/components/purchasing/supplier-manager";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SuppliersPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <SupplierManager dictionary={dictionary.purchasing} />;
}
