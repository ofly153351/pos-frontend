"use client";

import { useEffect } from "react";
import { MapPin, X } from "lucide-react";
import type { Product } from "@/types/product";

type Props = {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
};

// DEPRECATED / BLOCKED (location-aware stock remediation).
//
// This legacy modal submitted an absolute `physical_quantity` to /stock/adjust derived
// from the product's STORE-WIDE total (product.total_stock) with no location and no
// reason. The backend now (a) requires a reason and (b) requires expected_quantity to
// equal the targeted location's live on-hand, so this payload can no longer succeed — and
// must not, because writing a store-wide total into one location inflates stock for any
// product stored in more than one location.
//
// The safe, location-aware replacement is the StockAdjustDrawer on the Inventory page
// (สินค้าคงคลัง), which adjusts +/- as a delta and sets an actual count against a specific
// location with an optimistic-lock guard. This component is kept (same props) only so
// existing callers compile; it performs NO stock mutation and only directs the user there.
export function StockAdjustModal({ product, onClose }: Props) {
  useEffect(() => {
    if (!product) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 smooth-fade" onClick={onClose} />
      <div className="fixed inset-0 z-51 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800">ปรับสต็อก</h3>
              <p className="truncate text-xs text-slate-500">{product.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด / Close"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-amber-800">
                  การปรับสต็อกย้ายไปที่หน้า “สินค้าคงคลัง” แล้ว
                </p>
                <p className="text-amber-700">
                  เพื่อความปลอดภัย การปรับ/นับสต็อกต้องระบุ “ตำแหน่ง” ที่ชัดเจน
                  (กันยอดรวมทุกตำแหน่งถูกเขียนทับลงตำแหน่งเดียว) กรุณาปรับสต็อกจากหน้า
                  สินค้าคงคลัง
                </p>
                <p className="text-xs text-amber-600">
                  Stock adjustments moved to the Inventory page so every change is tied to a
                  specific location.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              เข้าใจแล้ว / OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
