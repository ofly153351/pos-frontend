import { notFound } from "next/navigation";

import { CustomerDisplay } from "@/components/sales/customer-display";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type Props = { params: Promise<{ locale: string }> };

// Standalone full-screen customer-facing display (screen 2).
// Read-only — driven entirely by BroadcastChannel from the cashier on the same machine.
export default async function CustomerDisplayPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  return <CustomerDisplay dict={dictionary.customerDisplay} storeName="" />;
}
