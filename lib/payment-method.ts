/**
 * Canonical payment-method labels — the SINGLE source of truth for how a
 * payment method is shown anywhere in the app (dashboard, reports, P&L,
 * sales history, sale detail, receipts).
 *
 * Why baked-in (not per-page locale slices): the labels had drifted across
 * 4+ independent maps (dashboard said "QR พร้อมเพย์"/"เครดิต", reports said
 * "พร้อมเพย์"/"สินเชื่อ", the dashboard didn't even map bank_transfer → raw key).
 * A fixed business enum resolved in one place can't drift again.
 *
 * Aliases collapse legacy / duplicate keys onto one canonical channel:
 *   - transfer (legacy) + bank_transfer  → โอนเงิน
 *   - qr (legacy)       + promptpay       → พร้อมเพย์ (QR)
 *   - card + credit_card + debit_card     → บัตรเครดิต / เดบิต  (one channel, per decision)
 *   - credit (a sale sold on credit, NOT a tender) → ขายเชื่อ / ค้างชำระ
 *     — kept distinct from บัตรเครดิต to avoid the "เครดิต" confusion.
 */

export type PaymentLocale = "th" | "en";

type LabelPair = { th: string; en: string };

// Canonical channel → label. Order also defines the canonical display order.
const CANONICAL_LABELS: Record<string, LabelPair> = {
  cash:          { th: "เงินสด",              en: "Cash" },
  bank_transfer: { th: "โอนเงิน",             en: "Bank transfer" },
  promptpay:     { th: "พร้อมเพย์ (QR)",      en: "PromptPay (QR)" },
  card:          { th: "บัตรเครดิต / เดบิต",  en: "Credit / Debit card" },
  truemoney:     { th: "TrueMoney Wallet",    en: "TrueMoney Wallet" },
  shopeepay:     { th: "ShopeePay",           en: "ShopeePay" },
  credit:        { th: "ขายเชื่อ / ค้างชำระ", en: "Credit sale" },
};

// Legacy / duplicate raw keys → canonical key.
const ALIASES: Record<string, string> = {
  transfer: "bank_transfer", // legacy "โอนเงิน"
  qr: "promptpay",           // legacy QR alias
  credit_card: "card",
  debit_card: "card",
  card_credit: "card",
};

const OTHER: LabelPair = { th: "อื่น ๆ", en: "Other" };

/** Map any stored/raw payment_method value to its canonical key. */
export function canonicalPaymentKey(method: string | undefined | null): string {
  const k = (method ?? "").toLowerCase().trim();
  if (CANONICAL_LABELS[k]) return k;
  return ALIASES[k] ?? k;
}

/**
 * Localised display label for any payment_method value (canonical, legacy, or unknown).
 * This is the function every surface should call.
 */
export function resolvePaymentLabel(method: string | undefined | null, locale: string = "th"): string {
  const key = canonicalPaymentKey(method);
  const pair = CANONICAL_LABELS[key] ?? OTHER;
  return locale === "en" ? pair.en : pair.th;
}

/** Canonical keys in display order — useful for settings / option lists. */
export const CANONICAL_PAYMENT_KEYS = Object.keys(CANONICAL_LABELS);

/** Note shown beside the ขายเชื่อ row in breakdowns — it is money NOT yet collected. */
export function outstandingNote(locale: string = "th"): string {
  return locale === "en" ? "unpaid" : "ยังไม่ได้รับเงิน";
}
