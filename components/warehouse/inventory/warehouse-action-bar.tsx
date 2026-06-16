"use client";

import {
  ArrowLeftRight,
  ClipboardCheck,
  Download,
  Layers,
  ListTree,
  PackagePlus,
  SlidersHorizontal,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from "lucide-react";

import type { WarehouseInventoryDictionary } from "./types";

export type WarehouseActionHandlers = {
  onReceive: () => void;
  onTransfer: () => void;
  onAdjust: () => void;
  onCount: () => void;
  onManageWarehouse: () => void;
  onStorageLocations: () => void;
  onProducts: () => void;
  onExport: () => void;
};

export type WarehouseActionGates = {
  canManage: boolean;
  canReceive: boolean;
};

export type WarehouseAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
};

// Single source of truth for the toolbar — reused by the desktop bar and the mobile
// action sheet so role gating and ordering never drift apart.
export function buildWarehouseActions(
  dict: WarehouseInventoryDictionary,
  handlers: WarehouseActionHandlers,
  gates: WarehouseActionGates,
): WarehouseAction[] {
  const actions: WarehouseAction[] = [];

  if (gates.canReceive) {
    actions.push({ key: "receive", label: dict.actionReceive, icon: PackagePlus, onClick: handlers.onReceive, primary: true });
  }
  if (gates.canManage) {
    actions.push({ key: "transfer", label: dict.actionTransfer, icon: ArrowLeftRight, onClick: handlers.onTransfer });
    actions.push({ key: "adjust", label: dict.actionAdjust, icon: SlidersHorizontal, onClick: handlers.onAdjust });
  }
  if (gates.canReceive) {
    actions.push({ key: "count", label: dict.actionCount, icon: ClipboardCheck, onClick: handlers.onCount });
  }
  if (gates.canManage) {
    actions.push({ key: "manage", label: dict.actionManageWarehouse, icon: WarehouseIcon, onClick: handlers.onManageWarehouse });
    actions.push({ key: "storage", label: dict.actionStorageLocations, icon: Layers, onClick: handlers.onStorageLocations });
  }
  actions.push({ key: "products", label: dict.actionProducts, icon: ListTree, onClick: handlers.onProducts });
  actions.push({ key: "export", label: dict.actionExport, icon: Download, onClick: handlers.onExport });

  return actions;
}

type Props = {
  actions: WarehouseAction[];
};

export function WarehouseActionBar({ actions }: Props) {
  return (
    <div className="hidden flex-wrap items-center gap-2 md:flex">
      {actions.map(({ key, label, icon: Icon, onClick, primary }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={
            primary
              ? "inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
              : "inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
