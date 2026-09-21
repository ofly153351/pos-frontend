import type { ReactNode } from "react";
import type { NavLabels } from "@/components/navigation/nav-config";
import type { Locale } from "@/lib/locale-config";
import type { NotificationLabels } from "@/components/navigation/notification-dropdown";

export type NavConfigNavLeaf = {
  key: string;
  icon: ReactNode;
  href: (locale: string) => string;
};

export type NavConfigNavGroup = {
  key: string;
  icon: ReactNode;
  href: (locale: string) => string;
  children: NavConfigNavLeaf[];
};

export type NavConfigNavEntry = NavConfigNavLeaf | NavConfigNavGroup;

export type NavConfigNavSection = {
  id: string;
  labelKey: string;
  manageOnly?: boolean;
  entries: NavConfigNavEntry[];
};

export type NavConfigNavLabels = Partial<Record<string, string>>;

export type NotificationDropdownNotificationLabels = {
  noneDesc: string;
  none: string;
  outOfStockDesc: string;
  outOfStock: string;
  lowStockDesc: string;
  lowStock: string;
  pendingApprovalsDesc: string;
  pendingApprovals: string;
  pendingCountsDesc: string;
  pendingCounts: string;
  title: string;
  viewAll: string;
};

export type NotificationDropdownProps = { labels: NotificationDropdownNotificationLabels; locale: string };

export type SidebarDrawerSidebarDrawerProps = {
  isOpen: boolean;
  locale: string;
  labels: NavLabels;
  onClose: () => void;
  onNavigate: () => void;
};

export type UserProfileMenuUserProfileMenuProps = {
  editProfileLabel: string;
  locale: Locale;
  logoutLabel: string;
  settingsLabel: string;
};

export type UserWorkspaceSidebarUserWorkspaceSidebarProps = {
  collapsed: boolean;
  locale: Locale;
  labels: {
    creditSales: string;
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
    purchasing: string;
    purchaseOrders: string;
    reports: string;
    reportsInventoryValue: string;
    reportsSummary: string;
    finance: string;
    financeExpenses: string;
    financePnl: string;
    receiveGoods: string;
    register: string;
    salesHistory: string;
    settings: string;
    storageLocations: string;
    receiptPayment: string;
    activityLogs: string;
    staff: string;
    stockCategories: string;
    stockLevels: string;
    stockCount: string;
    stockWarehouses: string;
    warehouseOverview: string;
    suppliers: string;
    transactions: string;
  help: string;
  };
  onOpenCashier?: () => void;
  shell: {
    brand: string;
    completeSale: string;
    station: string;
    storeLabel: string;
  };
};

export type UserWorkspaceSidebarSidebarGroupItem = { href: string; key: string; label: string; icon: ReactNode };

export type UserWorkspaceTopbarUserWorkspaceTopbarProps = {
  editProfileLabel: string;
  locale: Locale;
  logoutLabel: string;
  notificationLabels: NotificationLabels;
  onToggle: () => void;
  settingsLabel: string;
  sidebarCollapsed: boolean;
  title: string;
};
