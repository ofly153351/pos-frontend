import { notFound, redirect } from "next/navigation";

import { isSupportedLocale } from "@/lib/locale-config";

type StockRedirectPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Product Master moved to the canonical /[locale]/products route. Redirect
// server-side, preserving URL state (search, filter, pagination, view mode,
// product=, …). /inventory remains the operational stock-management route.
export default async function StockRedirectPage({ params, searchParams }: StockRedirectPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else if (value != null) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();

  redirect(`/${locale}/products${query ? `?${query}` : ""}`);
}
