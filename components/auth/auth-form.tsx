"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";

import { saveAuthSession } from "@/lib/auth-storage";
import { clearCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import type { Locale } from "@/lib/locale-config";
import { login, register } from "@/services/auth";
import type { LoginRequest, RegisterRequest } from "@/types/auth";

export type AuthFormField = {
  autoComplete: string;
  label: string;
  name: string;
  placeholder: string;
  type: "email" | "password" | "text" | "tel";
  half?: boolean; // render two consecutive `half` fields side-by-side
  confirmOf?: string; // validate equals this field; excluded from API payload
};

type AuthFormDictionary = {
  emailInvalid: string;
  genericError: string;
  passwordMin: string;
  redirecting: string;
  required: string;
};

type StrengthLabels = {
  weak: string;
  medium: string;
  good: string;
  strong: string;
};

type TermsConfig = {
  prefix: string;
  termsLink: string;
  and: string;
  privacyLink: string;
  required: string;
};

type AuthFormProps = {
  fields: AuthFormField[];
  locale: Locale;
  mode: "login" | "register";
  submitLabel: string;
  validation: AuthFormDictionary;
  rememberLabel?: string;
  forgotLabel?: string;
  secureNote?: string;
  showStrength?: boolean;
  strengthLabels?: StrengthLabels;
  mismatchMessage?: string;
  terms?: TermsConfig;
};

type FieldErrors = Record<string, string>;

function leadingIcon(name: string, type: string) {
  if (name === "storeName" || name === "store") return Store;
  if (name === "name") return User;
  if (name === "phone" || type === "tel") return Phone;
  if (name === "email" || type === "email") return Mail;
  if (type === "password") return Lock;
  return Mail;
}

function scorePassword(v: string): number {
  if (!v) return 0;
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}

export function AuthForm({
  fields,
  locale,
  mode,
  submitLabel,
  validation,
  rememberLabel,
  forgotLabel,
  secureNote,
  showStrength,
  strengthLabels,
  mismatchMessage,
  terms,
}: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [visiblePw, setVisiblePw] = useState<Record<string, boolean>>({});
  const [remember, setRemember] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.name, ""])),
  );

  const passwordField = fields.find((f) => f.type === "password" && !f.confirmOf);
  const passwordValue = passwordField ? formValues[passwordField.name] ?? "" : "";

  function validate() {
    const nextErrors: FieldErrors = {};

    for (const field of fields) {
      const value = formValues[field.name]?.trim() ?? "";

      if (!value) {
        nextErrors[field.name] = validation.required;
        continue;
      }

      if (field.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        nextErrors[field.name] = validation.emailInvalid;
      }

      // Password strength is enforced only on register; login accepts any.
      if (mode === "register" && field.type === "password" && !field.confirmOf && value.length < 8) {
        nextErrors[field.name] = validation.passwordMin;
      }

      // Confirm-password match.
      if (field.confirmOf && value !== (formValues[field.confirmOf] ?? "")) {
        nextErrors[field.name] = mismatchMessage ?? validation.required;
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageTone("success");

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (terms && !agreed) {
      setMessageTone("error");
      setMessage(terms.required);
      return;
    }

    // Build payload excluding client-only fields (confirm password).
    const payloadValues: Record<string, string> = {};
    for (const field of fields) {
      if (field.confirmOf) continue;
      payloadValues[field.name] = formValues[field.name] ?? "";
    }

    startTransition(async () => {
      try {
        const payload =
          mode === "login"
            ? await login(payloadValues as unknown as LoginRequest)
            : await register(payloadValues as unknown as RegisterRequest);

        saveAuthSession(payload.data);

        if (mode === "login" && payload.data.store_id) {
          saveCurrentStoreId(payload.data.store_id);
        } else {
          clearCurrentStoreId();
        }

        setMessageTone("success");
        setMessage(payload.message);
        if (mode === "login" && payload.data.store_id) {
          router.replace(`/${locale}/dashboard`);
        } else {
          router.replace(`/${locale}/subscription`);
        }
      } catch (error) {
        const nextMessage =
          error instanceof Error ? error.message : validation.genericError;
        setMessageTone("error");
        setMessage(nextMessage);
      }
    });
  }

  function updateField(name: string, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  // Group consecutive half-width fields into 2-col rows.
  const rows = useMemo(() => {
    const out: AuthFormField[][] = [];
    let i = 0;
    while (i < fields.length) {
      const f = fields[i];
      if (f.half && fields[i + 1]?.half) {
        out.push([f, fields[i + 1]]);
        i += 2;
      } else {
        out.push([f]);
        i += 1;
      }
    }
    return out;
  }, [fields]);

  function renderField(field: AuthFormField) {
    const Icon = leadingIcon(field.name, field.type);
    const isPassword = field.type === "password";
    const show = visiblePw[field.name] ?? false;
    const inputType = isPassword && show ? "text" : field.type;
    const hasError = Boolean(errors[field.name]);

    return (
      <div key={field.name}>
        <label
          htmlFor={`auth-${field.name}`}
          className="mb-2 block text-[13px] font-semibold text-slate-700"
        >
          {field.label}
        </label>
        <div className="relative">
          <Icon
            className="pointer-events-none absolute left-[15px] top-1/2 h-[19px] w-[19px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id={`auth-${field.name}`}
            autoComplete={field.autoComplete}
            className={`h-[50px] w-full rounded-xl border-[1.5px] bg-[#fcfcfe] pl-[44px] text-[14.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-violet-100 ${
              isPassword ? "pr-[46px]" : "pr-[15px]"
            } ${
              hasError
                ? "border-rose-300 focus:border-rose-400"
                : "border-violet-200 focus:border-violet-500"
            }`}
            name={field.name}
            onChange={(e) => updateField(field.name, e.target.value)}
            placeholder={field.placeholder}
            type={inputType}
            value={formValues[field.name] ?? ""}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() =>
                setVisiblePw((v) => ({ ...v, [field.name]: !v[field.name] }))
              }
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          ) : null}
        </div>
        {hasError ? (
          <span className="mt-1.5 block text-[13px] text-rose-600">
            {errors[field.name]}
          </span>
        ) : null}
        {showStrength && isPassword && !field.confirmOf && strengthLabels ? (
          <StrengthMeter value={formValues[field.name] ?? ""} labels={strengthLabels} />
        ) : null}
      </div>
    );
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
      {rows.map((row, idx) =>
        row.length === 2 ? (
          <div key={idx} className="grid grid-cols-2 gap-3.5">
            {row.map(renderField)}
          </div>
        ) : (
          renderField(row[0])
        ),
      )}

      {(rememberLabel || forgotLabel) && (
        <div className="flex items-center justify-between pt-0.5">
          {rememberLabel ? (
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600">
              <Checkbox checked={remember} onChange={setRemember} />
              {rememberLabel}
            </label>
          ) : (
            <span />
          )}
          {forgotLabel ? (
            <a href="#" className="text-sm font-semibold text-violet-600 transition hover:text-purple-600 hover:underline">
              {forgotLabel}
            </a>
          ) : null}
        </div>
      )}

      {terms ? (
        <label className="flex cursor-pointer select-none items-start gap-2.5 py-0.5 text-[13.5px] leading-relaxed text-slate-600">
          <Checkbox checked={agreed} onChange={setAgreed} />
          <span>
            {terms.prefix}{" "}
            <a href="#" className="font-semibold text-violet-600 hover:underline">{terms.termsLink}</a>{" "}
            {terms.and}{" "}
            <a href="#" className="font-semibold text-violet-600 hover:underline">{terms.privacyLink}</a>
          </span>
        </label>
      ) : null}

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <button
        className="inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-base font-bold text-white shadow-[0_14px_30px_-8px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? validation.redirecting : submitLabel}
        {!isPending && <ArrowRight className="h-[19px] w-[19px]" />}
      </button>

      {secureNote ? (
        <div className="flex items-center justify-center gap-2.5 pt-1.5 text-center text-[12.5px] leading-relaxed text-slate-400">
          <ShieldCheck className="h-[15px] w-[15px] shrink-0 text-violet-400" />
          {secureNote}
        </div>
      ) : null}
    </form>
  );
}

// ── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition ${
        checked
          ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600"
          : "border-slate-300 bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className={`h-3 w-3 text-white transition ${checked ? "opacity-100" : "opacity-0"}`}
      >
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
  );
}

// ── Password strength meter ──────────────────────────────────────────────────
function StrengthMeter({ value, labels }: { value: string; labels: StrengthLabels }) {
  const score = scorePassword(value);
  const barColors = ["", "bg-rose-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500"];
  const textColors = ["text-slate-400", "text-rose-500", "text-amber-500", "text-violet-600", "text-emerald-600"];
  const labelText = ["", labels.weak, labels.medium, labels.good, labels.strong][score];

  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[5px] flex-1 rounded-full transition-colors ${
              i < score ? barColors[score] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <div className={`mt-1.5 min-h-[14px] text-[11.5px] font-semibold ${textColors[score]}`}>
        {labelText}
      </div>
    </div>
  );
}
