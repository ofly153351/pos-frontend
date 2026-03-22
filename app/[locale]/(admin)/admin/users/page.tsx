import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { isSupportedLocale } from "@/lib/locale-config";

type AdminUsersPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminUsersPage({
  params,
}: AdminUsersPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  redirect(`/${locale}/admin/plans`);
}
