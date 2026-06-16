import { notFound } from "next/navigation";

import { StockManager } from "@/components/stock/stock-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ProductCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

// Product Master — category (master data) management.
export default async function ProductCategoriesPage({ params }: ProductCategoriesPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <StockManager
      dictionary={dictionary.stock}
      initialSection="categories"
    />
  );
}
