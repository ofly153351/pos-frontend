"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { createGoodsReceiptDraft, generateGoodsReceiptDocumentNo } from "@/services/goods-receipts";
import { getPurchaseOrder } from "@/services/purchases";
import { listWarehouses } from "@/services/warehouses";
import type { ReceiveDictionary } from "./receive-shared";

// Opening Goods Receiving creates a draft and immediately opens the editor — no
// introductory landing screen. An optional ?po= preloads the purchase order.
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
  const startedRef = useRef(false);
  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "receive", "new", "warehouses"],
    queryFn: async () => (await listWarehouses()).data ?? [],
  });

  useEffect(() => {
    if (startedRef.current || !warehousesQuery.data) return;
    startedRef.current = true;
    const warehouses = warehousesQuery.data;
    void (async () => {
      try {
        const warehouseId = warehouses[0]?.id;
        if (!warehouseId) {
          setError(t.validationWarehouseRequired);
          startedRef.current = false;
          return;
        }
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
          warehouse_id: warehouseId,
          purchase_order_id: purchaseOrderId || undefined,
          supplier_id: supplierId,
        });
        router.replace(`/${locale}/warehouse/receive/${res.data.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.stateSaving);
        startedRef.current = false;
      }
    })();
  }, [warehousesQuery.data, purchaseOrderId, t, locale, router]);

  if (error) {
    return <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        {t.actionCreatingDraft}
      </div>
    </div>
  );
}
