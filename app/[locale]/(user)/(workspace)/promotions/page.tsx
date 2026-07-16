import { notFound } from "next/navigation";

import { PromotionManager } from "@/components/promotions/promotion-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type PromotionsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PromotionsPage({ params }: PromotionsPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <PromotionManager dictionary={dictionary.promotion} locale={locale as Locale} />;
}
