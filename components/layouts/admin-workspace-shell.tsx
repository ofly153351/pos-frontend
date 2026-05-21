import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/locale-config";

type AdminWorkspaceShellProps = {
  active: "plans";
  children: ReactNode;
  locale: Locale;
  navigation: {
    dashboard: string;
    plans: string;
  };
  subtitle: string;
  title: string;
};

export function AdminWorkspaceShell({
  active,
  children,
  locale,
  navigation,
  subtitle,
  title,
}: AdminWorkspaceShellProps) {
  const navItems = [
    {
      href: `/${locale}/admin/plans`,
      key: "plans" as const,
      label: navigation.plans,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">
                POS Suite
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-2xl border border-sky-200 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                href={`/${locale}/dashboard`}
              >
                {navigation.dashboard}
              </Link>
              {navItems.map((item) => {
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "border border-sky-200 text-sky-700 hover:bg-sky-50"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
