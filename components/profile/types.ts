import type th from "@/locales/th.json";
import type { Locale } from "@/lib/locale-config";

export type ProfileManagerProfileDictionary = typeof th.profile;

export type ProfileManagerProfileManagerProps = {
  dictionary: ProfileManagerProfileDictionary;
  locale: Locale;
};
