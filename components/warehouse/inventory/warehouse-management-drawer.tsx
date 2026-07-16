"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, MapPin, MoreVertical, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { toast } from "@/components/ui/toast";
import {
  deleteWarehouse,
  getWarehouseDeletionAssessment,
  listWarehouses,
  updateWarehouse,
} from "@/services/warehouses";
import { useDeletionFlow } from "@/hooks/use-deletion-flow";
import type { Warehouse } from "@/types/warehouse";
import { DeletionDialog } from "@/components/warehouse/deletion-dialog";
import { DrawerShell } from "./drawer-shell";
import { formatNumber } from "./utils";
import type { WarehouseInventoryDictionary } from "./types";

type StatusFilter = "active" | "inactive" | "archived";

type Props = {
  open: boolean;
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  statsByWarehouse: Map<string, { zones: number; locations: number }>;
  dict: WarehouseInventoryDictionary;
  locale: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (w: Warehouse) => void;
  onViewStorage: (w: Warehouse) => void;
  onChanged: () => void;
};

export function WarehouseManagementDrawer({
  open,
  warehouses,
  selectedWarehouseId,
  statsByWarehouse,
  dict,
  locale,
  onClose,
  onSelect,
  onCreate,
  onEdit,
  onViewStorage,
  onChanged,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("active");

  // Archived rows are excluded from the live list (backend default), so fetch them on demand
  // only when the Archived tab is active. Returns live + archived; keep just the archived.
  const archivedQuery = useQuery({
    queryKey: ["wh-inv", "warehouses", "archived"],
    queryFn: async () => (await listWarehouses({ includeArchived: true })).data ?? [],
    enabled: open && filter === "archived",
  });
  const archivedList = useMemo(
    () => (archivedQuery.data ?? []).filter((w) => Boolean(w.deleted_at)),
    [archivedQuery.data],
  );

  const activeList = useMemo(() => warehouses.filter((w) => w.is_active), [warehouses]);
  const inactiveList = useMemo(() => warehouses.filter((w) => !w.is_active), [warehouses]);
  const displayed =
    filter === "archived" ? archivedList : filter === "inactive" ? inactiveList : activeList;

  const flow = useDeletionFlow({
    assess: (id) => getWarehouseDeletionAssessment(id).then((r) => r.data),
    remove: (id, expected) => deleteWarehouse(id, expected).then((r) => r.data),
    onSuccess: (outcome) => {
      toast.success(
        outcome.action === "archived" ? dict.lifecycle.archivedToast : dict.lifecycle.deletedToast,
      );
      // The row moved between the live and archived pools — refresh both (§13 cache invalidation).
      queryClient.invalidateQueries({ queryKey: ["wh-inv", "warehouses", "archived"] });
      onChanged();
    },
  });

  async function toggleActive(w: Warehouse) {
    setMenuId(null);
    setBusyId(w.id);
    try {
      await updateWarehouse(w.id, { is_active: !w.is_active });
      toast.success(dict.updatedToast);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : dict.saveError);
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "active", label: dict.statusActive, count: activeList.length },
    { key: "inactive", label: dict.statusInactive, count: inactiveList.length },
    {
      key: "archived",
      label: dict.statusArchived,
      count: filter === "archived" ? archivedList.length : undefined,
    },
  ];

  return (
    <DrawerShell
      open={open}
      title={dict.manageTitle}
      subtitle={dict.manageSubtitle}
      onClose={onClose}
      closeLabel={dict.close}
      footer={
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          {dict.createWarehouse}
        </button>
      }
    >
      {/* Status filter — archived rows are absent by default (§10) */}
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === t.key ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="ml-1 tabular-nums opacity-70">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {filter === "archived" && archivedQuery.isLoading ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          {dict.lifecycle.assessing}
        </p>
      ) : displayed.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          {dict.mgEmpty}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {displayed.map((w) => {
            const stats = statsByWarehouse.get(w.id) ?? { zones: 0, locations: 0 };
            const isSelected = w.id === selectedWarehouseId;
            const isArchived = Boolean(w.deleted_at);
            return (
              <li key={w.id} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-slate-900">{w.name}</span>
                      {w.code ? (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{w.code}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {isSelected && !isArchived ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{dict.mgInUse}</span>
                      ) : null}
                      {isArchived ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {dict.lifecycle.badgeArchived}
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            w.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {w.is_active ? dict.statusActive : dict.statusInactive}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Archived rows are read-only history (§12) — no destructive/edit menu */}
                  {isArchived ? null : (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setMenuId((id) => (id === w.id ? null : w.id))}
                      aria-label={dict.mgEdit}
                      aria-haspopup="menu"
                      aria-expanded={menuId === w.id}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === w.id ? (
                      <>
                        <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuId(null)} />
                        <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          <MenuItem
                            icon={<Layers className="h-4 w-4" />}
                            label={dict.mgViewStorage}
                            onClick={() => {
                              setMenuId(null);
                              onViewStorage(w);
                            }}
                          />
                          <MenuItem
                            icon={<Power className="h-4 w-4" />}
                            label={w.is_active ? dict.mgDeactivate : dict.mgActivate}
                            disabled={busyId === w.id}
                            onClick={() => toggleActive(w)}
                          />
                          <MenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            label={dict.mgDelete}
                            danger
                            onClick={() => {
                              setMenuId(null);
                              flow.begin({ id: w.id, name: w.name, code: w.code });
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                  )}
                </div>

                {isArchived ? null : (
                  <>
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <div>
                        <dt className="text-[11px] text-slate-400">{dict.mgZones}</dt>
                        <dd className="text-sm font-bold tabular-nums text-slate-700">{formatNumber(stats.zones)}</dd>
                      </div>
                      <div className="border-l border-slate-200">
                        <dt className="text-[11px] text-slate-400">{dict.mgLocations}</dt>
                        <dd className="text-sm font-bold tabular-nums text-slate-700">{formatNumber(stats.locations)}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={!w.is_active || isSelected}
                        onClick={() => {
                          onSelect(w.id);
                          onClose();
                        }}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-50 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {dict.mgSelect}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(w)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {dict.mgEdit}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DeletionDialog
        open={flow.open}
        entity="warehouse"
        target={flow.target}
        assessment={flow.assessment}
        phase={flow.phase}
        error={flow.error}
        stateChanged={flow.stateChanged}
        dict={dict.lifecycle}
        onConfirm={flow.confirm}
        onCancel={flow.cancel}
        onRetry={flow.retry}
        onNavigate={(navTarget) => {
          flow.cancel();
          if (navTarget === "transfer") {
            // The location-aware transfer UI lives on this very page — close the drawer to reveal it.
            onClose();
          } else {
            onClose();
            router.push(`/${locale}/stock`);
          }
        }}
      />
    </DrawerShell>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition disabled:opacity-40 ${
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
