"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Layers3,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  Tags,
  Users,
} from "lucide-react";

import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import type { Locale } from "@/lib/locale-config";
import { getStoreById, listMyStores } from "@/services/stores";

type UserWorkspaceSidebarProps = {
  collapsed: boolean;
  locale: Locale;
  labels: {
    customers: string;
    dashboard: string;
    documentBills: string;
    documentPending: string;
    documents: string;
    inventory: string;
    register: string;
    settings: string;
    stockCategories: string;
    stockLevels: string;
    transactions: string;
  };
  shell: {
    brand: string;
    completeSale: string;
    station: string;
    storeLabel: string;
  };
};

export function UserWorkspaceSidebar({
  collapsed,
  locale,
  labels,
  shell,
}: UserWorkspaceSidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [storeName, setStoreName] = useState(shell.station);
  const [storeDescription, setStoreDescription] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const stockBaseHref = `/${locale}/stock`;
  const stockCategoriesHref = `/${locale}/stock/categories`;
  const documentsBaseHref = `/${locale}/documents`;
  const documentsPendingHref = `/${locale}/documents/pending`;
  const isInventoryRoute =
    pathname === stockBaseHref || pathname.startsWith(`${stockBaseHref}/`);
  const isDocumentsRoute =
    pathname === documentsBaseHref || pathname.startsWith(`${documentsBaseHref}/`);
  const [inventoryExpanded, setInventoryExpanded] = useState(isInventoryRoute);
  const [documentsExpanded, setDocumentsExpanded] = useState(isDocumentsRoute);
  const wasInventoryRouteRef = useRef(isInventoryRoute);
  const wasDocumentsRouteRef = useRef(isDocumentsRoute);

  useEffect(() => {
    const session = getAuthSession();
    setRole(session?.user?.role ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadStoreProfile() {
      try {
        const session = getAuthSession();
        const selectedStoreId = getCurrentStoreId() || session?.store_id;

        if (selectedStoreId) {
          saveCurrentStoreId(selectedStoreId);
          const response = await getStoreById(selectedStoreId);

          if (isMounted && response.data.name) {
            setStoreName(response.data.name);
            setStoreDescription(response.data.description ?? "");
            setStoreAddress(response.data.address ?? "");
          }

          return;
        }

        const storesResponse = await listMyStores();
        const firstStore = storesResponse.data[0];

        if (!firstStore || !isMounted) {
          return;
        }

        setStoreName(firstStore.name);
        setStoreDescription(firstStore.description ?? "");
        setStoreAddress(firstStore.address ?? "");
        saveCurrentStoreId(firstStore.id);
      } catch {
        if (isMounted) {
          setStoreName(shell.station);
          setStoreDescription("");
          setStoreAddress("");
        }
      }
    }

    loadStoreProfile();

    return () => {
      isMounted = false;
    };
  }, [shell.station]);

  useEffect(() => {
    if (collapsed) {
      setInventoryExpanded(false);
      setDocumentsExpanded(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) {
      wasInventoryRouteRef.current = isInventoryRoute;
      return;
    }

    const wasInventoryRoute = wasInventoryRouteRef.current;

    if (isInventoryRoute && !wasInventoryRoute) {
      setInventoryExpanded(true);
    }

    if (!isInventoryRoute && wasInventoryRoute) {
      setInventoryExpanded(false);
    }

    wasInventoryRouteRef.current = isInventoryRoute;
  }, [collapsed, isInventoryRoute]);

  useEffect(() => {
    if (collapsed) {
      wasDocumentsRouteRef.current = isDocumentsRoute;
      return;
    }

    const wasDocumentsRoute = wasDocumentsRouteRef.current;

    if (isDocumentsRoute && !wasDocumentsRoute) {
      setDocumentsExpanded(true);
    }

    if (!isDocumentsRoute && wasDocumentsRoute) {
      setDocumentsExpanded(false);
    }

    wasDocumentsRouteRef.current = isDocumentsRoute;
  }, [collapsed, isDocumentsRoute]);

  const navItems = [
    { href: `/${locale}/sales`, key: "register", label: labels.register },
    { href: `/${locale}/customers`, key: "customers", label: labels.customers },
    { href: `/${locale}/dashboard`, key: "transactions", label: labels.transactions },
    ...(role === "admin"
      ? [{ href: `/${locale}/admin/plans`, key: "settings", label: labels.settings }]
      : []),
  ];
  const [firstNavItem, ...trailingNavItems] = navItems;

  const inventoryItems = useMemo(
    () => [
      {
        href: stockBaseHref,
        key: "stock-levels",
        label: labels.stockLevels,
      },
      {
        href: stockCategoriesHref,
        key: "categories",
        label: labels.stockCategories,
      },
    ],
    [labels.stockCategories, labels.stockLevels, stockBaseHref, stockCategoriesHref],
  );

  const activeInventoryKey = !isInventoryRoute
    ? ""
    : pathname === stockCategoriesHref
      ? "categories"
      : "stock-levels";

  const inventoryItemClass = isInventoryRoute
    ? "rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200/70"
    : "text-slate-500 hover:bg-blue-50/50 hover:text-blue-600";
  const activeDocumentsKey = !isDocumentsRoute
    ? ""
    : pathname === documentsPendingHref
      ? "pending"
      : "bills";

  const documentsItemClass = isDocumentsRoute
    ? "rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200/70"
    : "text-slate-500 hover:bg-blue-50/50 hover:text-blue-600";

  function getNavIcon(key: string, isActive: boolean) {
    const className = "h-4 w-4";

    const iconByKey = {
      customers: <Users className={className} />,
      register: <CircleDollarSign className={className} />,
      settings: <Settings2 className={className} />,
      transactions: <LayoutDashboard className={className} />,
    } as const;

    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
          isActive ? "bg-white/15 text-white" : "bg-blue-100 text-blue-700"
        }`}
      >
        {iconByKey[key as keyof typeof iconByKey] ?? <FileText className={className} />}
      </span>
    );
  }

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
      </div>

      <nav className="flex-1 space-y-1">
        {firstNavItem ? (
          <Link
            className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
              pathname === firstNavItem.href
                ? "rounded-2xl bg-blue-700 font-bold text-white shadow-lg shadow-blue-200/70"
                : "font-medium text-slate-500 hover:bg-blue-50/50 hover:text-blue-600"
            } ${collapsed ? "justify-center px-2" : ""}`}
            href={firstNavItem.href}
          >
            {getNavIcon(firstNavItem.key, pathname === firstNavItem.href)}
            {!collapsed ? <span>{firstNavItem.label}</span> : null}
          </Link>
        ) : null}

        <div className="space-y-1">
          <div
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition ${
              inventoryItemClass
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Link
              className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
              href={stockBaseHref}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isInventoryRoute
                    ? "bg-white/15 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <Boxes className="h-4 w-4" />
              </span>
              {!collapsed ? <span className="truncate">{labels.inventory}</span> : null}
            </Link>
            {!collapsed ? (
              <button
                aria-expanded={inventoryExpanded}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  isInventoryRoute
                    ? "text-white hover:bg-white/10"
                    : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                }`}
                onClick={() => setInventoryExpanded((current) => !current)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-300 ${inventoryExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </div>

          {!collapsed ? (
            <div
              className={`grid overflow-hidden transition-all duration-300 ease-out ${
                inventoryExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <div className="space-y-1 pt-1 pl-6">
                  {inventoryItems.map((item) => {
                    const isActive = activeInventoryKey === item.key;
                    const itemIcon =
                      item.key === "categories"
                        ? <Tags className="h-3.5 w-3.5" />
                        : <Layers3 className="h-3.5 w-3.5" />;

                    return (
                      <Link
                        key={item.key}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                          isActive
                            ? "bg-blue-100/80 font-semibold text-blue-700"
                            : "text-slate-500 hover:bg-blue-50/60 hover:text-blue-600"
                        }`}
                        href={item.href}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                            isActive ? "bg-blue-200/80 text-blue-700" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {itemIcon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <div
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition ${
              documentsItemClass
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Link
              className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
              href={documentsBaseHref}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isDocumentsRoute
                    ? "bg-white/15 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <ReceiptText className="h-4 w-4" />
              </span>
              {!collapsed ? <span className="truncate">{labels.documents}</span> : null}
            </Link>
            {!collapsed ? (
              <button
                aria-expanded={documentsExpanded}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  isDocumentsRoute
                    ? "text-white hover:bg-white/10"
                    : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                }`}
                onClick={() => setDocumentsExpanded((current) => !current)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-300 ${documentsExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </div>

          {!collapsed ? (
            <div
              className={`grid overflow-hidden transition-all duration-300 ease-out ${
                documentsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <div className="space-y-1 pt-1 pl-6">
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                      activeDocumentsKey === "bills"
                        ? "bg-blue-100/80 font-semibold text-blue-700"
                        : "text-slate-500 hover:bg-blue-50/60 hover:text-blue-600"
                    }`}
                    href={documentsBaseHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeDocumentsKey === "bills"
                          ? "bg-blue-200/80 text-blue-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.documentBills}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                      activeDocumentsKey === "pending"
                        ? "bg-blue-100/80 font-semibold text-blue-700"
                        : "text-slate-500 hover:bg-blue-50/60 hover:text-blue-600"
                    }`}
                    href={documentsPendingHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeDocumentsKey === "pending"
                          ? "bg-blue-200/80 text-blue-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.documentPending}</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {trailingNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
                isActive
                  ? "rounded-2xl bg-blue-700 font-bold text-white shadow-lg shadow-blue-200/70"
                  : "font-medium text-slate-500 hover:bg-blue-50/50 hover:text-blue-600"
              } ${collapsed ? "justify-center px-2" : ""}`}
              href={item.href}
            >
              {getNavIcon(item.key, isActive)}
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div
          className={`rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm ${
            collapsed ? "px-2 py-2" : ""
          }`}
        >
          {collapsed ? (
            <span className="block truncate text-center text-xs font-semibold text-slate-600">
              {storeName.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {shell.storeLabel}
              </p>
              <p className="truncate text-sm font-semibold text-slate-700">{storeName}</p>
              {storeDescription ? (
                <p className="mt-1 truncate text-xs text-slate-500">{storeDescription}</p>
              ) : null}
              {storeAddress ? (
                <p className="mt-1 truncate text-xs text-slate-500">{storeAddress}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
