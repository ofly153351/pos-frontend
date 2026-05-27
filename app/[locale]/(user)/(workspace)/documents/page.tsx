import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { DocumentPageClient } from "@/components/documents/document-page-client";

type PageProps = { params: Promise<{ locale: string }> };

export default async function DocumentsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  return <DocumentPageClient dictionary={dict.documents} />;
}
