"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/locale-config";

type UserWorkspaceSidebarProps = {
  collapsed: boolean;
  locale: Locale;
  labels: {
    dashboard: string;
    inventory: string;
    register: string;
    settings: string;
    transactions: string;
  };
  shell: {
    brand: string;
    completeSale: string;
    station: string;
  };
};

export function UserWorkspaceSidebar({
  collapsed,
  locale,
  labels,
  shell,
}: UserWorkspaceSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}/sales`, key: "register", label: labels.register },
    { href: `/${locale}/stock`, key: "inventory", label: labels.inventory },
    { href: `/${locale}/dashboard`, key: "transactions", label: labels.transactions },
    { href: `/${locale}/admin/plans`, key: "settings", label: labels.settings },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-50 px-4 py-6 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`${collapsed ? "px-0" : "px-2"} mb-8`}>
        <p className="text-xl font-black tracking-tight text-blue-800">
          {collapsed ? shell.brand.slice(0, 2) : shell.brand}
        </p>
        {!collapsed ? (
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            {shell.station}
          </p>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
                isActive
                  ? "translate-x-1 rounded-l-lg bg-white font-bold text-blue-700 shadow-sm"
                  : "font-medium text-slate-500 hover:bg-blue-50/50 hover:text-blue-600"
              } ${collapsed ? "justify-center px-2" : ""}`}
              href={item.href}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                {item.label.slice(0, 2).toUpperCase()}
              </span>
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 px-4 py-4 font-bold text-white shadow-lg transition hover:brightness-110 ${
            collapsed ? "px-2" : ""
          }`}
          type="button"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs">
            +
          </span>
          {!collapsed ? shell.completeSale : null}
        </button>
      </div>
    </aside>
  );
}
