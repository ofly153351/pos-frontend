"use client";

import type { WarehouseStockStatus } from "@/types/warehouse-inventory";
import { statusChipClass } from "./utils";
import type { WarehouseInventoryDictionary } from "./types";

export function statusLabel(dict: WarehouseInventoryDictionary, status: WarehouseStockStatus): string {
  if (status === "available") return dict.statusReady;
  if (status === "low_stock") return dict.statusLow;
  return dict.statusOut;
}

export function StatusChip({
  dict,
  status,
}: {
  dict: WarehouseInventoryDictionary;
  status: WarehouseStockStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChipClass(status)}`}
    >
      {statusLabel(dict, status)}
    </span>
  );
}
