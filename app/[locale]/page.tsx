import { redirect } from "next/navigation";

import { defaultLocale, isSupportedLocale } from "@/lib/locale-config";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    redirect(`/${defaultLocale}/login`);
  }

  redirect(`/${locale}/login`);
}
