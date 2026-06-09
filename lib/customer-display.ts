// Browser-to-browser sync between the cashier (screen 1) and the customer
// display (screen 2) on the same machine. Uses BroadcastChannel for live push
// + localStorage so a freshly-opened display picks up the current state
// immediately (BroadcastChannel does not replay past messages).

export type DisplayItem = {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type DisplayState =
  | { phase: "welcome"; storeName?: string }
  | {
      phase: "selling";
      items: DisplayItem[];
      subtotal: number;
      discount: number;
      vat: number;
      total: number;
      customer?: string;
    }
  | { phase: "payment"; total: number; method: string; qr?: string }
  | { phase: "success"; total: number; change?: number };

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
