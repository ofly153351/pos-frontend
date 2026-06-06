import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";
import { notFound } from "next/navigation";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <AuthShell
      alternateCta={dictionary.common.createAccount}
      alternateHref={`/${locale}/register`}
      alternateLabel={dictionary.common.switchToRegister}
      brand={dictionary.common.brand}
      description={dictionary.login.description}
      fields={[
        {
          autoComplete: "email",
          label: dictionary.login.emailLabel,
          name: "email",
          placeholder: dictionary.login.emailPlaceholder,
          type: "email",
        },
        {
          autoComplete: "current-password",
          label: dictionary.login.passwordLabel,
          name: "password",
          placeholder: dictionary.login.passwordPlaceholder,
          type: "password",
        },
      ]}
      footerNote={dictionary.common.footerNote}
      languageLabel={dictionary.common.language}
      locale={locale}
      mode="login"
      pageTitle={dictionary.login.title}
      panelDescription={dictionary.login.secondaryDescription}
      panelEyebrow={dictionary.login.eyebrow}
      panelTitle={dictionary.login.secondaryTitle}
      submitLabel={dictionary.login.submit}
      switchLocaleHref="login"
      thaiLabel={dictionary.common.thai}
      englishLabel={dictionary.common.english}
      authBrand={dictionary.common.authBrand}
      validation={dictionary.validation}
    />
  );
}
