"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  defaultLocale,
  isSupportedLocale,
  localeStorageKey,
} from "@/lib/locale-config";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(localeStorageKey);
    const locale = savedLocale && isSupportedLocale(savedLocale)
      ? savedLocale
      : defaultLocale;

    window.localStorage.setItem(localeStorageKey, locale);
    router.replace(`/${locale}/login`);
  }, [router]);

  return null;
}
