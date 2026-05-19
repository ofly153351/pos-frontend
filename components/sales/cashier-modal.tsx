"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { SalesManager } from "@/components/sales/sales-manager";
import type { SalesDictionary } from "@/components/sales/types";

type CashierModalProps = {
  dictionary: SalesDictionary;
  onClose: () => void;
};

export function CashierModal({ dictionary, onClose }: CashierModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [cartCount, setCartCount] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);

  // Focus the close button on mount for Escape key
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Focus confirm button when confirm dialog appears
  useEffect(() => {
    if (confirmClose) {
      // Small delay for DOM to render
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [confirmClose]);

  const handleCartChange = useCallback((count: number) => {
    setCartCount(count);
  }, []);

  const handleCloseClick = useCallback(() => {
    if (cartCount > 0) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  }, [cartCount, onClose]);

  const handleConfirmClose = useCallback(() => {
    setConfirmClose(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setConfirmClose(false);
  }, []);

  // Escape key logic: if confirm dialog is open, cancel it; otherwise close modal
  const handleEscape = useCallback(() => {
    if (confirmClose) {
      setConfirmClose(false);
    } else if (cartCount > 0) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  }, [confirmClose, cartCount, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleEscape();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEscape]);

  return (
    <div className="fixed inset-0 z-50 flex animate-[fadeIn_200ms_ease-out] flex-col bg-white">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
        <h2 className="text-lg font-bold text-slate-900">
          {dictionary.title || "Cashier Screen"}
        </h2>
        <button
          ref={closeRef}
          aria-label="Close cashier"
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={handleCloseClick}
          type="button"
        >
          <X className="h-4 w-4" />
          <span>ปิด / Close</span>
        </button>
      </div>

      {/* Sales content with top spacing */}
      <div className="flex-1 overflow-auto">
        <div className="w-[90%] mx-auto pt-4">
          <SalesManager
            dictionary={dictionary}
            onCartItemsChange={handleCartChange}
          />
        </div>
      </div>

      {/* Confirmation dialog overlay */}
      {confirmClose ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              ยืนยันการปิดหน้าร้าน
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              มีสินค้าในตะกร้า {cartCount} รายการ หากปิดจะสูญเสียรายการที่ยังไม่ได้บันทึก
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                onClick={handleCancelClose}
                type="button"
              >
                ยกเลิก / Cancel
              </button>
              <button
                ref={confirmRef}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                onClick={handleConfirmClose}
                type="button"
              >
                ปิด / Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inline keyframe for fade-in */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
