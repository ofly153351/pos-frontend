import { notFound, redirect } from "next/navigation";

import { isSupportedLocale } from "@/lib/locale-config";

type StockCategoriesRedirectPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Product Master category management moved to /[locale]/products/categories.
// Redirect server-side, preserving URL state.
export default async function StockCategoriesRedirectPage({
  params,
  searchParams,
}: StockCategoriesRedirectPageProps) {
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

  redirect(`/${locale}/products/categories${query ? `?${query}` : ""}`);
}
