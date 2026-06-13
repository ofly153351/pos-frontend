import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { StaffManager } from "@/components/settings/staff-manager";

type Props = { params: Promise<{ locale: string }> };

export default async function StaffPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <StaffManager t={dictionary.userManagement} locale={locale} />;
}
