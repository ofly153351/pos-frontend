import { notFound } from "next/navigation";

import { SubscriptionPlanManager } from "@/components/admin/subscription-plan-manager";
import { AdminWorkspaceShell } from "@/components/layouts/admin-workspace-shell";
import { getDictionary } from "@/lib/i18n";
import { isSupportedLocale, type Locale } from "@/lib/locale-config";

type AdminPlansPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPlansPage({ params }: AdminPlansPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <AdminWorkspaceShell
      active="plans"
      locale={locale}
      navigation={dictionary.admin.navigation}
      subtitle={dictionary.admin.description}
      title={dictionary.admin.title}
    >
      <SubscriptionPlanManager dictionary={dictionary.admin.planManager} />
    </AdminWorkspaceShell>
  );
}
