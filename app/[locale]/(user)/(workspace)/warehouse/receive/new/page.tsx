import { notFound } from "next/navigation";

import { ReceiveGoodsNewPage } from "@/components/warehouse/receive-goods-flow";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ReceiveGoodsNewRouteProps = {
  params: Promise<{ locale: string }>;
};

export default async function ReceiveGoodsNewRoute({ params }: ReceiveGoodsNewRouteProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ReceiveGoodsNewPage dictionary={dictionary.stock.receiveGoods} locale={locale} />;
}
