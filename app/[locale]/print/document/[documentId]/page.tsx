import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { DocumentPrintClient } from "@/components/documents/document-print-client";

type PageProps = {
  params: Promise<{ locale: string; documentId: string }>;
  searchParams: Promise<{ copy?: string }>;
};

export default async function DocumentPrintPage({ params, searchParams }: PageProps) {
  const { locale, documentId } = await params;
  const { copy } = await searchParams;
  if (!isSupportedLocale(locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  const copyIdx = copy != null && copy !== "" ? Number(copy) : -1;
  return <DocumentPrintClient documentId={documentId} dict={dict.documents} copy={Number.isNaN(copyIdx) ? -1 : copyIdx} />;
}
