"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { receiveStock, type PurchaseOrder } from "@/services/purchases";

type ReceiveModalProps = {
  dictionary: {
    receiveStock: string;
    receiveConfirm: string;
    receiveQuantity: string;
    product: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    cancel: string;
    saving: string;
    stockUpdated: string;
    [key: string]: string;
  };
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
};

export function ReceiveModal({ dictionary, onClose, purchaseOrder }: ReceiveModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const items = purchaseOrder.items ?? [];

  function handleQtyChange(productId: string, value: string) {
    const num = parseInt(value, 10);
    setQuantities({ ...quantities, [productId]: isNaN(num) ? 0 : num });
  }

  async function handleReceive() {
    setError("");

    const receiveItems = items
      .filter((item) => {
        const qty = quantities[item.product_id] ?? 0;
        return qty > 0;
      })
      .map((item) => ({
        product_id: item.product_id,
        quantity: quantities[item.product_id] ?? 0,
      }));

    if (receiveItems.length === 0) {
      setError(dictionary.receiveQuantity + " is required");
      return;
    }

    // Validate no item exceeds remaining
    for (const item of items) {
      const reqQty = quantities[item.product_id] ?? 0;
      const remaining = item.quantity - item.received_quantity;
      if (reqQty > remaining) {
        setError(`${dictionary.receiveQuantity} for "${item.product_name || item.product_id}" exceeds remaining (${remaining})`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await receiveStock(purchaseOrder.id, { items: receiveItems });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.15)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900">{dictionary.receiveStock}</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">{purchaseOrder.order_number}</p>
            </div>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">No items in this order</p>
            ) : (
              items.map((item) => {
                const remaining = item.quantity - item.received_quantity;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{item.product_name || item.product_id}</span>
                      <span className="text-xs text-slate-500">
                        {dictionary.quantity}: {item.quantity} | {dictionary.receiveQuantity}: {item.received_quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          {dictionary.receiveQuantity} (max: {remaining})
                        </label>
                        <input
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          max={remaining}
                          min={0}
                          onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                          type="number"
                          value={quantities[item.product_id] ?? 0}
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{dictionary.unitCost}</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Intl.NumberFormat("th-TH", {
                            currency: "THB",
                            minimumFractionDigits: 2,
                            style: "currency",
                          }).format(item.unit_cost)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={onClose}
              type="button"
            >
              {dictionary.cancel}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              disabled={isPending}
              onClick={handleReceive}
              type="button"
            >
              {isPending ? dictionary.saving : dictionary.receiveConfirm}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
