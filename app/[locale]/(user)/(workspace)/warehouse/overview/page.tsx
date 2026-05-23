import { notFound } from "next/navigation";

import { WarehouseDashboard } from "@/components/warehouse/warehouse-dashboard";
import { isSupportedLocale } from "@/lib/locale-config";

type WarehouseOverviewPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WarehouseOverviewPage({ params }: WarehouseOverviewPageProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return <WarehouseDashboard />;
}
