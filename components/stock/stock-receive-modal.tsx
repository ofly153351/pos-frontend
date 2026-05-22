"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { addStock, listMovements, type StockMovement } from "@/services/stock-movements";
import type { Product } from "@/types/product";

type StockReceiveModalProps = {
  dictionary: {
    receiveStockTitle?: string;
    receiveStock?: string;
    receiveStockConfirm?: string;
    receiveStockSuccess?: string;
    quantityToAdd?: string;
    productName?: string;
    currentStock?: string;
    note?: string;
    cancel?: string;
    saving?: string;
    historyTab?: string;
    historyEmpty?: string;
    historyProduct?: string;
    historyQty?: string;
    historyDate?: string;
    historyNote?: string;
    historyOperator?: string;
    historyLoadError?: string;
  };
  onClose: () => void;
  onComplete: () => void;
  products: Product[];
  selectedIds: Set<string>;
};

export function StockReceiveModal({
  dictionary,
  onClose,
  onComplete,
  products,
  selectedIds,
}: StockReceiveModalProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      if (selectedIds.has(p.id)) {
        initial[p.id] = 0;
      }
    });
    return initial;
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));

  // Close on Escape only — NOT on backdrop click
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap — focus the modal on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Fetch receiving history
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ["stock", "movements", "addition"],
    queryFn: () => listMovements(),
    staleTime: 30_000,
    select: (response) => response.data,
  });

  // Filter only addition-type movements
  const historyMovements = (historyData?.items ?? []).filter(
    (m: StockMovement) => m.type === "addition" || m.quantity_change > 0,
  );

  function setQuantity(productId: string, value: string) {
    const num = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  }

  function setNote(productId: string, value: string) {
    setNotes((prev) => ({ ...prev, [productId]: value }));
  }

  async function handleSubmit() {
    setError("");

    const items = selectedProducts
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        product_id: p.id,
        quantity: quantities[p.id] ?? 0,
        note: notes[p.id] ?? "",
      }));

    if (items.length === 0) {
      setError(dictionary.quantityToAdd ?? "Please add at least one quantity");
      return;
    }

    startTransition(async () => {
      try {
        await addStock({ items });
        await queryClient.invalidateQueries({ queryKey: ["stock", "products"] });
        await queryClient.invalidateQueries({ queryKey: ["stock", "movements"] });
        onComplete();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Request failed",
        );
      }
    });
  }

  const tabClass = (tab: "receive" | "history") =>
    `relative px-5 py-2.5 text-sm font-medium transition-colors rounded-lg ${
      activeTab === tab
        ? "bg-violet-600 text-white shadow-sm"
        : "text-violet-600 hover:bg-violet-50 hover:text-slate-800"
    }`;

  return (
    <>
      {/* Backdrop — does NOT close modal on click */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-[0_24px_60px_rgba(124,58,237,0.15)] animate-[fadeIn_0.2s_ease-out]"
          ref={modalRef}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h4 className="text-lg font-bold text-slate-900">
              {dictionary.receiveStockTitle ?? "รับสินค้าเข้า"}
            </h4>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 px-6 py-3">
            <button
              className={tabClass("receive")}
              onClick={() => setActiveTab("receive")}
              type="button"
            >
              {dictionary.receiveStock ?? "รับสินค้าเข้า"}
            </button>
            <button
              className={tabClass("history")}
              onClick={() => setActiveTab("history")}
              type="button"
            >
              {dictionary.historyTab ?? "ประวัติรับเข้า"}
            </button>
          </div>

          {/* Body */}
          {activeTab === "receive" ? (
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 14rem)" }}>
              {error ? (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              ) : null}

              {selectedProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {dictionary.quantityToAdd ?? "No products selected"}
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        {/* Image */}
                        {product.image_url ? (
                          <img
                            alt={product.name}
                            className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                            loading="lazy"
                            src={product.image_url}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                            {product.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Name + SKU */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {product.name}
                          </p>
                          {product.sku ? (
                            <p className="truncate text-xs text-slate-400">
                              {product.sku}
                            </p>
                          ) : null}
                        </div>

                        {/* Current stock */}
                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            {dictionary.currentStock ?? "คงเหลือ"}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {product.total_stock ?? 0}
                          </p>
                        </div>
                      </div>

                      {/* Quantity + Note inputs */}
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {dictionary.quantityToAdd ?? "จำนวนที่รับเข้า"}
                          </label>
                          <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            min={0}
                            onChange={(e) => setQuantity(product.id, e.target.value)}
                            placeholder="0"
                            type="number"
                            value={quantities[product.id] ?? 0}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {dictionary.note ?? "หมายเหตุ"}
                          </label>
                          <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            onChange={(e) => setNote(product.id, e.target.value)}
                            placeholder="..."
                            type="text"
                            value={notes[product.id] ?? ""}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 14rem)" }}>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg aria-hidden="true" className="h-6 w-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                  </svg>
                </div>
              ) : historyError ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {dictionary.historyLoadError ?? "Failed to load history"}
                </p>
              ) : historyMovements.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  {dictionary.historyEmpty ?? "No receiving history yet"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3">{dictionary.historyProduct ?? "Product"}</th>
                        <th className="px-3 py-3 text-right">{dictionary.historyQty ?? "Quantity"}</th>
                        <th className="px-3 py-3">{dictionary.historyDate ?? "Date/Time"}</th>
                        <th className="px-3 py-3">{dictionary.historyNote ?? "Note"}</th>
                        <th className="px-3 py-3">{dictionary.historyOperator ?? "Operator"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyMovements.slice(0, 20).map((movement: StockMovement) => (
                        <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">{movement.product_name}</span>
                              {movement.product_sku ? (
                                <span className="text-xs text-slate-400">{movement.product_sku}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                            +{movement.quantity_change}
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(movement.created_at).toLocaleString("th-TH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-3 text-slate-500 max-w-[160px] truncate" title={movement.note || "-"}>
                            {movement.note || "-"}
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            {movement.created_by_name || movement.created_by || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer — only show on receive tab */}
          {activeTab === "receive" ? (
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={onClose}
                type="button"
              >
                {dictionary.cancel ?? "ยกเลิก"}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                disabled={isPending}
                onClick={handleSubmit}
                type="button"
              >
                {isPending
                  ? dictionary.saving ?? "กำลังบันทึก..."
                  : dictionary.receiveStockConfirm ?? "ยืนยันรับสินค้า"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
