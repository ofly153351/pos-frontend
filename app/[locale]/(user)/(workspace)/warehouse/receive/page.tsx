import { notFound, redirect } from "next/navigation";

import { isSupportedLocale } from "@/lib/locale-config";

type WarehouseReceiveIndexPageProps = {
  params: Promise<{ locale: string }>;
};

// Phase 3D: the standalone Goods Receiving list moved into the unified
// Purchasing / Receiving workspace. Redirect (server-side, no client flash) to
// its Goods Receipts tab. Receipt editor routes (/new, /[id]) stay live.
export default async function WarehouseReceiveIndexPage({ params }: WarehouseReceiveIndexPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  redirect(`/${locale}/purchases?tab=goods-receipts`);
}
