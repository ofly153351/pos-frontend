"use client";

import { useEffect } from "react";
import Link from "next/link";

import {
  AuthForm,
  type AuthFormField,
} from "@/components/auth/auth-form";
import {
  localeStorageKey,
  type Locale,
} from "@/lib/locale-config";

type AuthShellProps = {
  alternateCta: string;
  alternateHref: string;
  alternateLabel: string;
  brand: string;
  description: string;
  fields: AuthFormField[];
  footerNote: string;
  languageLabel: string;
  locale: Locale;
  mode: "login" | "register";
  pageTitle: string;
  panelDescription: string;
  panelEyebrow: string;
  panelTitle: string;
  submitLabel: string;
  switchLocaleHref: "login" | "register";
  thaiLabel: string;
  englishLabel: string;
  validation: {
    emailInvalid: string;
    genericError: string;
    passwordMin: string;
    redirecting: string;
    required: string;
  };
};

export function AuthShell({
  alternateCta,
  alternateHref,
  alternateLabel,
  brand,
  description,
  fields,
  footerNote,
  languageLabel,
  locale,
  mode,
  pageTitle,
  panelDescription,
  panelEyebrow,
  panelTitle,
  submitLabel,
  switchLocaleHref,
  thaiLabel,
  englishLabel,
  validation,
}: AuthShellProps) {
  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const languageOptions: { hrefLocale: Locale; label: string }[] = [
    { hrefLocale: "th", label: thaiLabel },
    { hrefLocale: "en", label: englishLabel },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(196,181,253,0.6),_transparent_30%),linear-gradient(135deg,_#1e1b4b_0%,_#2e1065_45%,_#3b0764_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-violet-800/40 bg-white/90 shadow-[0_30px_80px_rgba(124,58,237,0.25)] backdrop-blur xl:grid xl:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between gap-10 bg-[linear-gradient(160deg,_#1e1b4b_0%,_#2e1065_50%,_#4c1d95_100%)] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
                {brand}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80">
                {languageLabel}
              </span>
              <div className="flex rounded-full border border-violet-600/50 bg-violet-900/50 p-1 text-sm shadow-sm">
              {languageOptions.map((option) => {
                const isActive = option.hrefLocale === locale;

                return (
                  <Link
                    key={option.hrefLocale}
                    href={`/${option.hrefLocale}/${switchLocaleHref}`}
                    onClick={() => {
                      window.localStorage.setItem(
                        localeStorageKey,
                        option.hrefLocale,
                      );
                    }}
                    className={`rounded-full px-3 py-1.5 transition ${
                      isActive
                        ? "bg-violet-500 text-white shadow-sm"
                        : "text-violet-300 hover:bg-violet-800/60"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-violet-300">
              {panelEyebrow}
            </p>
            <p className="text-lg leading-8 text-violet-100">{description}</p>
            <div className="rounded-[1.75rem] border border-violet-500/30 bg-violet-900/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-2xl font-semibold text-white">{panelTitle}</p>
              <p className="mt-3 max-w-lg text-base leading-7 text-violet-200">
                {panelDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-violet-300/80">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            {footerNote}
          </div>
        </section>

        <section className="flex items-center bg-gradient-to-br from-violet-50/60 to-white px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[1.75rem] border border-violet-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.12)] sm:p-8">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">
                  {panelEyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  {submitLabel}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {alternateLabel}{" "}
                  <Link
                    href={alternateHref}
                    className="font-semibold text-violet-700 transition hover:text-violet-900"
                  >
                    {alternateCta}
                  </Link>
                </p>
              </div>

              <AuthForm
                fields={fields}
                locale={locale}
                mode={mode}
                submitLabel={submitLabel}
                validation={validation}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
