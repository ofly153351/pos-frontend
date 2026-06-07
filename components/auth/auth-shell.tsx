"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Boxes, Check, ChevronDown, Globe } from "lucide-react";

import {
  AuthForm,
  type AuthFormField,
} from "@/components/auth/auth-form";
import {
  localeStorageKey,
  type Locale,
} from "@/lib/locale-config";

// ── Language dropdown (smooth open/close) ─────────────────────────────────────
function LanguageDropdown({
  locale,
  switchLocaleHref,
  languageLabel,
  thaiLabel,
  englishLabel,
}: {
  locale: Locale;
  switchLocaleHref: "login" | "register";
  languageLabel: string;
  thaiLabel: string;
  englishLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options: { code: Locale; label: string }[] = [
    { code: "th", label: thaiLabel },
    { code: "en", label: englishLabel },
  ];
  const current = options.find((o) => o.code === locale) ?? options[0];

  return (
    <div ref={ref} className="absolute right-6 top-6 z-10 sm:right-8 sm:top-7">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={languageLabel}
        className="flex items-center gap-1.5 rounded-full border border-violet-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-500 transition hover:border-violet-300 hover:text-violet-600"
      >
        <Globe className="h-4 w-4" />
        {current.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="smooth-fade-up absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-violet-100 bg-white p-1.5 shadow-[0_20px_45px_-15px_rgba(49,32,110,0.25)]"
        >
          {options.map((opt) => {
            const active = opt.code === locale;
            return (
              <Link
                key={opt.code}
                href={`/${opt.code}/${switchLocaleHref}`}
                onClick={() => {
                  window.localStorage.setItem(localeStorageKey, opt.code);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${
                  active
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-violet-50/60 hover:text-violet-700"
                }`}
              >
                {opt.label}
                {active ? <Check className="h-4 w-4 text-violet-600" /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type AuthBrand = {
  badge: string;
  features: string[];
  statProductsValue: string;
  statProductsLabel: string;
  statDocumentsValue: string;
  statDocumentsLabel: string;
  statReadyValue: string;
  statReadyLabel: string;
  version: string;
  secureNote: string;
  rememberMe: string;
  forgotPassword: string;
};

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
  authBrand: AuthBrand;
  showStrength?: boolean;
  strengthLabels?: { weak: string; medium: string; good: string; strong: string };
  mismatchMessage?: string;
  terms?: { prefix: string; termsLink: string; and: string; privacyLink: string; required: string };
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
  authBrand,
  showStrength,
  strengthLabels,
  mismatchMessage,
  terms,
  validation,
}: AuthShellProps) {
  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const stats = [
    { value: authBrand.statProductsValue, label: authBrand.statProductsLabel },
    { value: authBrand.statDocumentsValue, label: authBrand.statDocumentsLabel },
    { value: authBrand.statReadyValue, label: authBrand.statReadyLabel },
  ];
  const featureIcons = ["📦", "🧾", "🏪", "📊"];

  return (
    <div className="flex min-h-screen flex-col font-sans lg:flex-row">
      {/* ════════ LEFT — BRAND ════════ */}
      <aside className="relative flex-none overflow-hidden bg-[radial-gradient(1200px_600px_at_12%_8%,rgba(147,51,234,0.55),transparent_55%),radial-gradient(900px_700px_at_88%_92%,rgba(79,70,229,0.55),transparent_55%),linear-gradient(135deg,#241b54_0%,#3a2a8c_30%,#5b3fd1_58%,#7c3aed_80%,#9333ea_100%)] lg:basis-[58%]">
        {/* decorative grid + rings */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            maskImage: "radial-gradient(circle at 50% 40%, #000 35%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 35%, transparent 78%)",
          }}
        />
        <div className="pointer-events-none absolute -right-[120px] -top-[160px] h-[520px] w-[520px] rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -top-[60px] right-10 h-[300px] w-[300px] rounded-full border border-white/10" />

        <div className="relative z-[2] flex h-full max-w-[760px] flex-col px-8 py-10 text-white sm:px-12 lg:px-16 lg:py-14">
          {/* logo head */}
          <header className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#e9e4ff] shadow-[0_12px_30px_rgba(20,8,60,0.35),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Boxes className="h-7 w-7 text-violet-600" />
            </div>
            <div className="text-xl font-extrabold leading-tight">
              {brand}
              <span className="block text-[12.5px] font-medium tracking-wide text-white/70">
                {panelEyebrow}
              </span>
            </div>
          </header>

          {/* hero */}
          <div className="mb-9 mt-11">
            <span className="mb-[22px] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold tracking-wide text-white/90 backdrop-blur">
              <span className="h-[7px] w-[7px] rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(167,243,208,0.25)]" />
              {authBrand.badge}
            </span>
            <h1 className="mb-2.5 text-[52px] font-extrabold leading-[1.05] tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-[17px] font-semibold tracking-wide text-violet-100">
              {panelTitle}
            </p>
            <p className="mt-[18px] max-w-[540px] text-[15.5px] leading-[1.7] text-white/80">
              {description}
            </p>
          </div>

          {/* feature cards */}
          <div className="mb-[34px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {authBrand.features.map((text, i) => (
              <div
                key={text}
                className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/[0.08] px-[18px] py-4 shadow-[0_10px_30px_rgba(15,6,45,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition hover:-translate-y-[3px] hover:bg-white/[0.13]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-xl">
                  {featureIcons[i]}
                </div>
                <div className="text-[14.5px] font-semibold leading-snug text-white">
                  {text}
                </div>
              </div>
            ))}
          </div>

          {/* stats */}
          <div className="flex items-center gap-2 border-y border-white/15 px-1 py-[22px]">
            {stats.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center">
                <div className="flex-1 text-center">
                  <div className="bg-gradient-to-b from-white to-[#dcd2ff] bg-clip-text text-[30px] font-extrabold leading-none tracking-tight text-transparent">
                    {s.value}
                  </div>
                  <div className="mt-[7px] text-[13px] font-medium tracking-wide text-white/70">
                    {s.label}
                  </div>
                </div>
                {i < stats.length - 1 && <div className="h-[42px] w-px bg-white/15" />}
              </div>
            ))}
          </div>

          {/* footer */}
          <footer className="mt-auto flex items-center gap-3 pt-[30px] text-[13px] text-white/60">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-[3px] font-semibold text-white/85">
              {authBrand.version}
            </span>
            <span>{footerNote}</span>
          </footer>
        </div>
      </aside>

      {/* ════════ RIGHT — FORM ════════ */}
      <main className="relative flex flex-1 items-center justify-center bg-[#fbfbfd] px-6 py-12 sm:px-10 lg:px-12">
        {/* language switch */}
        <LanguageDropdown
          locale={locale}
          switchLocaleHref={switchLocaleHref}
          languageLabel={languageLabel}
          thaiLabel={thaiLabel}
          englishLabel={englishLabel}
        />

        <div className="w-full max-w-[440px] rounded-[24px] border border-[#eef0f6] bg-white p-9 shadow-[0_30px_60px_-20px_rgba(49,32,110,0.18),0_12px_24px_-12px_rgba(49,32,110,0.10)] sm:p-11">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-600/[0.08] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-violet-600">
            {panelEyebrow}
          </span>
          <h2 className="mb-2 text-[32px] font-extrabold tracking-tight text-slate-900">
            {submitLabel}
          </h2>
          <p className="text-[15px] text-slate-500">
            {panelDescription}
          </p>

          <AuthForm
            fields={fields}
            locale={locale}
            mode={mode}
            submitLabel={submitLabel}
            validation={validation}
            rememberLabel={mode === "login" ? authBrand.rememberMe : undefined}
            forgotLabel={mode === "login" ? authBrand.forgotPassword : undefined}
            secureNote={authBrand.secureNote}
            showStrength={showStrength}
            strengthLabels={strengthLabels}
            mismatchMessage={mismatchMessage}
            terms={terms}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            {alternateLabel}{" "}
            <Link
              href={alternateHref}
              className="font-semibold text-violet-600 transition hover:text-purple-600 hover:underline"
            >
              {alternateCta}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
