import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/locale-config";

type UserWorkspaceShellProps = {
  active: "dashboard" | "sales" | "stock";
  children: ReactNode;
  locale: Locale;
  navigation: {
    dashboard: string;
    sales: string;
    stock: string;
  };
  subtitle: string;
  title: string;
};

export function UserWorkspaceShell({
  active,
  children,
  locale,
  navigation,
  subtitle,
  title,
}: UserWorkspaceShellProps) {
  const navItems = [
    {
      href: `/${locale}/dashboard`,
      key: "dashboard" as const,
      label: navigation.dashboard,
    },
    {
      href: `/${locale}/sales`,
      key: "sales" as const,
      label: navigation.sales,
    },
    {
      href: `/${locale}/stock`,
      key: "stock" as const,
      label: navigation.stock,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f5f3ff_0%,_#faf5ff_40%,_#ffffff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">
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
              {navItems.map((item) => {
                const isActive = item.key === active;

                return (
                  <Link
                    key={item.key}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white"
                        : "border border-violet-200 text-violet-700 hover:bg-violet-50"
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
