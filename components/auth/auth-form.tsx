"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveAuthSession } from "@/lib/auth-storage";
import { clearCurrentStoreId } from "@/lib/store-storage";
import type { Locale } from "@/lib/locale-config";
import { login, register } from "@/services/auth";
import type { LoginRequest, RegisterRequest } from "@/types/auth";

export type AuthFormField = {
  autoComplete: string;
  label: string;
  name: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

type AuthFormDictionary = {
  emailInvalid: string;
  genericError: string;
  passwordMin: string;
  redirecting: string;
  required: string;
};

type AuthFormProps = {
  fields: AuthFormField[];
  locale: Locale;
  mode: "login" | "register";
  submitLabel: string;
  validation: AuthFormDictionary;
};

type FieldErrors = Record<string, string>;

export function AuthForm({
  fields,
  locale,
  mode,
  submitLabel,
  validation,
}: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.name, ""])),
  );

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

      if (field.name === "password" && value.length < 8) {
        nextErrors[field.name] = validation.passwordMin;
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

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      try {
        const payload =
          mode === "login"
            ? await login(formValues as LoginRequest)
            : await register(formValues as RegisterRequest);

        saveAuthSession(payload.data);
        clearCurrentStoreId();
        setMessageTone("success");
        setMessage(payload.message);
        router.replace(`/${locale}/subscription`);
      } catch (error) {
        const nextMessage =
          error instanceof Error ? error.message : validation.genericError;
        setMessageTone("error");
        setMessage(nextMessage);
      }
    });
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            {field.label}
          </span>
          <input
            autoComplete={field.autoComplete}
            className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:bg-white ${
              errors[field.name]
                ? "border-rose-300 bg-rose-50/70 focus:border-rose-400"
                : "border-sky-100 bg-sky-50/55 focus:border-sky-500"
            }`}
            name={field.name}
            onChange={(event) => {
              const { name, value } = event.target;

              setFormValues((current) => ({
                ...current,
                [name]: value,
              }));

              setErrors((current) => ({
                ...current,
                [name]: "",
              }));
            }}
            placeholder={field.placeholder}
            type={field.type}
            value={formValues[field.name] ?? ""}
          />
          {errors[field.name] ? (
            <span className="mt-2 block text-sm text-rose-600">
              {errors[field.name]}
            </span>
          ) : null}
        </label>
      ))}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <button
        className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        disabled={isPending}
        type="submit"
      >
        {isPending ? validation.redirecting : submitLabel}
      </button>
    </form>
  );
}
