import { notFound } from "next/navigation";

import { StockManager } from "@/components/stock/stock-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type UserStockPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UserStockPage({ params }: UserStockPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <StockManager dictionary={dictionary.stock} />
  );
}
