"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  PackageX,
  ShieldCheck,
} from "lucide-react";

import { getCurrentStoreId } from "@/lib/store-storage";
import { listProducts } from "@/services/products";

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

type Props = { labels: NotificationLabels };

function readCountSessions(): Array<{ id: string; status: string }> {
  try {
    const storeId = getCurrentStoreId() ?? "default";
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem(`pos-count-sessions-${storeId}`)
        : null;
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ id: string; status: string }>;
  } catch {
    return [];
  }
}

export function NotificationDropdown({ labels }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lowStock, setLowStock] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);
  const [pendingCounts, setPendingCounts] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const refresh = useCallback(() => {
    const sessions = readCountSessions();
    setPendingCounts(
      sessions.filter((s) => s.status === "draft" || s.status === "counting").length,
    );
    setPendingApprovals(sessions.filter((s) => s.status === "review").length);

    listProducts({ limit: 500 })
      .then((res) => {
        const items = res.data?.items ?? [];
        setOutOfStock(items.filter((p) => (p.total_stock ?? 0) === 0).length);
        setLowStock(
          items.filter(
            (p) =>
              (p.total_stock ?? 0) > 0 &&
              p.min_stock != null &&
              (p.total_stock ?? 0) <= p.min_stock,
          ).length,
        );
      })
      .catch(() => {});
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
    },
    {
      id: "out-of-stock",
      icon: <PackageX className="h-4 w-4" />,
      title: labels.outOfStock,
      description: `${outOfStock} ${labels.outOfStockDesc}`,
      count: outOfStock,
      cls: "bg-rose-100 text-rose-600",
    },
    {
      id: "pending-counts",
      icon: <ClipboardCheck className="h-4 w-4" />,
      title: labels.pendingCounts,
      description: `${pendingCounts} ${labels.pendingCountsDesc}`,
      count: pendingCounts,
      cls: "bg-blue-100 text-blue-600",
    },
    {
      id: "pending-approvals",
      icon: <ShieldCheck className="h-4 w-4" />,
      title: labels.pendingApprovals,
      description: `${pendingApprovals} ${labels.pendingApprovalsDesc}`,
      count: pendingApprovals,
      cls: "bg-violet-100 text-violet-600",
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
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
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
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{n.description}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2.5">
          <button
            className="w-full rounded-xl py-1.5 text-center text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            {labels.viewAll}
          </button>
        </div>
      </div>
    </div>
  );
}
