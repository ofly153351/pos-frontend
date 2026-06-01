import type { SaleDiscountType } from "@/types/sale";
import type { Product } from "@/types/product";

export type CartItem = {
  discountType: SaleDiscountType;
  discountValue: string;
  product: Product;
  quantity: number;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
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

export function getDiscountPerUnit(item: CartItem) {
  const unitPrice = Number(item.product.base_price ?? 0);
  const rawValue = Number(item.discountValue || 0);
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0;

  if (item.discountType === "percent") {
    return (unitPrice * Math.min(Math.max(discountValue, 0), 100)) / 100;
  }

  return Math.min(Math.max(discountValue, 0), unitPrice);
}

export function getCartLine(item: CartItem) {
  const unitPrice = Number(item.product.base_price ?? 0);
  const discountPerUnit = getDiscountPerUnit(item);
  const lineSubtotal = unitPrice * item.quantity;
  const lineDiscount = discountPerUnit * item.quantity;
  const lineTotal = Math.max(lineSubtotal - lineDiscount, 0);

  return {
    lineDiscount,
    lineSubtotal,
    lineTotal,
    unitPrice,
  };
}
