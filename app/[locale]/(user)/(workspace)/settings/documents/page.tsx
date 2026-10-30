import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { DocumentTemplatesSettings } from "@/components/settings/document-templates-settings";

type Props = { params: Promise<{ locale: string }> };

export default async function DocumentTemplatesPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <DocumentTemplatesSettings t={dictionary.documentTemplates} />;
}
