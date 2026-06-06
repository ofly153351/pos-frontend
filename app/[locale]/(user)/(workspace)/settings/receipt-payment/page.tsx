import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { ReceiptPaymentSettings } from "@/components/settings/receipt-payment-settings";

type Props = { params: Promise<{ locale: string }> };

export default async function ReceiptPaymentPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <ReceiptPaymentSettings t={dictionary.receiptSettings} />;
}
