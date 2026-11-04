import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { ApiErrorMessagesRegistrar } from "@/components/shared/api-error-messages";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, locales } from "@/lib/locale-config";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <>
      <ApiErrorMessagesRegistrar messages={dictionary.apiErrors} />
      {children}
    </>
  );
}
