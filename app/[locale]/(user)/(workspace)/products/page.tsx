import { Suspense } from "react";
import { notFound } from "next/navigation";

import { StockManager } from "@/components/stock/stock-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
};

// Canonical Product Master route. Renders the existing Product List UI
// (StockManager) — viewing stock here is supporting data, not an inventory op.
export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <Suspense fallback={null}>
      <StockManager
        dictionary={dictionary.stock}
        initialSection="stock-levels"
      />
    </Suspense>
  );
}
