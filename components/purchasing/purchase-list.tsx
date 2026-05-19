"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, XCircle, Package } from "lucide-react";
import { useState } from "react";

import { ReceiveModal } from "@/components/purchasing/receive-modal";
import { cancelPurchaseOrder, listPurchaseOrders, type PurchaseOrder } from "@/services/purchases";

type PurchaseListProps = {
  dictionary: {
    purchaseOrders: string;
    createOrder: string;
    orderNumber: string;
    supplierName: string;
    date: string;
    totalCost: string;
    status: string;
    pending: string;
    partial: string;
    completed: string;
    cancelled: string;
    receiveStock: string;
    cancelOrder: string;
    emptyOrders: string;
    loading: string;
    tableActions: string;
    receiveConfirm: string;
    receiveQuantity: string;
    product: string;
    quantity: string;
    unitCost: string;
    cancel: string;
    saving: string;
    stockUpdated: string;
    [key: string]: string;
  };
  onCreateOrder: () => void;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const statusLabels: Record<string, string> = {
  pending: "pending",
  partial: "partial",
  completed: "completed",
  cancelled: "cancelled",
};

export function PurchaseList({ dictionary, onCreateOrder }: PurchaseListProps) {
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);

  const {
    data: orders = [],
    error,
    refetch,
  } = useQuery<PurchaseOrder[]>({
    queryFn: async () => {
      const response = await listPurchaseOrders();
      return response.data ?? [];
    },
    queryKey: ["purchase-orders"],
  });

  async function handleCancel(poId: string) {
    if (!window.confirm(dictionary.cancelOrder + "?")) return;
    try {
      await cancelPurchaseOrder(poId);
      refetch();
    } catch {
      // silent
    }
  }

  return (
    <>
      <section className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{dictionary.purchaseOrders}</h3>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            onClick={onCreateOrder}
            type="button"
          >
            <ShoppingCart className="h-4 w-4" />
            {dictionary.createOrder}
          </button>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {dictionary.requestFailed ?? "Request failed"}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{dictionary.emptyOrders}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3 pr-4">{dictionary.orderNumber}</th>
                  <th className="pb-3 pr-4">{dictionary.supplierName}</th>
                  <th className="pb-3 pr-4">{dictionary.date}</th>
                  <th className="pb-3 pr-4">{dictionary.totalCost}</th>
                  <th className="pb-3 pr-4">{dictionary.status}</th>
                  <th className="pb-3 text-right">{dictionary.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3 pr-4 font-mono text-xs font-medium">{order.order_number}</td>
                    <td className="py-3 pr-4">{order.supplier?.name ?? "-"}</td>
                    <td className="py-3 pr-4">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {new Intl.NumberFormat("th-TH", {
                        currency: "THB",
                        minimumFractionDigits: 2,
                        style: "currency",
                      }).format(order.total_cost)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {dictionary[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {order.status === "pending" || order.status === "partial" ? (
                          <>
                            <button
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                              onClick={() => setReceivePO(order)}
                              title={dictionary.receiveStock}
                              type="button"
                            >
                              <Package className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => handleCancel(order.id)}
                              title={dictionary.cancelOrder}
                              type="button"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {receivePO ? (
        <ReceiveModal
          dictionary={dictionary}
          onClose={() => { setReceivePO(null); refetch(); }}
          purchaseOrder={receivePO}
        />
      ) : null}
    </>
  );
}
