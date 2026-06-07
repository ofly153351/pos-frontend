import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <AuthShell
      alternateCta={dictionary.common.signIn}
      alternateHref={`/${locale}/login`}
      alternateLabel={dictionary.common.switchToLogin}
      brand={dictionary.common.brand}
      description={dictionary.register.description}
      fields={[
        {
          autoComplete: "organization",
          label: dictionary.register.storeLabel,
          name: "storeName",
          placeholder: dictionary.register.storePlaceholder,
          type: "text",
        },
        {
          autoComplete: "name",
          label: dictionary.register.nameLabel,
          name: "name",
          placeholder: dictionary.register.namePlaceholder,
          type: "text",
        },
        {
          autoComplete: "email",
          label: dictionary.register.emailLabel,
          name: "email",
          placeholder: dictionary.register.emailPlaceholder,
          type: "email",
        },
        {
          autoComplete: "new-password",
          label: dictionary.register.passwordLabel,
          name: "password",
          placeholder: dictionary.register.passwordPlaceholder,
          type: "password",
          half: true,
        },
        {
          autoComplete: "new-password",
          label: dictionary.register.confirmPasswordLabel,
          name: "confirmPassword",
          placeholder: dictionary.register.confirmPasswordPlaceholder,
          type: "password",
          half: true,
          confirmOf: "password",
        },
      ]}
      footerNote={dictionary.common.footerNote}
      languageLabel={dictionary.common.language}
      locale={locale}
      mode="register"
      pageTitle={dictionary.register.title}
      panelDescription={dictionary.register.secondaryDescription}
      panelEyebrow={dictionary.register.eyebrow}
      panelTitle={dictionary.register.secondaryTitle}
      submitLabel={dictionary.register.submit}
      switchLocaleHref="register"
      thaiLabel={dictionary.common.thai}
      englishLabel={dictionary.common.english}
      authBrand={dictionary.common.authBrand}
      showStrength
      strengthLabels={{
        weak: dictionary.register.strengthWeak,
        medium: dictionary.register.strengthMedium,
        good: dictionary.register.strengthGood,
        strong: dictionary.register.strengthStrong,
      }}
      mismatchMessage={dictionary.register.passwordMismatch}
      terms={{
        prefix: dictionary.register.termsPrefix,
        termsLink: dictionary.register.termsLink,
        and: dictionary.register.termsAnd,
        privacyLink: dictionary.register.privacyLink,
        required: dictionary.register.termsRequired,
      }}
      validation={dictionary.validation}
    />
  );
}
