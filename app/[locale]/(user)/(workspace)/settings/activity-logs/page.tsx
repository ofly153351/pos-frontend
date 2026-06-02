import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { ActivityLogsClient } from "./activity-logs-client";

type Props = { params: Promise<{ locale: string }> };

export default async function ActivityLogsPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <ActivityLogsClient t={dictionary.activityLogs} />;
}
