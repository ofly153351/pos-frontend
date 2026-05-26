import { authorizedApiRequest, authorizedRawRequest } from "@/services/api";
import { getCurrentStoreId } from "@/lib/store-storage";
import type { ReceiptSettingsData, UpdateReceiptSettingsInput } from "@/types/receipt-settings";

function ensureStoreId(): string {
  const id = getCurrentStoreId();
  if (!id) throw new Error("No store selected");
  return id;
}

export function getReceiptSettings() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ReceiptSettingsData>(
    `/api/stores/${storeId}/receipt-settings`,
    {},
    { requireToken: true },
  );
}

export function updateReceiptSettings(input: UpdateReceiptSettingsInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<ReceiptSettingsData>(
    `/api/stores/${storeId}/receipt-settings`,
    { method: "PUT", body: input },
    { requireToken: true },
  );
}

export function fetchReceiptPreviewHTML(input: Partial<UpdateReceiptSettingsInput> = {}) {
  const storeId = ensureStoreId();
  return authorizedRawRequest<string>(
    `/api/stores/${storeId}/receipt-settings/preview`,
    { method: "POST", body: input, responseType: "text" },
    { requireToken: true },
  );
}
