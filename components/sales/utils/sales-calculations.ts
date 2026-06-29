import type { SaleDiscountType } from "@/types/sale";
import type { Product } from "@/types/product";

export type CartItem = {
  discountScope: "line" | "unit";
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function parsePaidAmountAsCeilInt(value: string) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(Math.ceil(parsed), 0);
}

export function removeReceiptPreviewToolbar(html: string, paymentMethod?: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelector(".toolbar")?.remove();

  if (paymentMethod === "cash") {
    const qrSelectors = [
      "[class*='qr']",
      "[id*='qr']",
      "[class*='promptpay']",
      "[id*='promptpay']",
      "[class*='prompt-pay']",
      "img[alt*='QR']",
      "img[alt*='PromptPay']",
      "img[alt*='promptpay']",
    ];
    document.querySelectorAll(qrSelectors.join(",")).forEach((el) => el.remove());
  }
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --receipt-paper-width: 360px;
    }

    html,
    body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      background: #f8fafc !important;
      margin: 0 !important;
      width: auto !important;
    }

    .stage {
      box-sizing: border-box;
      max-width: 100%;
      overflow-x: hidden;
      padding-left: 12px !important;
      padding-right: 12px !important;
    }

    .paper {
      box-sizing: border-box;
      max-width: 100%;
      overflow: visible !important;
      width: min(var(--receipt-paper-width), 100%) !important;
    }

    .paper > style,
    .paper > meta,
    .paper > title {
      display: none !important;
    }

    @media (max-width: 383px) {
      .stage {
        transform: scale(calc((100vw - 24px) / 384));
        transform-origin: top center;
        width: 384px;
      }
    }

    img,
    table {
      max-width: 100%;
    }
  `;
  document.head.appendChild(style);

  return document.documentElement.outerHTML;
}

// Returns per-unit discount value (used for label display, not API calls).
// For per-unit scope: caps at unit price. For percent: returns percent of unit price.
// For line scope: use getCartLine().lineDiscount instead.
export function getDiscountPerUnit(item: CartItem) {
  // Charge the backend's authoritative per-unit price: effective_price equals the
  // active special_price when its window is live, otherwise base_price. The
  // base_price fallback covers stubs (e.g. restored parked bills) that omit it.
  const unitPrice = Number(item.product.effective_price ?? item.product.base_price ?? 0);
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  if (item.discountType === "percent") {
    return (unitPrice * Math.min(Math.max(discountValue, 0), 100)) / 100;
  }

  return Math.min(Math.max(discountValue, 0), unitPrice);
}

// Returns the per-unit discount value to send to the backend API.
// The backend contract always expects per-unit; for line-scope amount discounts
// we divide the capped line discount by quantity so backend's (per-unit × qty)
// formula reconstructs the correct line-level deduction.
export function getApiDiscountPerUnit(item: CartItem): number {
  const unitPrice = Number(item.product.effective_price ?? item.product.base_price ?? 0);
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  if (item.discountType === "percent") {
    // Percent value is inherently per-unit (same result at line or unit scope).
    return Math.min(Math.max(discountValue, 0), 100);
  }

  if (item.discountScope === "line") {
    // Whole-line amount: cap at line subtotal, convert back to per-unit.
    const lineSubtotal = unitPrice * item.quantity;
    const cappedLineDiscount = Math.min(Math.max(discountValue, 0), lineSubtotal);
    return item.quantity > 0 ? roundCurrency(cappedLineDiscount / item.quantity) : 0;
  }

  // Per-unit amount: cap at unit price.
  return Math.min(Math.max(discountValue, 0), unitPrice);
}

export function getCartLine(item: CartItem) {
  const unitPrice = Number(item.product.effective_price ?? item.product.base_price ?? 0);
  const lineSubtotal = unitPrice * item.quantity;
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  let lineDiscount: number;

  if (item.discountType === "percent") {
    // Percentage applies to the full line subtotal (scope toggle is hidden for percent).
    lineDiscount = roundCurrency((lineSubtotal * Math.min(Math.max(discountValue, 0), 100)) / 100);
  } else if (item.discountScope === "line") {
    // Whole-line fixed amount: deduct once from the line subtotal, cap at subtotal.
    // Rounded like the other branches so the discount sums are consistent to 2dp.
    lineDiscount = roundCurrency(Math.min(Math.max(discountValue, 0), lineSubtotal));
  } else {
    // Per-unit fixed amount: cap per unit then scale by quantity.
    const perUnit = Math.min(Math.max(discountValue, 0), unitPrice);
    lineDiscount = roundCurrency(perUnit * item.quantity);
  }

  const lineTotal = roundCurrency(Math.max(lineSubtotal - lineDiscount, 0));
  // Capped per-unit discount — canonical source for the "per-unit" discount badge
  // so the UI never re-applies the cap inline (single source of truth).
  const discountPerUnit = Math.min(Math.max(discountValue, 0), unitPrice);

  return {
    lineDiscount,
    lineSubtotal,
    lineTotal,
    unitPrice,
    discountPerUnit,
  };
}
