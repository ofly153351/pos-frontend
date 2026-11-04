"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { createGoodsReceiptDraft, generateGoodsReceiptDocumentNo } from "@/services/goods-receipts";
import { getPurchaseOrder } from "@/services/purchases";
import { listWarehouses } from "@/services/warehouses";
import { friendlyMessage } from "@/lib/form-errors";
import type { ReceiveDictionary } from "./receive-shared";

// B18: opening this page never creates anything. The user picks the receiving
// warehouse (preselected only when the store has exactly one) and explicitly
// creates the draft; the backend re-validates every line's location against
// that warehouse on submit/confirm. An optional ?po= preloads the purchase order.
export function ReceiveNewRedirect({
  dictionary: t,
  locale,
  purchaseOrderId,
}: {
  dictionary: ReceiveDictionary;
  locale: string;
  purchaseOrderId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "receive", "new", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);
  // A single warehouse is the only unambiguous default.
  const selectedWarehouseId = warehouseId || (warehouses.length === 1 ? warehouses[0].id : "");

  async function createDraft() {
    if (creatingRef.current) return;
    if (!selectedWarehouseId) {
      setError(t.validationWarehouseRequired);
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setError("");
    try {
      let supplierId: string | undefined;
      if (purchaseOrderId) {
        try {
          supplierId = (await getPurchaseOrder(purchaseOrderId)).data.supplier_id || undefined;
        } catch {
          /* PO supplier is best-effort; the editor still loads the PO lines */
        }
      }
      const doc = await generateGoodsReceiptDocumentNo();
      const res = await createGoodsReceiptDraft({
        document_no: doc.data.document_no,
        received_at: new Date().toISOString(),
        vat_included: true,
        vat_percent: 7,
        warehouse_id: selectedWarehouseId,
        purchase_order_id: purchaseOrderId || undefined,
        supplier_id: supplierId,
      });
      router.replace(`/${locale}/warehouse/receive/${res.data.id}`);
    } catch (e) {
      setError(friendlyMessage(e));
      creatingRef.current = false;
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {t.labelWarehouse}
        <select
          value={selectedWarehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          disabled={warehousesQuery.isPending || creating}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        >
          <option value="">{t.placeholderSelectWarehouse}</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>
      {error ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} disabled={creating}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">{t.actionCancel}</button>
        <button type="button" onClick={() => void createDraft()} disabled={creating || !selectedWarehouseId}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {creating ? t.actionCreatingDraft : t.actionCreateDraft}
        </button>
      </div>
    </div>
  );
}
