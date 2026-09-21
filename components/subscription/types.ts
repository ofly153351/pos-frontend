import type { Locale } from "@/lib/locale-config";

export type SubscriptionPlanSelectorPlanCard = {
  code: string;
  currency: string;
  description: string;
  durationDays: number;
  id: string;
  name: string;
  price: string;
};

export type SubscriptionPlanSelectorSubscriptionPlanSelectorProps = {
  ctaLabel: string;
  helper: string;
  locale: Locale;
  plans: SubscriptionPlanSelectorPlanCard[];
  selectedBadge: string;
  subtitle: string;
  title: string;
};
