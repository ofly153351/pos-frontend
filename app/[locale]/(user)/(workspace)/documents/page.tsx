import { notFound } from "next/navigation";

import { DocumentsManager } from "@/components/documents/documents-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type DocumentsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);
  return <DocumentsManager dictionary={dictionary.sales} />;
}
