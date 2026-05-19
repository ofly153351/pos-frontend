"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { CashierModal } from "@/components/sales/cashier-modal";
import { UserWorkspaceSidebar } from "@/components/navigation/user-workspace-sidebar";
import { UserWorkspaceTopbar } from "@/components/navigation/user-workspace-topbar";
import type { SalesDictionary } from "@/components/sales/types";
import type { Locale } from "@/lib/locale-config";

type UserWorkspaceLayoutProps = {
  children: React.ReactNode;
  locale: Locale;
  salesDictionary: SalesDictionary;
  shell: {
    brand: string;
    completeSale: string;
    customers: string;
    dashboard: string;
    documentBills: string;
    documentPending: string;
    documents: string;
    editProfile: string;
    inventory: string;
    logout: string;
    purchasing: string;
    purchaseOrders: string;
    register: string;
    searchPlaceholder: string;
    settings: string;
    storeLabel: string;
    stockCategories: string;
    stockLevels: string;
    stockWarehouses: string;
    station: string;
    suppliers: string;
    transactions: string;
  };
  titles: {
    customers: string;
    dashboard: string;
    documents: string;
    sales: string;
    settings: string;
    stock: string;
  };
};

export function UserWorkspaceLayout({
  children,
  locale,
  salesDictionary,
  shell,
  titles,
}: UserWorkspaceLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isCashierOpen, setIsCashierOpen] = useState(false);

  const title = useMemo(() => {
    if (pathname.endsWith("/sales")) {
      return titles.sales;
    }

    if (pathname.includes("/customers")) {
      return titles.customers;
    }

    if (pathname.includes("/documents")) {
      return titles.documents;
    }

    if (pathname.includes("/stock")) {
      return titles.stock;
    }

    if (pathname.includes("/settings")) {
      return titles.settings;
    }

    return titles.dashboard;
  }, [pathname, titles.customers, titles.dashboard, titles.documents, titles.sales, titles.settings, titles.stock]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-slate-900">
      <UserWorkspaceSidebar
        collapsed={collapsed}
        labels={{
          customers: shell.customers,
          dashboard: shell.dashboard,
          documentBills: shell.documentBills,
          documentPending: shell.documentPending,
          documents: shell.documents,
          inventory: shell.inventory,
          purchasing: shell.purchasing,
          purchaseOrders: shell.purchaseOrders,
          register: shell.register,
          settings: shell.settings,
          stockCategories: shell.stockCategories,
          stockWarehouses: shell.stockWarehouses,
          stockLevels: shell.stockLevels,
          suppliers: shell.suppliers,
          transactions: shell.transactions,
        }}
        locale={locale}
        onOpenCashier={() => setIsCashierOpen(true)}
        shell={shell}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-64"
        }`}
      >
        <UserWorkspaceTopbar
          editProfileLabel={shell.editProfile}
          locale={locale}
          logoutLabel={shell.logout}
          onToggle={() => setCollapsed((current) => !current)}
          title={title}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>

      {isCashierOpen ? (
        <CashierModal
          dictionary={salesDictionary}
          onClose={() => setIsCashierOpen(false)}
        />
      ) : null}
    </div>
  );
}
