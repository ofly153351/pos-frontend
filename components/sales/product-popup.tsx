"use client";

import { X } from "lucide-react";
import type { Product } from "@/types/product";
import { formatAmount } from "./utils/sales-calculations";

type Props = {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
};

export function ProductPopup({ product, visible, onClose }: Props) {
  if (!product) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[500] flex items-end justify-center p-4 pb-6 transition-opacity duration-200 sm:items-center ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ background: "rgba(15,10,50,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl transition-all duration-200 ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-72">
          {/* Left — image / initials */}
          <div className="w-64 shrink-0">
            {product.image_url ? (
              <img
                alt={product.name}
                className="h-full w-full object-cover"
                src={product.image_url}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-100">
                <span className="text-7xl font-bold text-violet-400">
                  {product.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="min-w-0 flex-1 p-7">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold leading-snug text-slate-900">
                {product.name}
              </h3>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-base">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">ราคา</span>
                <span className="font-semibold text-slate-800">฿{formatAmount(product.base_price)}</span>
              </div>
              {product.special_price != null && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">ราคาพิเศษ</span>
                  <span className="font-semibold text-rose-600">฿{formatAmount(product.special_price)}</span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">SKU</span>
                  <span className="truncate font-medium text-slate-700">{product.sku}</span>
                </div>
              )}
              {product.barcode && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">บาร์โค้ด</span>
                  <span className="truncate font-medium text-slate-700">{product.barcode}</span>
                </div>
              )}
              {product.total_stock !== undefined && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">สต็อก</span>
                  <span className="font-medium text-slate-700">
                    {product.total_stock} {product.product_unit_name ?? ""}
                  </span>
                </div>
              )}
            </div>

            {product.description && (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
