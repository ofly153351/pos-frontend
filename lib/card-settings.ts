import { getAuthSession } from "@/lib/auth-storage";

// Product-card display preferences for the cashier grid, scoped per user.
export type CardNamePos = "bottom" | "top";
export type CardFit = "cover" | "contain";
export type CardAspect = "1/1" | "4/3" | "3/4";
export type CardLines = 1 | 2 | 3;
export type CardSize = "sm" | "md" | "lg";

export type CardSettings = {
  namePos: CardNamePos;
  fit: CardFit;
  aspect: CardAspect;
  lines: CardLines;
  size: CardSize;
  showStock: boolean;
};

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  namePos: "bottom",
  fit: "cover",
  aspect: "1/1",
  lines: 2,
  size: "md",
  showStock: true,
};

export const CARD_SIZE_MIN: Record<CardSize, string> = {
  sm: "132px",
  md: "168px",
  lg: "212px",
};

// Fixed image-area height (px) per size × aspect ratio.
// Fixed (not CSS aspect-ratio) so the height is deterministic and identical in the
// settings preview and the real grid, and can never be squeezed by flex shrink.
const CARD_IMAGE_HEIGHT: Record<CardSize, Record<CardAspect, number>> = {
  sm: { "1/1": 128, "4/3": 100, "3/4": 168 },
  md: { "1/1": 156, "4/3": 120, "3/4": 204 },
  lg: { "1/1": 192, "4/3": 148, "3/4": 252 },
};

// Single source of truth for the card image-area height, shared by ProductCard
// (real grid) and the settings-modal preview (same component).
export function resolveCardImageHeight(settings: CardSettings): number {
  return CARD_IMAGE_HEIGHT[settings.size][settings.aspect];
}

const BASE_KEY = "pos-card-settings";

function storageKey(): string {
  const userId = getAuthSession()?.user?.id;
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

export function loadCardSettings(): CardSettings {
  if (typeof window === "undefined") return DEFAULT_CARD_SETTINGS;
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return DEFAULT_CARD_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CardSettings>;
    return { ...DEFAULT_CARD_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_CARD_SETTINGS;
  }
}

export function saveCardSettings(settings: CardSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(settings));
  // Notify same-tab listeners (storage event only fires cross-tab).
  window.dispatchEvent(new CustomEvent("pos-card-settings-changed"));
}

// Write to the local cache without broadcasting a change event.
// Used when hydrating the cache from the server to avoid re-render loops.
export function cacheCardSettings(settings: CardSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(settings));
}
