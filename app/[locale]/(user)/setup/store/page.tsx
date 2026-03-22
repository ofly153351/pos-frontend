import { notFound } from "next/navigation";

import { StoreSetupForm } from "@/components/setup/store-setup-form";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type StoreSetupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StoreSetupPage({ params }: StoreSetupPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <StoreSetupForm dictionary={dictionary.storeSetup} locale={locale} />
      </div>
    </main>
  );
}
