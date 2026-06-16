"use client";

import { ArrowLeftRight, MapPin } from "lucide-react";

import type { WarehouseInventoryProduct } from "@/types/warehouse-inventory";
import { formatNumber } from "./utils";
import { StatusChip } from "./status-chip";
import type { WarehouseInventoryDictionary } from "./types";

type Props = {
  dict: WarehouseInventoryDictionary;
  items: WarehouseInventoryProduct[];
  onViewLocations: (item: WarehouseInventoryProduct) => void;
  onTransfer: (item: WarehouseInventoryProduct) => void;
  canTransfer: boolean;
};

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "—";
}

export function WarehouseProductCards({ dict, items, onViewLocations, onTransfer, canTransfer }: Props) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.product_id} className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-500">
              {initials(item.product_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{item.product_name}</p>
              <p className="truncate font-mono text-xs text-slate-400">{item.sku || dict.noBarcode}</p>
            </div>
            <StatusChip dict={dict} status={item.status} />
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <div>
              <dt className="text-[11px] text-slate-400">{dict.colReady}</dt>
              <dd className="text-sm font-bold tabular-nums text-emerald-600">{formatNumber(item.ready_stock)}</dd>
            </div>
            <div className="border-x border-slate-200">
              <dt className="text-[11px] text-slate-400">{dict.colStorage}</dt>
              <dd className="text-sm font-bold tabular-nums text-slate-600">{formatNumber(item.storage_stock)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">{dict.colTotal}</dt>
              <dd className="text-sm font-bold tabular-nums text-slate-900">{formatNumber(item.total_stock)}</dd>
            </div>
          </dl>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onViewLocations(item)}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-50 text-sm font-semibold text-violet-700 transition active:bg-violet-100"
            >
              <MapPin className="h-4 w-4" />
              {dict.viewLocations}
            </button>
            {canTransfer ? (
              <button
                type="button"
                onClick={() => onTransfer(item)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition active:bg-slate-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {dict.actionTransfer}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
