import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type {
  CreateGoodsReceiptDraftInput,
  GenerateGoodsReceiptDocumentNoResponse,
  GoodsReceiptAttachment,
  GoodsReceiptDraft,
  GoodsReceiptListPage,
  GoodsReceiptPrintDocument,
  GoodsReceiptStockImpact,
  UpdateGoodsReceiptDraftInput,
  UpsertGoodsReceiptItemsInput,
} from "@/types/goods-receipt";

function ensureStoreId() {
  const storeId = getCurrentStoreId();

  if (!storeId) {
    throw new Error("Missing current store");
  }

  return storeId;
}

export function generateGoodsReceiptDocumentNo() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GenerateGoodsReceiptDocumentNoResponse>(
    `/api/stores/${storeId}/receipts/generate-document-no`,
    {
      body: { store_id: storeId },
      method: "POST",
    },
  );
}

export function createGoodsReceiptDraft(input: Omit<CreateGoodsReceiptDraftInput, "store_id">) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(`/api/stores/${storeId}/receipts`, {
    body: {
      ...input,
      store_id: storeId,
    } satisfies CreateGoodsReceiptDraftInput,
    method: "POST",
  });
}

type ListGoodsReceiptsOptions = {
  limit?: number;
  page?: number;
  status?: "draft" | "pending_review" | "confirmed" | "cancelled";
};

export async function listGoodsReceipts(options: ListGoodsReceiptsOptions = {}) {
  const storeId = ensureStoreId();
  const params = new URLSearchParams();

  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 20));

  if (options.status) {
    params.set("status", options.status);
  }

  const response = await authorizedApiRequest<GoodsReceiptDraft[] | GoodsReceiptListPage>(
    `/api/stores/${storeId}/receipts?${params.toString()}`,
  );

  const normalizedData: GoodsReceiptListPage = Array.isArray(response.data)
    ? {
        has_next: false,
        has_prev: false,
        items: response.data,
        limit: response.data.length,
        page: 1,
        total: response.data.length,
        total_pages: 1,
      }
    : response.data;

  return {
    ...response,
    data: normalizedData,
  };
}

export function getGoodsReceipt(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}`,
  );
}

export function updateGoodsReceipt(receiptId: string, input: UpdateGoodsReceiptDraftInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}`,
    {
      body: input,
      method: "PUT",
    },
  );
}

export function upsertGoodsReceiptItems(receiptId: string, input: UpsertGoodsReceiptItemsInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}/items`,
    {
      body: {
        items: input.items,
        replace_existing: input.replace_existing ?? true,
      },
      method: "POST",
    },
  );
}

export function confirmGoodsReceipt(receiptId: string, idempotencyKey?: string) {
  const storeId = ensureStoreId();
  // Phase W3 §12: a confirm idempotency key makes a network-retried confirm safe — the
  // backend returns the original result instead of double-applying stock/cost/PO.
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}/confirm`,
    {
      method: "POST",
      headers,
    },
  );
}

// Submit a draft for approval (draft -> pending_review). Cashier/warehouse can do this.
export function submitGoodsReceipt(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}/submit`,
    { method: "POST" },
  );
}

// Reopen a pending-review receipt back to draft (owner/manager only).
export function reopenGoodsReceipt(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}/reopen`,
    { method: "POST" },
  );
}

export function cancelGoodsReceipt(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptDraft>(
    `/api/stores/${storeId}/receipts/${receiptId}/cancel`,
    { method: "POST" },
  );
}

export function deleteGoodsReceiptDraft(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<void>(
    `/api/stores/${storeId}/receipts/${receiptId}`,
    { method: "DELETE", allowEmptyData: true },
  );
}

export function uploadGoodsReceiptAttachment(receiptId: string, file: File) {
  const storeId = ensureStoreId();
  const formData = new FormData();
  formData.set("file", file);

  return authorizedApiRequest<GoodsReceiptAttachment>(
    `/api/stores/${storeId}/receipts/${receiptId}/attachments`,
    {
      body: formData,
      method: "POST",
    },
  );
}

export function getGoodsReceiptPrintUrl(receiptId: string) {
  const storeId = ensureStoreId();
  return `/api/stores/${storeId}/receipts/${receiptId}/print`;
}

export function getGoodsReceiptStockImpact(receiptId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<GoodsReceiptStockImpact[]>(
    `/api/stores/${storeId}/receipts/${receiptId}/stock-impact`,
  );
}

export async function fetchGoodsReceiptPrintDocument(receiptId: string) {
  const storeId = ensureStoreId();

  return authorizedApiRequest<GoodsReceiptPrintDocument>(
    `/api/stores/${storeId}/receipts/${receiptId}/print`,
    {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
    },
  );
}
