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
        logout: dictionary.stock.shell.logout,
        purchasing: dictionary.purchasing.title,
        purchaseOrders: dictionary.purchasing.purchaseOrders,
        register: dictionary.stock.shell.register,
        searchPlaceholder: dictionary.stock.shell.searchPlaceholder,
        settings: dictionary.stock.shell.settings,
        storageLocations: dictionary.stock.shell.storageLocations,
        receiptPayment: dictionary.stock.shell.receiptPayment,
        storeLabel: dictionary.stock.shell.storeLabel,
        stockCategories: dictionary.stock.shell.stockCategories,
        stockLevels: dictionary.stock.shell.stockLevels,
        stockWarehouses: dictionary.stock.shell.stockWarehouses,
        warehouseOverview: dictionary.stock.shell.warehouseOverview,
        receiveGoods: dictionary.stock.shell.receiveGoods,
        station: dictionary.stock.shell.station,
        suppliers: dictionary.purchasing.suppliers,
        transactions: dictionary.stock.shell.transactions,
      }}
      titles={{
        customers: dictionary.customers.title,
        dashboard: dictionary.dashboard.title,
        documents: dictionary.stock.shell.documents,
        sales: dictionary.sales.title,
        settings: dictionary.storeManagement.pageTitle,
        stock: dictionary.stock.title,
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
