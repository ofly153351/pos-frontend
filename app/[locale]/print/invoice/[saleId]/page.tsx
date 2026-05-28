import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { InvoicePrintClient } from "@/components/invoice/invoice-print-client";

type PageProps = {
  params: Promise<{ locale: string; saleId: string }>;
};

export default async function InvoicePrintPage({ params }: PageProps) {
  const { locale, saleId } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dict = await getDictionary(locale as Locale);
  return <InvoicePrintClient saleId={saleId} dict={dict.invoice} />;
}
