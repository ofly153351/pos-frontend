"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleDollarSign,
  Menu,
  Monitor,
  Search,
  X,
} from "lucide-react";

import { SidebarDrawer } from "@/components/navigation/sidebar-drawer";
import type { NavLabels } from "@/components/navigation/nav-config";
import { SalesManager } from "@/components/sales/sales-manager";
import type { SalesManagerHandle } from "@/components/sales/sales-manager";
import type { SalesDictionary } from "@/components/sales/types";

const CLOSE_DURATION = 220;

type CashierModalProps = {
  dictionary: SalesDictionary;
  locale: string;
  navLabels: NavLabels;
  onClose: () => void;
};

export function CashierModal({ dictionary, locale, navLabels, onClose }: CashierModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const salesRef = useRef<SalesManagerHandle>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cartCount, setCartCount] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [search, setSearch] = useState("");
  const [vatOn, setVatOn] = useState(false);
  const [noteOn, setNoteOn] = useState(false);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    if (confirmClose) requestAnimationFrame(() => confirmRef.current?.focus());
  }, [confirmClose]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const triggerClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsMenuOpen(false);
    closeTimerRef.current = setTimeout(() => onClose(), CLOSE_DURATION);
  }, [isClosing, onClose]);

  const handleCartChange = useCallback((count: number) => { setCartCount(count); }, []);

  const handleCloseClick = useCallback(() => {
    if (cartCount > 0) setConfirmClose(true);
    else triggerClose();
  }, [cartCount, triggerClose]);

  const handleConfirmClose = useCallback(() => {
    setConfirmClose(false);
    triggerClose();
  }, [triggerClose]);

  const handleCancelClose = useCallback(() => { setConfirmClose(false); }, []);

  const handleEscape = useCallback(() => {
    if (isClosing) return;
    if (isMenuOpen) { setIsMenuOpen(false); return; }
    if (confirmClose) { setConfirmClose(false); return; }
    if (cartCount > 0) setConfirmClose(true);
    else triggerClose();
  }, [isClosing, isMenuOpen, confirmClose, cartCount, triggerClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleEscape(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleEscape]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_40%,_#f8fafc_100%)]"
      style={{
        animation: isClosing
          ? `cashierFadeOut ${CLOSE_DURATION}ms ease-in forwards`
          : "cashierFadeIn 200ms ease-out",
      }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-white px-5 py-4">
        <button
          aria-label="Menu"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${isMenuOpen ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"}`}
          onClick={() => setIsMenuOpen(true)}
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-violet-500" />
          <h2 className="text-base font-bold text-slate-900">
            {dictionary.title || "หน้าขาย"}
          </h2>
          {cartCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </div>

        <div className="relative min-w-0 flex-1">
          <input
            className="w-full rounded-xl border border-violet-200 bg-violet-50/60 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dictionary.searchPlaceholder}
            value={search}
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className="flex h-10 items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
            onClick={() => window.open(`/${locale}/customer-display`, "pos-customer-display")}
            title={dictionary.openCustomerDisplay}
            type="button"
          >
            <Monitor className="h-3.5 w-3.5" />
            {dictionary.openCustomerDisplay}
          </button>
          <button
            className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition ${vatOn ? "border-violet-500 bg-violet-600 text-white shadow-sm" : "border-violet-200 bg-white text-violet-400 hover:bg-violet-50"}`}
            onClick={() => salesRef.current?.toggleVat()}
            type="button"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${vatOn ? "bg-white" : "bg-violet-300"}`} />
            VAT {vatOn ? "7%" : "off"}
          </button>
          <button
            className="flex h-10 items-center rounded-full border border-orange-200 bg-orange-50 px-3.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
            onClick={() => salesRef.current?.holdBill()}
            type="button"
          >
            พักบิล
          </button>
          <button
            className="flex h-10 items-center rounded-full border border-violet-200 bg-violet-50 px-3.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-100"
            onClick={() => salesRef.current?.restoreBill()}
            type="button"
          >
            เรียกบิล
          </button>
          <button
            className={`flex h-10 items-center rounded-full border px-3.5 text-xs font-semibold transition ${noteOn ? "border-violet-400 bg-violet-100 text-violet-700" : "border-violet-200 bg-white text-violet-500 hover:bg-violet-50"}`}
            onClick={() => salesRef.current?.toggleNote()}
            type="button"
          >
            หมายเหตุ
          </button>
        </div>

        <button
          ref={closeRef}
          aria-label="Close cashier"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
          onClick={handleCloseClick}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Sales content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-5 pb-4 pt-4">
          <SalesManager
            ref={salesRef}
            dictionary={dictionary}
            locale={locale}
            externalSearch={search}
            onCartItemsChange={handleCartChange}
            onExternalSearchChange={setSearch}
            onCartStateChange={({ applyVat, showNoteField }) => {
              setVatOn(applyVat);
              setNoteOn(showNoteField);
            }}
            onHoldBillSuccess={triggerClose}
          />
        </div>
      </div>

      {/* Navigation drawer — self-contained inside cashier modal stacking context.
          Backdrop (z-10) and panel (z-20) stay within z-50, no interference with main sidebar (z-40). */}
      <SidebarDrawer
        isOpen={isMenuOpen}
        locale={locale}
        labels={navLabels}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={() => { setIsMenuOpen(false); triggerClose(); }}
      />

      {/* Confirmation dialog */}
      {confirmClose ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-indigo-950/60 backdrop-blur-sm smooth-fade">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-bold text-slate-900">มีสินค้าในตะกร้า {cartCount} รายการ</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                ต้องการพักบิลไว้ก่อน หรือปิดโดยไม่บันทึก?
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2 px-6 pb-4">
              {/* Hold bill */}
              <button
                ref={confirmRef}
                className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left transition hover:border-violet-400 hover:bg-violet-100"
                onClick={() => {
                  setConfirmClose(false);
                  salesRef.current?.holdBill();
                }}
                type="button"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white text-sm">⏸</span>
                <div>
                  <p className="text-sm font-semibold text-violet-800">พักบิล</p>
                  <p className="text-xs text-violet-500">บันทึกรายการไว้ แล้วปิดหน้าร้าน</p>
                </div>
              </button>

              {/* Close without saving */}
              <button
                className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-left transition hover:border-rose-300 hover:bg-rose-100"
                onClick={handleConfirmClose}
                type="button"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white text-sm">✕</span>
                <div>
                  <p className="text-sm font-semibold text-rose-700">ปิดโดยไม่บันทึก</p>
                  <p className="text-xs text-rose-400">รายการในตะกร้าจะหายไป</p>
                </div>
              </button>
            </div>

            {/* Cancel */}
            <div className="border-t border-violet-100 px-6 py-3">
              <button
                className="w-full rounded-lg py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                onClick={handleCancelClose}
                type="button"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes cashierFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cashierFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
    </div>
  );
}
