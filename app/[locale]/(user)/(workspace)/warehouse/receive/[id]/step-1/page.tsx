import { redirect } from "next/navigation";

type RedirectProps = {
  params: Promise<{ id: string; locale: string }>;
};

// The 3-step wizard was consolidated into the single-page editor at /[id].
export default async function ReceiveGoodsStepOneRedirect({ params }: RedirectProps) {
  const { id, locale } = await params;
  redirect(`/${locale}/warehouse/receive/${id}`);
}
