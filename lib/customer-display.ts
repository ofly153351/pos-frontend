// Browser-to-browser sync between the cashier (screen 1) and the customer
// display (screen 2) on the same machine. Uses BroadcastChannel for live push
// + localStorage so a freshly-opened display picks up the current state
// immediately (BroadcastChannel does not replay past messages).

/** Discount details for a single cart line — mapped from CartItem by the publisher. */
export type DisplayItemDiscount = {
  /** "amount" = fixed baht; "percent" = percentage rate. */
  type: "amount" | "percent";
  /** For "amount" only: whether the amount was applied once to the whole line or per unit. */
  scope: "line" | "unit";
  /**
   * Display value:
   *   percent → the rate (e.g. 10 for 10%)
   *   amount/unit → effective per-unit discount in baht (capped at unit price)
   *   amount/line → effective line discount in baht (capped at subtotal)
   */
  value: number;
  /** Total monetary discount for this line (always in baht). */
  totalDiscount: number;
};

export type DisplayItem = {
  name: string;
  qty: number;
  /** Unit price before per-item cashier discount (= effective_price). */
  originalUnitPrice: number;
  /** Unit price after per-item cashier discount. Equal to originalUnitPrice when no item discount. */
  unitPrice: number;
  lineTotal: number;
  /** True when a per-item cashier discount is applied (originalUnitPrice !== unitPrice). */
  hasItemDiscount: boolean;
  imageUrl?: string | null;
  /** Present when a cashier discount was applied — drives the discount-reason row on the display. */
  discount?: DisplayItemDiscount;
};

export type DisplayState =
  | { phase: "welcome" }
  | {
      phase: "selling";
      /** Store identity — persists in CustomerDisplay storeIdentity state across phase changes. */
      storeName?: string;
      storeLogoUrl?: string | null;
      items: DisplayItem[];
      /** Sum of (originalUnitPrice × qty) for all items — before any discount. */
      subtotalBeforeDiscount: number;
      /** Sum of per-item cashier discounts. */
      itemDiscount: number;
      /** Customer / member tier discount amount. */
      customerDiscount: number;
      /** Discount percentage (e.g. 20 for 20%) — used for the label. */
      customerDiscountPercent: number;
      /** Promotion engine discount (line-level + bill-level combined). */
      promoDiscount: number;
      /** Manual bill-level discount entered by cashier. */
      billDiscount: number;
      /** Coupon code used (if any) — for display only. */
      couponCode?: string;
      vat: number;
      total: number;
      customerName?: string;
      /** 1=General, 2=Silver, 3=Gold, 4=Platinum, 5=VIP */
      customerLevel?: number;
    }
  | {
      phase: "payment";
      storeName?: string;
      storeLogoUrl?: string | null;
      total: number;
      method: string;
      qr?: string;
      /** For bank_transfer: account details to show on the customer display. */
      bankAccount?: { bankName: string; accountName: string; accountNo: string };
    }
  | {
      phase: "success";
      storeName?: string;
      storeLogoUrl?: string | null;
      total: number;
      /** Cash received amount (undefined for non-cash). */
      receivedAmount?: number;
      /** Change due (only when cash and receivedAmount > total). */
      change?: number;
      /** Payment method key for display label. */
      method?: string;
    };

/** Milliseconds the success screen is shown before auto-returning to welcome.
 *  Shared between the publisher (to gate the cart-clear override) and the subscriber timer. */
export const AUTO_RETURN_MS = 12_000;

const CHANNEL = "pos-customer-display";
const STORAGE_KEY = "pos-customer-display-state";

export const WELCOME: DisplayState = { phase: "welcome" };

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

// Publisher side (cashier). Reuse one channel instance.
let publisher: BroadcastChannel | null = null;

export function publishDisplayState(state: DisplayState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
  if (!publisher) publisher = getChannel();
  publisher?.postMessage(state);
}

// Subscriber side (customer display). Returns an unsubscribe fn.
// Immediately delivers the last known state (from localStorage) on subscribe.
export function subscribeDisplayState(onState: (s: DisplayState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  // initial state from cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) onState(JSON.parse(raw) as DisplayState);
    else onState(WELCOME);
  } catch {
    onState(WELCOME);
  }

  const ch = getChannel();
  const onMsg = (e: MessageEvent) => onState(e.data as DisplayState);
  ch?.addEventListener("message", onMsg);

  // cross-tab fallback when BroadcastChannel is unavailable
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        onState(JSON.parse(e.newValue) as DisplayState);
      } catch {
        /* ignore */
      }
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.removeEventListener("message", onMsg);
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}
