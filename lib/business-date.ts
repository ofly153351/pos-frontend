// Business dates (B02).
//
// A business date is a calendar day in the store timezone (Asia/Bangkok), not an
// instant. The API stores dates submitted as YYYY-MM-DD as UTC midnight, while
// some legacy rows hold a real instant (e.g. a sale at 00:30 Bangkok = 17:30 UTC
// on the previous UTC day). Reading either shape in Asia/Bangkok yields the
// intended day; slicing the ISO string or formatting in the browser timezone
// shifts it backward. Mirrors pos-backend internal/platform/bizdate.

export const BUSINESS_TIME_ZONE = "Asia/Bangkok";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toYmd(date: Date): string {
  const parts = ymdFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today's business date as YYYY-MM-DD (for date inputs and API payloads). */
export function todayBusinessDate(now: Date = new Date()): string {
  return toYmd(now);
}

/** YYYY-MM-DD business date of an API value, or "" when missing/invalid. */
export function toBusinessDate(value?: string | null): string {
  const date = parse(value);
  return date ? toYmd(date) : "";
}

/** Display a business date in the given locale without shifting the day. */
export function formatBusinessDate(
  value?: string | null,
  style: "short" | "medium" | "long" = "short",
  locale = "th-TH",
): string {
  const date = parse(value);
  if (!date) return value ?? "";
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: BUSINESS_TIME_ZONE }).format(date);
}
