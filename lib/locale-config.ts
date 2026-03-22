export const locales = ["th", "en"] as const;
export const defaultLocale = "en" as const;
export const localeStorageKey = "pos-locale";

export type Locale = (typeof locales)[number];

export function isSupportedLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
