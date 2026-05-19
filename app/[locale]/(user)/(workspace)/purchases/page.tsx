import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { PurchasesContent } from "./content";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PurchasesPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <PurchasesContent dictionary={dictionary.purchasing} />;
}
