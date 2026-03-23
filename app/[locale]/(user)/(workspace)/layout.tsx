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
      shell={{
        brand: dictionary.stock.shell.brand,
        completeSale: dictionary.stock.shell.completeSale,
        customers: dictionary.stock.shell.customers,
        dashboard: dictionary.workspace.navigation.dashboard,
        editProfile: dictionary.stock.shell.editProfile,
        inventory: dictionary.stock.shell.inventory,
        logout: dictionary.stock.shell.logout,
        register: dictionary.stock.shell.register,
        searchPlaceholder: dictionary.stock.shell.searchPlaceholder,
        settings: dictionary.stock.shell.settings,
        storeLabel: dictionary.stock.shell.storeLabel,
        stockCategories: dictionary.stock.shell.stockCategories,
        stockLevels: dictionary.stock.shell.stockLevels,
        station: dictionary.stock.shell.station,
        transactions: dictionary.stock.shell.transactions,
      }}
      titles={{
        customers: dictionary.customers.title,
        dashboard: dictionary.dashboard.title,
        sales: dictionary.sales.title,
        stock: dictionary.stock.title,
      }}
    >
      {children}
    </UserWorkspaceLayout>
  );
}
