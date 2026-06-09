"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { adjustStock } from "@/services/stock-movements";
import type { Product } from "@/types/product";

type Props = {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function StockAdjustModal({ product, onClose, onSuccess }: Props) {
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDelta(0);
    setNote("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [product]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (product) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const currentStock = product.total_stock ?? 0;
  const newStock = currentStock + delta;
  const isInvalid = newStock < 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0 || isInvalid || !product) return;
    startTransition(async () => {
      try {
        await adjustStock({ productId: product.id, physicalQty: newStock, note });
        toast.success(`ปรับสตอก ${product.name} เป็น ${newStock} ชิ้น`);
        onSuccess();
        onClose();
      } catch {
        toast.error("ไม่สามารถปรับสตอกได้");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 smooth-fade" onClick={onClose} />
      <div className="fixed inset-0 z-51 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white shadow-2xl smooth-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">ปรับสตอก</h3>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{product.name}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Current stock */}
            <div className="flex items-center justify-between rounded-xl bg-violet-50/60 px-4 py-3">
              <span className="text-sm text-slate-500">สตอกปัจจุบัน</span>
              <span className="text-lg font-bold text-slate-800">{currentStock} ชิ้น</span>
            </div>

            {/* Delta input */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-violet-800">เพิ่ม / ลด</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDelta((d) => d - 1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  ref={inputRef}
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                  className="flex-1 rounded-xl border border-violet-200 px-3 py-2.5 text-center text-base font-bold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => setDelta((d) => d + 1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isInvalid ? "bg-rose-50 border border-rose-200" : "bg-emerald-50/60 border border-emerald-100"}`}>
              <span className="text-sm text-slate-500">สตอกใหม่</span>
              <span className={`text-lg font-bold ${isInvalid ? "text-rose-600" : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-orange-500" : "text-slate-400"}`}>
                {newStock} ชิ้น
                {delta !== 0 && <span className="ml-2 text-xs font-semibold">({delta > 0 ? "+" : ""}{delta})</span>}
              </span>
            </div>

            {isInvalid && <p className="text-xs text-rose-500">สตอกไม่สามารถติดลบได้</p>}

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-violet-800">หมายเหตุ</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เหตุผลในการปรับสตอก..."
                className="w-full resize-none rounded-xl border border-violet-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-violet-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={delta === 0 || isInvalid || isPending}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
              >
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
