"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  History,
  LayoutDashboard,
  Layers3,
  MapPin,
  Megaphone,
  Package,
  ReceiptText,
  Scale,
  ScrollText,
  Settings2,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export type NavLeaf = {
  key: string;
  icon: ReactNode;
  href: (locale: string) => string;
};

export type NavGroup = {
  key: string;
  icon: ReactNode;
  href: (locale: string) => string;
  children: NavLeaf[];
};

export type NavEntry = NavLeaf | NavGroup;

export type NavSection = {
  id: string;
  labelKey: string;
  manageOnly?: boolean;
  entries: NavEntry[];
};

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export type NavLabels = Partial<Record<string, string>>;

// Canonical shared navigation — one source of truth for Sidebar + POS Drawer.
export const NAV_SECTIONS: NavSection[] = [
  // ① การขาย & ลูกค้า
  {
    id: "sales-customers",
    labelKey: "navSectionSalesCustomers",
    entries: [
      {
        key: "dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        href: (l) => `/${l}/dashboard`,
      },
      {
        key: "register",
        icon: <CircleDollarSign className="h-4 w-4" />,
        href: (l) => `/${l}/sales`,
      },
      {
        key: "sales-history",
        icon: <History className="h-4 w-4" />,
        href: (l) => `/${l}/receipts`,
      },
      {
        key: "documents",
        icon: <ReceiptText className="h-4 w-4" />,
        href: (l) => `/${l}/documents`,
      },
      {
        key: "credit-sales",
        icon: <CreditCard className="h-4 w-4" />,
        href: (l) => `/${l}/credit-sales`,
      },
      {
        key: "customers",
        icon: <Users className="h-4 w-4" />,
        href: (l) => `/${l}/customers`,
      },
      {
        key: "promotions",
        icon: <Megaphone className="h-4 w-4" />,
        href: (l) => `/${l}/promotions`,
      },
    ],
  },
  // ② สินค้า (master data)
  {
    id: "products",
    labelKey: "navSectionProducts",
    entries: [
      {
        key: "products",
        icon: <Package className="h-4 w-4" />,
        href: (l) => `/${l}/products`,
        children: [
          {
            key: "product-list",
            icon: <Layers3 className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/products`,
          },
          {
            key: "master-data",
            icon: <Tags className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/products/categories`,
          },
        ],
      },
    ],
  },
  // ③ คลังสินค้า (warehouse-overview first → operational → locations → structure)
  {
    id: "inventory",
    labelKey: "navSectionInventory",
    entries: [
      {
        key: "stock",
        icon: <Boxes className="h-4 w-4" />,
        href: (l) => `/${l}/inventory`,
        children: [
          {
            key: "warehouse-overview",
            icon: <LayoutDashboard className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/warehouse/overview`,
          },
          {
            key: "stock-levels",
            icon: <Layers3 className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/inventory`,
          },
          {
            key: "stock-count",
            icon: <ClipboardCheck className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/inventory/counts`,
          },
          {
            key: "storage-locations",
            icon: <MapPin className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/settings/storage-locations`,
          },
          {
            key: "warehouses",
            icon: <Warehouse className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/stock/warehouses`,
          },
        ],
      },
    ],
  },
  // ④ จัดซื้อ
  {
    id: "purchasing",
    labelKey: "navSectionPurchasing",
    entries: [
      {
        key: "purchasing",
        icon: <ShoppingCart className="h-4 w-4" />,
        href: (l) => `/${l}/purchases`,
        children: [
          {
            key: "purchase-orders",
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/purchases`,
          },
          {
            key: "suppliers",
            icon: <Users className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/purchases/suppliers`,
          },
        ],
      },
    ],
  },
  // ⑤ รายงาน & ตั้งค่า (owner/manager only)
  {
    id: "administration",
    labelKey: "navSectionAdministration",
    manageOnly: true,
    entries: [
      {
        key: "reports",
        icon: <BarChart3 className="h-4 w-4" />,
        href: (l) => `/${l}/reports/summary`,
        children: [
          {
            key: "reports-summary",
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/reports/summary`,
          },
          {
            key: "reports-inventory-value",
            icon: <Boxes className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/reports/inventory-value`,
          },
          {
            key: "finance-expenses",
            icon: <Wallet className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/finance/expenses`,
          },
          {
            key: "finance-pnl",
            icon: <Scale className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/finance/pnl`,
          },
        ],
      },
      {
        key: "settings",
        icon: <Settings2 className="h-4 w-4" />,
        href: (l) => `/${l}/settings`,
        children: [
          {
            key: "store-settings",
            icon: <Store className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/settings`,
          },
          {
            key: "receipt-payment",
            icon: <ReceiptText className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/settings/receipt-payment`,
          },
          {
            key: "activity-logs",
            icon: <ScrollText className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/settings/activity-logs`,
          },
          {
            key: "staff",
            icon: <Users className="h-3.5 w-3.5" />,
            href: (l) => `/${l}/settings/staff`,
          },
        ],
      },
    ],
  },
];

// Flat array for backward compatibility.
export const NAV_ENTRIES: NavEntry[] = NAV_SECTIONS.flatMap((s) => s.entries);
