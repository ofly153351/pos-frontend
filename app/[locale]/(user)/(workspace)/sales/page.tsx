import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type SalesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SalesPage({ params }: SalesPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                {dictionary.sales.catalogTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dictionary.sales.catalogDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-600">
              {dictionary.sales.searchPlaceholder}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dictionary.sales.products.map((product) => (
              <div
                key={product.name}
                className="rounded-[1.5rem] border border-sky-100 bg-sky-50/55 p-5"
              >
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
                  {product.category}
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {product.name}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">
                    {product.price}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {product.stock}
                  </span>
                </div>
                <button
                  className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                  type="button"
                >
                  {dictionary.sales.addButton}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">
              {dictionary.sales.cartTitle}
            </h2>
            <div className="mt-6 space-y-4">
              {dictionary.sales.cartItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-[1.25rem] border border-sky-100 bg-sky-50/60 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.price}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-sky-100 pt-5 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>{dictionary.sales.summary.subtotalLabel}</span>
                <span>{dictionary.sales.summary.subtotalValue}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{dictionary.sales.summary.discountLabel}</span>
                <span>{dictionary.sales.summary.discountValue}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-950">
                <span>{dictionary.sales.summary.totalLabel}</span>
                <span>{dictionary.sales.summary.totalValue}</span>
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700"
              type="button"
            >
              {dictionary.sales.checkoutButton}
            </button>
          </section>

          <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)] sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">
              {dictionary.sales.quickKeypadTitle}
            </h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {dictionary.sales.quickKeypad.map((key) => (
                <button
                  key={key}
                  className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-4 text-base font-semibold text-slate-900"
                  type="button"
                >
                  {key}
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
