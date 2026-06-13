import { notFound } from "next/navigation";

import { ReceiveEditor } from "@/components/warehouse/receive-editor";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type ReceiveGoodsEditorPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function ReceiveGoodsEditorPage({ params }: ReceiveGoodsEditorPageProps) {
  const { id, locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return <ReceiveEditor dictionary={dictionary.stock.receiveGoods} locale={locale} receiptId={id} />;
}
