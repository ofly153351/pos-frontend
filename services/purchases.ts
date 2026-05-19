import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { Supplier } from "@/services/suppliers";

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
};

export type PurchaseOrder = {
  id: string;
  store_id: string;
  supplier_id?: string;
  order_number: string;
  status: "pending" | "partial" | "completed" | "cancelled";
  notes?: string;
  total_cost: number;
  received_at?: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
};

export type CreatePOItemInput = {
  product_id: string;
  quantity: number;
  unit_cost: number;
};

export type CreatePOInput = {
  supplier_id?: string;
  notes?: string;
  items: CreatePOItemInput[];
};

export type UpdatePOInput = {
  supplier_id?: string;
  notes?: string;
  status?: string;
};

export type ReceivePOItemInput = {
  product_id: string;
  quantity: number;
};

export type ReceivePOInput = {
  items: ReceivePOItemInput[];
};

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function listPurchaseOrders() {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder[]>(
    `/api/stores/${currentStoreId}/purchase-orders`,
  );
}

export function getPurchaseOrder(poId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder>(
    `/api/stores/${currentStoreId}/purchase-orders/${poId}`,
  );
}

export function createPurchaseOrder(input: CreatePOInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder>(
    `/api/stores/${currentStoreId}/purchase-orders`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function updatePurchaseOrder(poId: string, input: UpdatePOInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder>(
    `/api/stores/${currentStoreId}/purchase-orders/${poId}`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

export function receiveStock(poId: string, input: ReceivePOInput) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder>(
    `/api/stores/${currentStoreId}/purchase-orders/${poId}/receive`,
    {
      body: input,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function cancelPurchaseOrder(poId: string) {
  const currentStoreId = ensureStoreId();
  return authorizedApiRequest<PurchaseOrder>(
    `/api/stores/${currentStoreId}/purchase-orders/${poId}/cancel`,
    {
      method: "POST",
    },
  );
}
