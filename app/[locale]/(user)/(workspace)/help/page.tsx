import { notFound } from "next/navigation";

import { HelpCenter } from "@/components/help/help-center";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type HelpPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HelpPage({ params }: HelpPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale as Locale);
  const h = dict.help;

  return (
    <HelpCenter
      labels={{
        title: h.title,
        subtitle: h.subtitle,
        searchPlaceholder: h.searchPlaceholder,
        popularTopics: h.popularTopics,
        allCategories: h.allCategories,
        steps: h.steps,
        tips: h.tips,
        back: h.back,
        backToCategory: h.backToCategory,
        noResults: h.noResults,
        noResultsDesc: h.noResultsDesc,
      }}
    />
  );
}
