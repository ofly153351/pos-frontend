import { notFound, redirect } from "next/navigation";

import { isSupportedLocale } from "@/lib/locale-config";

type AdminStockPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminStockPage({ params }: AdminStockPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  redirect(`/${locale}/products`);
}
