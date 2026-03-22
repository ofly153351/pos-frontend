import { notFound } from "next/navigation";

import { SubscriptionPlanSelector } from "@/components/subscription/subscription-plan-selector";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type SubscriptionPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SubscriptionPage({
  params,
}: SubscriptionPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <SubscriptionPlanSelector
      ctaLabel={dictionary.subscription.ctaLabel}
      helper={dictionary.subscription.helper}
      locale={locale}
      plans={dictionary.subscription.plans}
      selectedBadge={dictionary.subscription.selectedBadge}
      subtitle={dictionary.subscription.subtitle}
      title={dictionary.subscription.title}
    />
  );
}
