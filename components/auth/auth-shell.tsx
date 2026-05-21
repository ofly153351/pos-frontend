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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.26),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(191,219,254,0.85),_transparent_28%),linear-gradient(135deg,_#eff6ff_0%,_#f8fbff_45%,_#ffffff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 shadow-[0_30px_80px_rgba(124,58,237,0.12)] backdrop-blur xl:grid xl:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between gap-10 bg-[linear-gradient(160deg,_#eff6ff_0%,_#dbeafe_42%,_#bfdbfe_100%)] px-6 py-8 text-slate-900 sm:px-8 sm:py-10 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-700">
                {brand}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-sky-700/70">
                {languageLabel}
              </span>
              <div className="flex rounded-full border border-sky-200 bg-white/70 p-1 text-sm shadow-sm">
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
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-sky-700 hover:bg-sky-50"
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
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-700">
              {panelEyebrow}
            </p>
            <p className="text-lg leading-8 text-slate-700">{description}</p>
            <div className="rounded-[1.75rem] border border-white/70 bg-white/65 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <p className="text-2xl font-semibold">{panelTitle}</p>
              <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">
                {panelDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-sky-800/70">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            {footerNote}
          </div>
        </section>

        <section className="flex items-center px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[1.75rem] border border-sky-100 bg-white p-6 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:p-8">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">
                  {panelEyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  {submitLabel}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {alternateLabel}{" "}
                  <Link
                    href={alternateHref}
                    className="font-semibold text-sky-700 transition hover:text-sky-900"
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
