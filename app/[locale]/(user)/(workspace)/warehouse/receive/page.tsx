import { notFound } from "next/navigation";

import { ReceiveGoodsIndexPage } from "@/components/warehouse/receive-goods-flow";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type WarehouseReceiveIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WarehouseReceiveIndexPage({ params }: WarehouseReceiveIndexPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ReceiveGoodsIndexPage dictionary={dictionary.stock.receiveGoods} locale={locale} />;
}
