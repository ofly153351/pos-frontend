"use client";

import type { ReactNode } from "react";
import {
  Boxes,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  Layers3,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Tags,
  Users,
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

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export type NavLabels = Partial<Record<string, string>>;

export const NAV_ENTRIES: NavEntry[] = [
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
    key: "inventory",
    icon: <Boxes className="h-4 w-4" />,
    href: (l) => `/${l}/stock`,
    children: [
      { key: "stock-levels", icon: <Layers3 className="h-3.5 w-3.5" />, href: (l) => `/${l}/stock` },
      { key: "categories", icon: <Tags className="h-3.5 w-3.5" />, href: (l) => `/${l}/stock/categories` },
      { key: "warehouses", icon: <Warehouse className="h-3.5 w-3.5" />, href: (l) => `/${l}/stock/warehouses` },
    ],
  },
  {
    key: "purchasing",
    icon: <ShoppingCart className="h-4 w-4" />,
    href: (l) => `/${l}/purchases`,
    children: [
      { key: "purchase-orders", icon: <ShoppingCart className="h-3.5 w-3.5" />, href: (l) => `/${l}/purchases` },
      { key: "suppliers", icon: <Users className="h-3.5 w-3.5" />, href: (l) => `/${l}/purchases/suppliers` },
    ],
  },
  {
    key: "documents",
    icon: <ReceiptText className="h-4 w-4" />,
    href: (l) => `/${l}/documents`,
    children: [
      { key: "document-bills", icon: <ReceiptText className="h-3.5 w-3.5" />, href: (l) => `/${l}/documents` },
      { key: "document-pending", icon: <Clock3 className="h-3.5 w-3.5" />, href: (l) => `/${l}/documents/pending` },
    ],
  },
  {
    key: "customers",
    icon: <Users className="h-4 w-4" />,
    href: (l) => `/${l}/customers`,
  },
  {
    key: "settings",
    icon: <Settings2 className="h-4 w-4" />,
    href: (l) => `/${l}/settings`,
  },
];
