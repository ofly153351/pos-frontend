import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { DocumentPageClient } from "@/components/documents/document-page-client";

type PageProps = { params: Promise<{ locale: string }> };

export default async function DocumentsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  // salesHistory dict is threaded so the "ใบเสร็จร้านค้า" tab reuses SalesHistoryManager
  // (full sale-detail modal: print / tax invoice / void / return + Thai payment labels).
  return <DocumentPageClient dictionary={dict.documents} salesDict={dict.salesHistory} />;
}
