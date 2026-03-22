import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 shadow-[0_18px_40px_rgba(59,130,246,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            {dictionary.dashboard.cards.salesTodayLabel}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">฿18,450</p>
          <p className="mt-2 text-sm text-slate-500">
            {dictionary.dashboard.cards.salesTodayHint}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 shadow-[0_18px_40px_rgba(59,130,246,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            {dictionary.dashboard.cards.ordersLabel}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">126</p>
          <p className="mt-2 text-sm text-slate-500">
            {dictionary.dashboard.cards.ordersHint}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 shadow-[0_18px_40px_rgba(59,130,246,0.08)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            {dictionary.dashboard.cards.lowStockLabel}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">7</p>
          <p className="mt-2 text-sm text-slate-500">
            {dictionary.dashboard.cards.lowStockHint}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
          <h2 className="text-2xl font-semibold text-slate-950">
            {dictionary.dashboard.quickActionsTitle}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <a
              className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={`/${locale}/sales`}
            >
              <p className="text-lg font-semibold text-slate-950">
                {dictionary.dashboard.actions.newSaleTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dictionary.dashboard.actions.newSaleDescription}
              </p>
            </a>

            <a
              className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={`/${locale}/stock`}
            >
              <p className="text-lg font-semibold text-slate-950">
                {dictionary.dashboard.actions.stockTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dictionary.dashboard.actions.stockDescription}
              </p>
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
          <h2 className="text-2xl font-semibold text-slate-950">
            {dictionary.dashboard.activityTitle}
          </h2>
          <div className="mt-6 space-y-4">
            {dictionary.dashboard.activityItems.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-sky-100 bg-sky-50/50 p-4"
              >
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
                  {item.time}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
