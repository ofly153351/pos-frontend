import { notFound } from "next/navigation";

import { ReceiveGoodsWizard } from "@/components/warehouse/receive-goods-flow";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ReceiveGoodsStepTwoPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function ReceiveGoodsStepTwoPage({ params }: ReceiveGoodsStepTwoPageProps) {
  const { id, locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ReceiveGoodsWizard dictionary={dictionary.stock.receiveGoods} locale={locale} receiptId={id} step={2} />;
}
