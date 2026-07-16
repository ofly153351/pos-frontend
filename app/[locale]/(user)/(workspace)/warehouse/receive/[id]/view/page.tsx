import { redirect } from "next/navigation";

type RedirectProps = {
  params: Promise<{ id: string; locale: string }>;
};

// The confirmed/cancelled read-only view is now handled by the single-page editor at /[id].
export default async function ReceiveGoodsViewRedirect({ params }: RedirectProps) {
  const { id, locale } = await params;
  redirect(`/${locale}/warehouse/receive/${id}`);
}
