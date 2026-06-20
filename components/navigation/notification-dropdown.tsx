"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  PackageX,
  ShieldCheck,
} from "lucide-react";

import { listProducts } from "@/services/products";
import { listCountSessions } from "@/services/stock-count";

export type NotificationLabels = {
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

type Props = { labels: NotificationLabels; locale: string };

export function NotificationDropdown({ labels, locale }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lowStock, setLowStock] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);
  const [pendingCounts, setPendingCounts] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(() => {
    setHasError(false);
    listCountSessions()
      .then((res) => {
        const sessions = res.data ?? [];
        setPendingCounts(
          sessions.filter((s) => s.status === "draft" || s.status === "counting").length,
        );
        setPendingApprovals(sessions.filter((s) => s.status === "review").length);
      })
      .catch((error) => {
        console.error("[NotificationDropdown] failed to load count sessions", error);
        setHasError(true);
      });

    listProducts({ limit: 500 })
      .then((res) => {
        const items = res.data?.items ?? [];
        // Exclude inactive (disabled) products — they are not sellable, so they must
        // not raise stock alerts. Mirrors inventory-manager getStatus(), which treats
        // !is_active as "inactive" and excludes it from the low/out KPI counts.
        const active = items.filter((p) => p.is_active);
        setOutOfStock(active.filter((p) => (p.total_stock ?? 0) === 0).length);
        setLowStock(
          active.filter(
            (p) =>
              (p.total_stock ?? 0) > 0 &&
              p.min_stock != null &&
              (p.total_stock ?? 0) <= p.min_stock,
          ).length,
        );
      })
      .catch((error) => {
        console.error("[NotificationDropdown] failed to load products", error);
        setHasError(true);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const totalBadge = lowStock + outOfStock + pendingCounts + pendingApprovals;

  const notifications = [
    {
      id: "low-stock",
      icon: <AlertTriangle className="h-4 w-4" />,
      title: labels.lowStock,
      description: `${lowStock} ${labels.lowStockDesc}`,
      count: lowStock,
      cls: "bg-amber-100 text-amber-600",
      href: `/${locale}/inventory?status=low-stock`,
    },
    {
      id: "out-of-stock",
      icon: <PackageX className="h-4 w-4" />,
      title: labels.outOfStock,
      description: `${outOfStock} ${labels.outOfStockDesc}`,
      count: outOfStock,
      cls: "bg-rose-100 text-rose-600",
      href: `/${locale}/inventory?status=out-of-stock`,
    },
    {
      id: "pending-counts",
      icon: <ClipboardCheck className="h-4 w-4" />,
      title: labels.pendingCounts,
      description: `${pendingCounts} ${labels.pendingCountsDesc}`,
      count: pendingCounts,
      cls: "bg-blue-100 text-blue-600",
      href: `/${locale}/inventory/counts?status=pending`,
    },
    {
      id: "pending-approvals",
      icon: <ShieldCheck className="h-4 w-4" />,
      title: labels.pendingApprovals,
      description: `${pendingApprovals} ${labels.pendingApprovalsDesc}`,
      count: pendingApprovals,
      cls: "bg-violet-100 text-violet-600",
      href: `/${locale}/inventory/counts?status=review`,
    },
  ].filter((n) => n.count > 0);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={isOpen}
        aria-label={labels.title}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <Bell className="h-4 w-4" />
        {totalBadge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
        {hasError && totalBadge === 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow-sm"
            title="Notifications could not be loaded"
          />
        )}
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-800">{labels.title}</p>
          {totalBadge > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
              {totalBadge}
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-50 py-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">{labels.none}</p>
              <p className="text-xs text-slate-400">{labels.noneDesc}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setIsOpen(false)}
                className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${n.cls}`}
                >
                  {n.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${n.cls}`}
                    >
                      {n.count}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{n.description}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5">
          <Link
            href={`/${locale}/inventory`}
            onClick={() => setIsOpen(false)}
            className="block w-full rounded-xl py-1.5 text-center text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            {labels.viewAll}
          </Link>
        </div>
      </div>
    </div>
  );
}
