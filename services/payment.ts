import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";

export type PromptPayQR = {
  qr: string; // data:image/png;base64,...
  amount: number;
  promptpay_id: string;
};

// Dynamic PromptPay QR for the current cart amount (server computes EMV + CRC).
export function fetchPromptPayQR(amount: number) {
  const storeId = getCurrentStoreId();
  if (!storeId) throw new Error("Missing current store");
  return authorizedApiRequest<PromptPayQR>(
    `/api/stores/${storeId}/promptpay-qr?amount=${encodeURIComponent(amount.toFixed(2))}`,
  );
}
