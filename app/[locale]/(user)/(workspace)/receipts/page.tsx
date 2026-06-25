import { notFound } from "next/navigation";

import { SalesHistoryManager } from "@/components/sales/sales-history-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type Props = { params: Promise<{ locale: string }> };

export default async function ReceiptsPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <SalesHistoryManager dict={dictionary.salesHistory} />;
}
