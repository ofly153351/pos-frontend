"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, CircleDollarSign, X } from "lucide-react";

import { NAV_ENTRIES, isNavGroup } from "@/components/navigation/nav-config";
import type { NavLabels } from "@/components/navigation/nav-config";

type SidebarDrawerProps = {
  isOpen: boolean;
  locale: string;
  labels: NavLabels;
  onClose: () => void;
  onNavigate: () => void;
};

export function SidebarDrawer({ isOpen, locale, labels, onClose, onNavigate }: SidebarDrawerProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeExpanded = useMemo(() => {
    return NAV_ENTRIES.reduce<Record<string, boolean>>((groups, entry) => {
      if (!isNavGroup(entry)) return groups;
      const base = entry.href(locale);
      groups[entry.key] = pathname === base || pathname.startsWith(`${base}/`);
      return groups;
    }, {});
  }, [locale, pathname]);

  function label(key: string) {
    return labels[key] ?? key;
  }

  return (
    <>
      {/* Backdrop — fixed within cashier modal stacking context */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-10 bg-indigo-950/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-indigo-950 shadow-[4px_0_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-violet-900/50 px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20">
              <CircleDollarSign className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-sm font-bold text-white">เมนูหลัก</span>
          </div>
          <button
            aria-label="ปิดเมนู"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-400 transition hover:bg-violet-900/60 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-0.5">
            {NAV_ENTRIES.map((entry) => {
              // Hide "register" — already inside the cashier
              if (entry.key === "register") return null;

              if (isNavGroup(entry)) {
                const base = entry.href(locale);
                const groupActive = pathname === base || pathname.startsWith(`${base}/`);
                const isExpanded = expanded[entry.key] ?? activeExpanded[entry.key] ?? false;

                return (
                  <div key={entry.key}>
                    {/* Group row */}
                    <div
                      className={`flex items-center gap-3 rounded-r-xl px-3 py-2.5 text-sm font-medium ${
                        groupActive
                          ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white"
                          : "text-violet-300"
                      }`}
                    >
                      <Link
                        className="flex min-w-0 flex-1 items-center gap-3"
                        href={base}
                        onClick={onNavigate}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            groupActive ? "bg-white/15 text-white" : "bg-violet-900/70 text-violet-400"
                          }`}
                        >
                          {entry.icon}
                        </span>
                        <span className="truncate">{label(entry.key)}</span>
                      </Link>
                      <button
                        aria-expanded={isExpanded}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                          groupActive
                            ? "text-white hover:bg-white/10"
                            : "text-violet-400 hover:bg-violet-900/50 hover:text-white"
                        }`}
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [entry.key]: !e[entry.key] }))
                        }
                        type="button"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Sub-items */}
                    <div
                      className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="min-h-0">
                        <div className="space-y-0.5 pb-1 pl-6 pt-1">
                          {entry.children.map((child) => {
                            const childHref = child.href(locale);
                            const childActive = pathname === childHref;
                            return (
                              <Link
                                key={child.key}
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                                  childActive
                                    ? "bg-violet-800/80 font-semibold text-violet-200"
                                    : "text-violet-400 hover:bg-violet-900/60 hover:text-white"
                                }`}
                                href={childHref}
                                onClick={onNavigate}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                    childActive
                                      ? "bg-violet-700 text-violet-200"
                                      : "bg-violet-900/60 text-violet-400"
                                  }`}
                                >
                                  {child.icon}
                                </span>
                                {label(child.key)}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Leaf item
              const href = entry.href(locale);
              const active = pathname === href;
              return (
                <Link
                  key={entry.key}
                  className={`flex items-center gap-3 rounded-r-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-l-[3px] border-violet-400 bg-violet-900 font-bold text-white"
                      : "text-violet-300 hover:bg-violet-900/50 hover:text-white"
                  }`}
                  href={href}
                  onClick={onNavigate}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-white/15 text-white" : "bg-violet-900/70 text-violet-400"
                    }`}
                  >
                    {entry.icon}
                  </span>
                  {label(entry.key)}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-violet-900/50 px-4 py-4">
          <p className="text-[11px] text-violet-600">POS System</p>
        </div>
      </div>
    </>
  );
}
