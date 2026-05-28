import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { DocumentPrintClient } from "@/components/documents/document-print-client";

type PageProps = {
  params: Promise<{ locale: string; documentId: string }>;
};

export default async function DocumentPrintPage({ params }: PageProps) {
  const { locale, documentId } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  return <DocumentPrintClient documentId={documentId} dict={dict.documents} />;
}
