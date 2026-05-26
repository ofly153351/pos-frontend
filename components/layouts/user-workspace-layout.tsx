"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { UserWorkspaceSidebar } from "@/components/navigation/user-workspace-sidebar";
import { UserWorkspaceTopbar } from "@/components/navigation/user-workspace-topbar";
import type { NavLabels } from "@/components/navigation/nav-config";
import type { SalesDictionary } from "@/components/sales/types";
import type { Locale } from "@/lib/locale-config";

const CashierModal = dynamic(() =>
  import("@/components/sales/cashier-modal").then((mod) => mod.CashierModal),
);

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
    storageLocations: string;
    receiptPayment: string;
    storeLabel: string;
    stockCategories: string;
    stockLevels: string;
    stockWarehouses: string;
    warehouseOverview: string;
    receiveGoods: string;
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
    stockCategories: string;
    stockWarehouses: string;
    warehouseOverview: string;
    receiveGoods: string;
    purchaseOrders: string;
    suppliers: string;
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

  useEffect(() => {
    const storedCashierOpen = localStorage.getItem("pos-cashier-open") === "1";
    if (!storedCashierOpen) return;

    const frame = requestAnimationFrame(() => setIsCashierOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function openCashier() {
    setIsCashierOpen(true);
    localStorage.setItem("pos-cashier-open", "1");
  }

  function closeCashier() {
    setIsCashierOpen(false);
    localStorage.removeItem("pos-cashier-open");
  }

  const navLabels: NavLabels = {
    dashboard: shell.dashboard,
    register: shell.register,
    inventory: shell.inventory,
    "warehouse-overview": shell.warehouseOverview,
    "receive-goods": shell.receiveGoods,
    "stock-levels": shell.stockLevels,
    categories: shell.stockCategories,
    warehouses: shell.stockWarehouses,
    purchasing: shell.purchasing,
    "purchase-orders": shell.purchaseOrders,
    suppliers: shell.suppliers,
    documents: shell.documents,
    "document-bills": shell.documentBills,
    "document-pending": shell.documentPending,
    customers: shell.customers,
    settings: shell.settings,
  };

  const title = useMemo(() => {
    if (pathname.endsWith("/sales")) return titles.sales;
    if (pathname.includes("/customers")) return titles.customers;
    if (pathname.includes("/documents")) return titles.documents;
    if (pathname.includes("/warehouse/receive")) return titles.receiveGoods;
    if (pathname.includes("/warehouse/overview")) return titles.warehouseOverview;
    if (pathname.includes("/stock/categories")) return titles.stockCategories;
    if (pathname.includes("/stock/warehouses")) return titles.stockWarehouses;
    if (pathname.includes("/stock")) return titles.stock;
    if (pathname.includes("/purchases/suppliers")) return titles.suppliers;
    if (pathname.includes("/purchases")) return titles.purchaseOrders;
    if (pathname.includes("/settings")) return titles.settings;
    return titles.dashboard;
  }, [pathname, titles]);

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_35%,_#f8fafc_100%)] text-slate-900">
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
          storageLocations: shell.storageLocations,
          receiptPayment: shell.receiptPayment,
          stockCategories: shell.stockCategories,
          stockWarehouses: shell.stockWarehouses,
          stockLevels: shell.stockLevels,
          warehouseOverview: shell.warehouseOverview,
          receiveGoods: shell.receiveGoods,
          suppliers: shell.suppliers,
          transactions: shell.transactions,
        }}
        locale={locale}
        onOpenCashier={openCashier}
        shell={shell}
      />

      <div
        className={`flex h-full flex-col transition-all duration-300 ${
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
        <main className="flex-1 min-h-0 overflow-auto p-6 lg:p-8 pretty-scroll">{children}</main>
      </div>

      {isCashierOpen ? (
        <CashierModal
          dictionary={salesDictionary}
          locale={locale}
          navLabels={navLabels}
          onClose={closeCashier}
        />
      ) : null}
    </div>
  );
}
