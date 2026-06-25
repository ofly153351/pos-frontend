import { notFound } from "next/navigation";

import { CreditSalesManager } from "@/components/credit-sales/credit-sales-manager";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type CreditSalesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ customerId?: string; customerName?: string }>;
};

export default async function CreditSalesPage({ params, searchParams }: CreditSalesPageProps) {
  const { locale } = await params;
  const { customerId, customerName } = await searchParams;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <CreditSalesManager
      dictionary={dictionary.creditSales}
      billDictionary={dictionary.creditStatement}
      locale={locale}
      prefilledCustomerId={customerId}
      prefilledCustomerName={customerName}
    />
  );
}
