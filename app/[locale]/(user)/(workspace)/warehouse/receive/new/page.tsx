import { notFound } from "next/navigation";

import { ReceiveNewRedirect } from "@/components/warehouse/receive-new";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ReceiveGoodsNewRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ po?: string }>;
};

export default async function ReceiveGoodsNewRoute({ params, searchParams }: ReceiveGoodsNewRouteProps) {
  const { locale } = await params;
  const { po } = await searchParams;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ReceiveNewRedirect dictionary={dictionary.stock.receiveGoods} locale={locale} purchaseOrderId={po ?? ""} />;
}
