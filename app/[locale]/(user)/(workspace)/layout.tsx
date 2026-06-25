import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { UserWorkspaceLayout } from "@/components/layouts/user-workspace-layout";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <UserWorkspaceLayout
      locale={locale}
      salesDictionary={dictionary.sales}
      shell={{
        brand: dictionary.stock.shell.brand,
        completeSale: dictionary.stock.shell.completeSale,
        customers: dictionary.stock.shell.customers,
        dashboard: dictionary.workspace.navigation.dashboard,
        documentBills: dictionary.stock.shell.documentBills,
        documentPending: dictionary.stock.shell.documentPending,
        documents: dictionary.stock.shell.documents,
        editProfile: dictionary.stock.shell.editProfile,
        inventory: dictionary.stock.shell.inventory,
        products: dictionary.stock.shell.products,
        productList: dictionary.stock.shell.productList,
        masterData: dictionary.stock.shell.masterData,
        promotions: dictionary.stock.shell.promotions,
        logout: dictionary.stock.shell.logout,
        purchasing: dictionary.stock.shell.purchasingReceiving,
        purchaseOrders: dictionary.purchasing.purchaseOrders,
        reports: dictionary.stock.shell.reports,
        reportsInventoryValue: dictionary.stock.shell.reportsInventoryValue,
        reportsSummary: dictionary.stock.shell.reportsSummary,
        finance: dictionary.stock.shell.finance,
        financeExpenses: dictionary.stock.shell.financeExpenses,
        financePnl: dictionary.stock.shell.financePnl,
        register: dictionary.stock.shell.register,
        salesHistory: dictionary.stock.shell.salesHistory,
        searchPlaceholder: dictionary.stock.shell.searchPlaceholder,
        settings: dictionary.stock.shell.settings,
        storageLocations: dictionary.stock.shell.storageLocations,
        receiptPayment: dictionary.stock.shell.receiptPayment,
        activityLogs: dictionary.stock.shell.activityLogs,
        staff: dictionary.stock.shell.staff,
        storeLabel: dictionary.stock.shell.storeLabel,
        stockCategories: dictionary.stock.shell.stockCategories,
        stockLevels: dictionary.stock.shell.stockLevels,
        stockCount: dictionary.stock.shell.stockCount,
        stockWarehouses: dictionary.stock.shell.stockWarehouses,
        warehouseOverview: dictionary.stock.shell.warehouseOverview,
        receiveGoods: dictionary.stock.shell.receiveGoods,
        station: dictionary.stock.shell.station,
        suppliers: dictionary.purchasing.suppliers,
        creditSales: dictionary.stock.shell.creditSales,
        notificationsLowStock: dictionary.stock.shell.notificationsLowStock,
        notificationsLowStockDesc: dictionary.stock.shell.notificationsLowStockDesc,
        notificationsNone: dictionary.stock.shell.notificationsNone,
        notificationsNoneDesc: dictionary.stock.shell.notificationsNoneDesc,
        notificationsOutOfStock: dictionary.stock.shell.notificationsOutOfStock,
        notificationsOutOfStockDesc: dictionary.stock.shell.notificationsOutOfStockDesc,
        notificationsPendingApprovals: dictionary.stock.shell.notificationsPendingApprovals,
        notificationsPendingApprovalsDesc: dictionary.stock.shell.notificationsPendingApprovalsDesc,
        notificationsPendingCounts: dictionary.stock.shell.notificationsPendingCounts,
        notificationsPendingCountsDesc: dictionary.stock.shell.notificationsPendingCountsDesc,
        notificationsTitle: dictionary.stock.shell.notificationsTitle,
        notificationsViewAll: dictionary.stock.shell.notificationsViewAll,
        transactions: dictionary.stock.shell.transactions,
      }}
      titles={{
        customers: dictionary.customers.title,
        dashboard: dictionary.dashboard.title,
        documents: dictionary.stock.shell.documents,
        profile: dictionary.profile.title,
        reports: dictionary.stock.shell.reportsInventoryValue,
        reportsSummary: dictionary.stock.shell.reportsSummary,
        finance: dictionary.stock.shell.financeExpenses,
        financePnl: dictionary.stock.shell.financePnl,
        sales: dictionary.sales.title,
        settings: dictionary.storeManagement.pageTitle,
        staff: dictionary.userManagement.pageTitle,
        stock: dictionary.stock.title,
        inventory: dictionary.inventory.title,
        stockCategories: dictionary.stock.shell.stockCategories,
        stockWarehouses: dictionary.stock.shell.stockWarehouses,
        warehouseOverview: dictionary.stock.shell.warehouseOverview,
        receiveGoods: dictionary.stock.receiveGoods.pageTitle,
        purchaseOrders: dictionary.purchasing.purchaseOrders,
        suppliers: dictionary.purchasing.suppliers,
      }}
    >
      {children}
    </UserWorkspaceLayout>
  );
}
