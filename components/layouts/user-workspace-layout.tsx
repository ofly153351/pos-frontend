"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { UserWorkspaceSidebar } from "@/components/navigation/user-workspace-sidebar";
import { UserWorkspaceTopbar } from "@/components/navigation/user-workspace-topbar";
import { CopilotProvider } from "@/components/copilot/copilot-provider";
import { CopilotFAB } from "@/components/copilot/copilot-fab";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
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
    products: string;
    productList: string;
    masterData: string;
    promotions: string;
    logout: string;
    purchasing: string;
    purchaseOrders: string;
    reports: string;
    reportsInventoryValue: string;
    reportsSummary: string;
    finance: string;
    financeExpenses: string;
    financePnl: string;
    register: string;
    salesHistory: string;
    searchPlaceholder: string;
    settings: string;
    storageLocations: string;
    receiptPayment: string;
    activityLogs: string;
    staff: string;
    storeLabel: string;
    stockCategories: string;
    stockLevels: string;
    stockCount: string;
    stockWarehouses: string;
    warehouseOverview: string;
    creditSales: string;
    notificationsLowStock: string;
    notificationsLowStockDesc: string;
    notificationsNone: string;
    notificationsNoneDesc: string;
    notificationsOutOfStock: string;
    notificationsOutOfStockDesc: string;
    notificationsPendingApprovals: string;
    notificationsPendingApprovalsDesc: string;
    notificationsPendingCounts: string;
    notificationsPendingCountsDesc: string;
    notificationsTitle: string;
    notificationsViewAll: string;
    receiveGoods: string;
    station: string;
    suppliers: string;
    transactions: string;
  };
  titles: {
    customers: string;
    dashboard: string;
    documents: string;
    profile?: string;
    promotions?: string;
    reports?: string;
    reportsSummary?: string;
    finance?: string;
    financePnl?: string;
    sales: string;
    settings: string;
    staff?: string;
    stock: string;
    inventory?: string;
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
    // ล้าง flag ทันที แล้วเปิด modal — ป้องกันเปิดซ้ำเมื่อ navigate กลับมา
    localStorage.removeItem("pos-cashier-open");
    const frame = requestAnimationFrame(() => setIsCashierOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  function openCashier() {
    setIsCashierOpen(true);
  }

  function closeCashier() {
    setIsCashierOpen(false);
  }

  const navLabels: NavLabels = {
    // Section A
    dashboard: shell.dashboard,
    register: shell.register,
    "sales-history": shell.salesHistory,
    "credit-sales": shell.creditSales,
    customers: shell.customers,
    promotions: shell.promotions,
    // Section B
    products: shell.products,
    "product-list": shell.productList,
    "master-data": shell.masterData,
    stock: shell.inventory,
    inventory: shell.inventory,
    "stock-levels": shell.stockLevels,
    "stock-count": shell.stockCount,
    "warehouse-overview": shell.warehouseOverview,
    warehouses: shell.stockWarehouses,
    // Section C
    purchasing: shell.purchasing,
    "purchase-orders": shell.purchaseOrders,
    suppliers: shell.suppliers,
    documents: shell.documents,
    "document-bills": shell.documentBills,
    "document-pending": shell.documentPending,
    // Section D
    reports: shell.reports,
    "reports-inventory-value": shell.reportsInventoryValue,
    "finance-expenses": shell.financeExpenses,
    "finance-pnl": shell.financePnl,
    "reports-summary": shell.reportsSummary,
    "store-settings": shell.settings,
    "storage-locations": shell.storageLocations,
    "receipt-payment": shell.receiptPayment,
    "activity-logs": shell.activityLogs,
    staff: shell.staff,
    settings: shell.settings,
    // Legacy keys kept for compat
    "receive-goods": shell.receiveGoods,
    categories: shell.stockCategories,
  };

  const title = useMemo(() => {
    if (pathname.includes("/receipts")) return shell.salesHistory;
    if (pathname.includes("/promotions")) return titles.promotions ?? shell.promotions;
    if (pathname.includes("/profile")) return titles.profile ?? shell.editProfile;
    if (pathname.includes("/credit-sales")) return shell.creditSales;
    if (pathname.includes("/reports/summary")) return titles.reportsSummary ?? shell.reportsSummary;
    if (pathname.includes("/reports/inventory-value")) return shell.reportsInventoryValue;
    if (pathname.includes("/reports")) return titles.reports ?? shell.reports;
    if (pathname.includes("/finance/pnl")) return titles.financePnl ?? shell.financePnl;
    if (pathname.includes("/finance/expenses")) return shell.financeExpenses;
    if (pathname.includes("/finance")) return titles.finance ?? shell.finance;
    if (pathname.endsWith("/sales")) return titles.sales;
    if (pathname.includes("/customers")) return titles.customers;
    if (pathname.includes("/documents/pending")) return shell.documentPending;
    if (pathname.includes("/documents")) return titles.documents;
    if (pathname.includes("/warehouse/receive")) return titles.receiveGoods;
    if (pathname.includes("/warehouse/overview")) return titles.warehouseOverview;
    // Product Master is now /products (was /stock); /stock stays as a redirect shim.
    // Match /products/categories before /products (the former contains the latter).
    if (pathname.includes("/products/categories")) return titles.stockCategories;
    if (pathname.includes("/products")) return titles.stock;
    if (pathname.includes("/stock/categories")) return titles.stockCategories;
    if (pathname.includes("/stock/warehouses")) return titles.stockWarehouses;
    if (pathname.includes("/inventory/counts")) return shell.stockCount;
    if (pathname.includes("/inventory")) return titles.inventory ?? titles.stock;
    if (pathname.includes("/stock")) return titles.stock;
    if (pathname.includes("/purchases/suppliers")) return titles.suppliers;
    if (pathname.includes("/purchases")) return titles.purchaseOrders;
    if (pathname.includes("/settings/storage-locations")) return shell.storageLocations;
    if (pathname.includes("/settings/receipt-payment")) return shell.receiptPayment;
    if (pathname.includes("/settings/activity-logs")) return shell.activityLogs;
    if (pathname.includes("/settings/staff")) return titles.staff ?? shell.staff;
    if (pathname.includes("/settings")) return titles.settings;
    return titles.dashboard;
  }, [pathname, titles, shell.salesHistory, shell.promotions, shell.editProfile, shell.creditSales, shell.reportsInventoryValue, shell.reports, shell.reportsSummary, shell.finance, shell.financeExpenses, shell.financePnl, shell.documentPending, shell.stockCount, shell.storageLocations, shell.receiptPayment, shell.activityLogs, shell.staff]);

  return (
    <CopilotProvider>
    <div className="h-screen overflow-hidden bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_35%,_#f8fafc_100%)] text-slate-900">
      <UserWorkspaceSidebar
        collapsed={collapsed}
        labels={{
          customers: shell.customers,
          dashboard: shell.dashboard,
          documentBills: shell.documentBills,
          documentPending: shell.documentPending,
          documents: shell.documents,
          editProfile: shell.editProfile,
          inventory: shell.inventory,
          products: shell.products,
          productList: shell.productList,
          masterData: shell.masterData,
          promotions: shell.promotions,
          purchasing: shell.purchasing,
          purchaseOrders: shell.purchaseOrders,
          reports: shell.reports,
          reportsInventoryValue: shell.reportsInventoryValue,
          reportsSummary: shell.reportsSummary,
          finance: shell.finance,
          financeExpenses: shell.financeExpenses,
          financePnl: shell.financePnl,
          register: shell.register,
          salesHistory: shell.salesHistory,
          settings: shell.settings,
          storageLocations: shell.storageLocations,
          receiptPayment: shell.receiptPayment,
          activityLogs: shell.activityLogs,
          staff: shell.staff,
          stockCategories: shell.stockCategories,
          stockWarehouses: shell.stockWarehouses,
          stockLevels: shell.stockLevels,
          stockCount: shell.stockCount,
          warehouseOverview: shell.warehouseOverview,
          creditSales: shell.creditSales,
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
          notificationLabels={{
            lowStock: shell.notificationsLowStock,
            lowStockDesc: shell.notificationsLowStockDesc,
            none: shell.notificationsNone,
            noneDesc: shell.notificationsNoneDesc,
            outOfStock: shell.notificationsOutOfStock,
            outOfStockDesc: shell.notificationsOutOfStockDesc,
            pendingApprovals: shell.notificationsPendingApprovals,
            pendingApprovalsDesc: shell.notificationsPendingApprovalsDesc,
            pendingCounts: shell.notificationsPendingCounts,
            pendingCountsDesc: shell.notificationsPendingCountsDesc,
            title: shell.notificationsTitle,
            viewAll: shell.notificationsViewAll,
          }}
          onToggle={() => setCollapsed((current) => !current)}
          settingsLabel={shell.settings}
          sidebarCollapsed={collapsed}
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

      <CopilotFAB />
      <CopilotPanel />
    </div>
    </CopilotProvider>
  );
}
