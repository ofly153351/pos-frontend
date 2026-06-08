"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  LayoutDashboard,
  Layers3,
  MapPin,
  Package,
  ClipboardCheck,
  PackagePlus,
  ReceiptText,
  ScrollText,
  Settings2,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Warehouse,
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
    products: string;
    productList: string;
    masterData: string;
    purchasing: string;
    purchaseOrders: string;
    receiveGoods: string;
    register: string;
    settings: string;
    storageLocations: string;
    receiptPayment: string;
    activityLogs: string;
    stockCategories: string;
    stockLevels: string;
    stockCount: string;
    stockWarehouses: string;
    warehouseOverview: string;
    suppliers: string;
    transactions: string;
  };
  onOpenCashier?: () => void;
  shell: {
    brand: string;
    completeSale: string;
    station: string;
    storeLabel: string;
  };
};

type SidebarGroupItem = { href: string; key: string; label: string; icon: ReactNode };

function CollapsibleNavGroup({
  collapsed,
  baseHref,
  icon,
  label,
  active,
  expanded,
  onToggle,
  items,
  activeKey,
}: {
  collapsed: boolean;
  baseHref: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  items: SidebarGroupItem[];
  activeKey: string;
}) {
  return (
    <div className="space-y-1">
      <div
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold ${
          active
            ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg"
            : "text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <Link
          className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          href={baseHref}
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
              active ? "bg-white/15 text-white" : "bg-violet-900/60 text-violet-300"
            }`}
          >
            {icon}
          </span>
          {!collapsed ? <span className="truncate">{label}</span> : null}
        </Link>
        {!collapsed ? (
          <button
            aria-expanded={expanded}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              active
                ? "text-white hover:bg-white/10"
                : "text-violet-400 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
            }`}
            onClick={onToggle}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>

      {!collapsed ? (
        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="space-y-1 pt-1 pl-6">
              {items.map((item) => {
                const isActive = activeKey === item.key;
                return (
                  <Link
                    key={item.key}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      isActive
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={item.href}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        isActive ? "bg-violet-700 text-violet-200" : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      {item.icon}
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
  );
}

export function UserWorkspaceSidebar({
  collapsed,
  locale,
  labels,
  onOpenCashier,
  shell,
}: UserWorkspaceSidebarProps) {
  const pathname = usePathname();
  const [storeName, setStoreName] = useState(shell.station);
  const [storeDescription, setStoreDescription] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const stockBaseHref = `/${locale}/stock`;
  const stockCategoriesHref = `/${locale}/stock/categories`;
  const stockWarehousesHref = `/${locale}/stock/warehouses`;
  const warehouseOverviewHref = `/${locale}/warehouse/overview`;
  const warehouseReceiveHref = `/${locale}/warehouse/receive`;
  const inventoryLevelsHref = `/${locale}/inventory`;
  const stockCountHref = `/${locale}/inventory/counts`;
  const documentsBaseHref = `/${locale}/documents`;
  const documentsPendingHref = `/${locale}/documents/pending`;
  const purchasesBaseHref = `/${locale}/purchases`;
  const purchasesSuppliersHref = `/${locale}/purchases/suppliers`;
  const settingsBaseHref = `/${locale}/settings`;
  const storageLocationsHref = `/${locale}/settings/storage-locations`;
  const receiptPaymentHref = `/${locale}/settings/receipt-payment`;
  const activityLogsHref = `/${locale}/settings/activity-logs`;
  const isSettingsRoute = pathname === settingsBaseHref || pathname.startsWith(`${settingsBaseHref}/`);
  const isProductsRoute =
    pathname === stockBaseHref ||
    pathname === stockCategoriesHref ||
    pathname.startsWith(`${stockCategoriesHref}/`);
  const isStockRoute =
    pathname === inventoryLevelsHref ||
    pathname.startsWith(`${inventoryLevelsHref}/`) ||
    pathname.startsWith(`/${locale}/warehouse/`) ||
    pathname === stockWarehousesHref ||
    pathname.startsWith(`${stockWarehousesHref}/`);
  const isDocumentsRoute =
    pathname === documentsBaseHref ||
    pathname.startsWith(`${documentsBaseHref}/`);
  const isPurchasingRoute =
    pathname === purchasesBaseHref ||
    pathname.startsWith(`${purchasesBaseHref}/`);
  const [manualProductsExpanded, setManualProductsExpanded] = useState(false);
  const [manualStockExpanded, setManualStockExpanded] = useState(false);
  const [manualDocumentsExpanded, setManualDocumentsExpanded] = useState(false);
  const [manualPurchasingExpanded, setManualPurchasingExpanded] = useState(false);
  const [manualSettingsExpanded, setManualSettingsExpanded] = useState(false);
  const productsExpanded = !collapsed && (manualProductsExpanded || isProductsRoute);
  const stockExpanded = !collapsed && (manualStockExpanded || isStockRoute);
  const documentsExpanded = !collapsed && (manualDocumentsExpanded || isDocumentsRoute);
  const purchasingExpanded = !collapsed && (manualPurchasingExpanded || isPurchasingRoute);
  const settingsExpanded = !collapsed && (manualSettingsExpanded || isSettingsRoute);
  const activeSettingsKey = !isSettingsRoute ? "" : pathname === storageLocationsHref ? "storage-locations" : pathname === receiptPaymentHref ? "receipt-payment" : pathname === activityLogsHref ? "activity-logs" : "store-settings";

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
            setStoreLogoUrl(response.data.logo_url ?? "");
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
        setStoreLogoUrl(firstStore.logo_url ?? "");
        saveCurrentStoreId(firstStore.id);
      } catch {
        if (isMounted) {
          setStoreName(shell.station);
          setStoreDescription("");
          setStoreAddress("");
          setStoreLogoUrl("");
        }
      }
    }

    loadStoreProfile();

    return () => {
      isMounted = false;
    };
  }, [shell.station]);


  const navItems = [
    {
      href: `/${locale}/dashboard`,
      key: "dashboard",
      label: labels.dashboard,
    },
    { href: `/${locale}/sales`, key: "register", label: labels.register },
    { href: `/${locale}/customers`, key: "customers", label: labels.customers },
  ];
  const [topNavItems, trailingNavItems] = [navItems.slice(0, 2), navItems.slice(2)];

  const productsItems: SidebarGroupItem[] = useMemo(
    () => [
      { href: stockBaseHref, key: "product-list", label: labels.productList, icon: <Layers3 className="h-3.5 w-3.5" /> },
      { href: stockCategoriesHref, key: "master-data", label: labels.masterData, icon: <Tags className="h-3.5 w-3.5" /> },
    ],
    [labels.masterData, labels.productList, stockBaseHref, stockCategoriesHref],
  );

  const stockItems: SidebarGroupItem[] = useMemo(
    () => [
      { href: inventoryLevelsHref, key: "stock-levels", label: labels.stockLevels, icon: <Layers3 className="h-3.5 w-3.5" /> },
      { href: stockCountHref, key: "stock-count", label: labels.stockCount, icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
      { href: warehouseReceiveHref, key: "receive-goods", label: labels.receiveGoods, icon: <PackagePlus className="h-3.5 w-3.5" /> },
      { href: warehouseOverviewHref, key: "warehouse-overview", label: labels.warehouseOverview, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
      { href: stockWarehousesHref, key: "warehouses", label: labels.stockWarehouses, icon: <Warehouse className="h-3.5 w-3.5" /> },
    ],
    [
      inventoryLevelsHref,
      stockCountHref,
      labels.receiveGoods,
      labels.stockCount,
      labels.stockLevels,
      labels.stockWarehouses,
      labels.warehouseOverview,
      stockWarehousesHref,
      warehouseOverviewHref,
      warehouseReceiveHref,
    ],
  );

  const activeProductsKey = !isProductsRoute
    ? ""
    : pathname === stockCategoriesHref || pathname.startsWith(`${stockCategoriesHref}/`)
      ? "master-data"
      : "product-list";

  const activeStockKey = !isStockRoute
    ? ""
    : pathname === warehouseReceiveHref || pathname.startsWith(`${warehouseReceiveHref}/`)
      ? "receive-goods"
      : pathname === warehouseOverviewHref || pathname.startsWith(`${warehouseOverviewHref}/`)
        ? "warehouse-overview"
        : pathname === stockWarehousesHref || pathname.startsWith(`${stockWarehousesHref}/`)
          ? "warehouses"
          : "stock-levels";
  const activeDocumentsKey = !isDocumentsRoute
    ? ""
    : pathname === documentsPendingHref
      ? "pending"
      : "bills";

  const activePurchasingKey = !isPurchasingRoute
    ? ""
    : pathname === purchasesSuppliersHref
      ? "suppliers"
      : "orders";

  const documentsItemClass = isDocumentsRoute
    ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg"
    : "text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg";

  function getNavIcon(key: string, isActive: boolean) {
    const className = "h-4 w-4";

    const iconByKey = {
      dashboard: <LayoutDashboard className={className} />,
      customers: <Users className={className} />,
      register: <CircleDollarSign className={className} />,
      settings: <Settings2 className={className} />,
    } as const;

    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
          isActive ? "bg-white/15 text-white" : "bg-violet-900/60 text-violet-300"
        }`}
      >
        {iconByKey[key as keyof typeof iconByKey] ?? (
          <FileText className={className} />
        )}
      </span>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-indigo-950 px-4 py-6 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`${collapsed ? "px-0" : "px-2"} mb-8`}>
        <p className="text-xl font-black tracking-tight text-violet-200">
          {collapsed ? shell.brand.slice(0, 2) : shell.brand}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {topNavItems.map((item) => {
          const isActive = pathname === item.href;
          const isRegister = item.key === "register";
          const commonClasses = `flex items-center gap-3 px-4 py-3 text-sm ${
            isActive
              ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg"
              : "font-medium text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
          } ${collapsed ? "justify-center px-2" : ""}`;

          if (isRegister) {
            return (
              <button
                key={item.key}
                className={`w-full text-left ${commonClasses}`}
                onClick={() => onOpenCashier?.()}
                type="button"
              >
                {getNavIcon(item.key, isActive)}
                {!collapsed ? <span>{item.label}</span> : null}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              className={commonClasses}
              href={item.href}
            >
              {getNavIcon(item.key, isActive)}
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}

        {/* Products group (master data) */}
        <CollapsibleNavGroup
          collapsed={collapsed}
          baseHref={stockBaseHref}
          icon={<Package className="h-4 w-4" />}
          label={labels.products}
          active={isProductsRoute}
          expanded={productsExpanded}
          onToggle={() => setManualProductsExpanded((current) => !current)}
          items={productsItems}
          activeKey={activeProductsKey}
        />

        {/* Stock / Inventory group (quantities) */}
        <CollapsibleNavGroup
          collapsed={collapsed}
          baseHref={inventoryLevelsHref}
          icon={<Boxes className="h-4 w-4" />}
          label={labels.inventory}
          active={isStockRoute}
          expanded={stockExpanded}
          onToggle={() => setManualStockExpanded((current) => !current)}
          items={stockItems}
          activeKey={activeStockKey}
        />

        {/* Purchasing section */}
        <div className="space-y-1">
          <div
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold ${
              isPurchasingRoute ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg" : "text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Link
              className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
              href={purchasesBaseHref}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isPurchasingRoute
                    ? "bg-white/15 text-white"
                    : "bg-violet-900/60 text-violet-300"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
              </span>
              {!collapsed ? (
                <span className="truncate">{labels.purchasing}</span>
              ) : null}
            </Link>
            {!collapsed ? (
              <button
                aria-expanded={purchasingExpanded}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isPurchasingRoute
                    ? "text-white hover:bg-white/10"
                    : "text-violet-400 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
                }`}
                onClick={() => setManualPurchasingExpanded((current) => !current)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${purchasingExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </div>

          {!collapsed ? (
            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                purchasingExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <div className="space-y-1 pt-1 pl-6">
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activePurchasingKey === "orders"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={purchasesBaseHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activePurchasingKey === "orders"
                          ? "bg-violet-700 text-violet-200"
                          : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.purchaseOrders}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activePurchasingKey === "suppliers"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={purchasesSuppliersHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activePurchasingKey === "suppliers"
                          ? "bg-violet-700 text-violet-200"
                          : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.suppliers}</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <Link
            href={documentsBaseHref}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold ${
              documentsItemClass
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                isDocumentsRoute
                  ? "bg-white/15 text-white"
                  : "bg-violet-900/60 text-violet-300"
              }`}
            >
              <ReceiptText className="h-4 w-4" />
            </span>
            {!collapsed ? (
              <span className="truncate">{labels.documents}</span>
            ) : null}
          </Link>
          {false && (
            <div>
              <div className="min-h-0">
                <div className="space-y-1 pt-1 pl-6">
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeDocumentsKey === "bills"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={documentsBaseHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeDocumentsKey === "bills"
                          ? "bg-violet-700 text-violet-200"
                          : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.documentBills}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeDocumentsKey === "pending"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={documentsPendingHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeDocumentsKey === "pending"
                          ? "bg-violet-700 text-violet-200"
                          : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.documentPending}</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {trailingNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${
                isActive
                  ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg"
                  : "font-medium text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
              } ${collapsed ? "justify-center px-2" : ""}`}
              href={item.href}
            >
              {getNavIcon(item.key, isActive)}
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}

        {/* Settings section */}
        <div className="space-y-1">
          <div
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold ${
              isSettingsRoute
                ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white rounded-r-lg"
                : "text-violet-300 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Link
              className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
              href={settingsBaseHref}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isSettingsRoute ? "bg-white/15 text-white" : "bg-violet-900/60 text-violet-300"
                }`}
              >
                <Settings2 className="h-4 w-4" />
              </span>
              {!collapsed ? <span className="truncate">{labels.settings}</span> : null}
            </Link>
            {!collapsed ? (
              <button
                aria-expanded={settingsExpanded}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSettingsRoute
                    ? "text-white hover:bg-white/10"
                    : "text-violet-400 hover:bg-violet-900/50 hover:text-white hover:rounded-r-lg"
                }`}
                onClick={() => setManualSettingsExpanded((v) => !v)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${settingsExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </div>

          {!collapsed ? (
            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                settingsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <div className="space-y-1 pt-1 pl-6">
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeSettingsKey === "store-settings"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={settingsBaseHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeSettingsKey === "store-settings" ? "bg-violet-700 text-violet-200" : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <Store className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.settings}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeSettingsKey === "storage-locations"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={storageLocationsHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeSettingsKey === "storage-locations" ? "bg-violet-700 text-violet-200" : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.storageLocations}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeSettingsKey === "receipt-payment"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={receiptPaymentHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeSettingsKey === "receipt-payment" ? "bg-violet-700 text-violet-200" : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.receiptPayment}</span>
                  </Link>
                  <Link
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                      activeSettingsKey === "activity-logs"
                        ? "bg-violet-800/80 font-semibold text-violet-200"
                        : "text-violet-400 hover:bg-violet-900/60 hover:text-white hover:rounded-xl"
                    }`}
                    href={activityLogsHref}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${
                        activeSettingsKey === "activity-logs" ? "bg-violet-700 text-violet-200" : "bg-violet-900/60 text-violet-400"
                      }`}
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                    </span>
                    <span>{labels.activityLogs}</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </nav>

      <div className="mt-auto">
        <div
          className={`rounded-xl border border-violet-800/50 bg-violet-900/30 px-4 py-3 ${
            collapsed ? "px-2 py-2" : ""
          }`}
        >
          {collapsed ? (
            <div className="flex items-center justify-center">
              {storeLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={storeName}
                  className="h-8 w-8 rounded-lg object-cover"
                  src={storeLogoUrl}
                />
              ) : (
                <span className="block truncate text-center text-xs font-semibold text-violet-300">
                  {storeName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                {shell.storeLabel}
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-700 bg-violet-900">
                  {storeLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={storeName}
                      className="h-full w-full object-cover"
                      src={storeLogoUrl}
                    />
                  ) : (
                    <span className="text-xs font-semibold text-violet-300">
                      {storeName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-violet-200">
                    {storeName}
                  </p>
                  {storeDescription ? (
                    <p className="mt-1 truncate text-xs text-violet-400">
                      {storeDescription}
                    </p>
                  ) : null}
                  {storeAddress ? (
                    <p className="mt-1 truncate text-xs text-violet-400">
                      {storeAddress}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
