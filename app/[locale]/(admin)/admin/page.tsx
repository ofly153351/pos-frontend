import { redirect } from "next/navigation";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;

  redirect(`/${locale}/admin/plans`);
}
