"use client";

import { Suspense } from "react";

import { WarehouseInventoryManager } from "@/components/warehouse/inventory/warehouse-inventory-manager";
import type { WarehouseInventoryDictionary } from "@/components/warehouse/inventory/types";
import type { LocationTransferDict } from "@/components/stock/location-transfer-drawer";
import type { InventoryAdjustDictionary } from "@/components/stock/inventory-types";

type Props = {
  dictionary: WarehouseInventoryDictionary;
  transferDict: LocationTransferDict;
  adjustDict: InventoryAdjustDictionary;
  locale: string;
};

// Suspense boundary required because the manager reads ?wh= via useSearchParams.
export function WarehousesContent({ dictionary, transferDict, adjustDict, locale }: Props) {
  return (
    <Suspense fallback={null}>
      <WarehouseInventoryManager
        dictionary={dictionary}
        transferDict={transferDict}
        adjustDict={adjustDict}
        locale={locale}
      />
    </Suspense>
  );
}
