import "server-only";

import en from "@/locales/en.json";
import th from "@/locales/th.json";
import type { Locale } from "@/lib/locale-config";

type Dictionary = typeof th;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  th,
};

export async function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
