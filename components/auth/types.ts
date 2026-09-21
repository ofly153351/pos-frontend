import type { Locale } from "@/lib/locale-config";
import type { login } from "@/services/auth";
import type { register } from "@/services/auth";
import type { AuthFormField } from "@/components/auth/auth-form";

export type AuthFormAuthFormField = {
  autoComplete: string;
  label: string;
  name: string;
  placeholder: string;
  type: "email" | "password" | "text" | "tel";
  half?: boolean; // render two consecutive `half` fields side-by-side
  confirmOf?: string; // validate equals this field; excluded from API payload
};

export type AuthFormAuthFormDictionary = {
  emailInvalid: string;
  genericError: string;
  passwordMin: string;
  redirecting: string;
  required: string;
};

export type AuthFormStrengthLabels = {
  weak: string;
  medium: string;
  good: string;
  strong: string;
};

export type AuthFormTermsConfig = {
  prefix: string;
  termsLink: string;
  and: string;
  privacyLink: string;
  required: string;
};

export type AuthFormAuthFormProps = {
  fields: AuthFormAuthFormField[];
  locale: Locale;
  mode: "login" | "register";
  submitLabel: string;
  validation: AuthFormAuthFormDictionary;
  rememberLabel?: string;
  forgotLabel?: string;
  secureNote?: string;
  showStrength?: boolean;
  strengthLabels?: AuthFormStrengthLabels;
  mismatchMessage?: string;
  terms?: AuthFormTermsConfig;
};

export type AuthFormFieldErrors = Record<string, string>;

export type AuthShellAuthBrand = {
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

export type AuthShellAuthShellProps = {
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
  authBrand: AuthShellAuthBrand;
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

export type AuthStatusCardAuthStatusCardProps = {
  locale: Locale;
  labels: {
    backToLogin: string;
    email: string;
    empty: string;
    logout: string;
    title: string;
    user: string;
  };
};
