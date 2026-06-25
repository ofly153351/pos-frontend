"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { PurchaseOrder } from "@/services/purchases";
import type { GoodsReceiptDraft } from "@/types/goods-receipt";
import { QueryErrorState } from "@/components/ui/query-error-state";

import { formatDate, formatTHB, type WorkspaceNav, type WsDict } from "./workspace-shared";
import { EmptyState, LoadingRows, RecordTypeBadge, SupplierText } from "./workspace-ui";

type RecordKind = "po" | "receipt";

type CompletedRow = {
  kind: RecordKind;
  id: string;
  number: string;
  supplier?: string;
  warehouse?: string;
  date?: string;
  ts: number;
  value: number;
};

type TypeFilter = "all" | RecordKind;

type Props = {
  dict: WsDict;
  locale: string;
  pos: PurchaseOrder[];
  confirmed: GoodsReceiptDraft[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  nav: WorkspaceNav;
};

function tsOf(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function CompletedTab({ dict, locale, pos, confirmed, loading, error, onRetry, nav }: Props) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  const rows = useMemo<CompletedRow[]>(() => {
    const out: CompletedRow[] = [];
    for (const po of pos) {
      if (po.status !== "completed") continue;
      const date = po.received_at ?? po.updated_at;
      out.push({
        kind: "po",
        id: po.id,
        number: po.order_number,
        supplier: po.supplier?.name,
        date,
        ts: tsOf(date),
        value: po.total_cost,
      });
    }
    for (const r of confirmed) {
      const date = r.confirmed_at ?? r.received_at;
      out.push({
        kind: "receipt",
        id: r.id,
        number: r.document_no,
        supplier: r.supplier_name,
        warehouse: r.warehouse_name,
        date,
        ts: tsOf(date),
        value: r.total_amount,
      });
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [pos, confirmed]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (type !== "all" && row.kind !== type) return false;
      if (!q) return true;
      return row.number.toLowerCase().includes(q) || (row.supplier ?? "").toLowerCase().includes(q);
    });
  }, [rows, type, search]);

  if (error) return <QueryErrorState locale={locale} onRetry={onRetry} className="m-4" />;

  const isFiltered = type !== "all" || search.trim() !== "";

  const typeTabs: { key: TypeFilter; label: string }[] = [
    { key: "all", label: dict.filterAllTypes },
    { key: "po", label: dict.recordPo },
    { key: "receipt", label: dict.recordReceipt },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {typeTabs.map((t) => {
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-violet-50"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.searchReceipt}
            className="h-9 w-full rounded-lg border border-violet-200 bg-white pl-9 pr-8 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={dict.resetFilters}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        {loading ? (
          <LoadingRows label={dict.loading} />
        ) : visible.length === 0 ? (
          <EmptyState title={isFiltered ? dict.emptyFiltered : dict.emptyCompleted} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/40 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">{dict.thRecordType}</th>
                    <th className="px-4 py-3">{dict.thReceiptNumber}</th>
                    <th className="px-4 py-3">{dict.thSupplier}</th>
                    <th className="px-4 py-3">{dict.thWarehouse}</th>
                    <th className="px-4 py-3">{dict.thCompletedDate}</th>
                    <th className="px-4 py-3 text-right">{dict.thValue}</th>
                    <th className="px-5 py-3 text-right">{dict.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {visible.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="transition-colors hover:bg-violet-50/40">
                      <td className="px-5 py-3.5">
                        <RecordTypeBadge
                          tone={row.kind}
                          label={row.kind === "po" ? dict.recordPo : dict.recordReceipt}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="nums text-xs font-semibold text-violet-700 whitespace-nowrap">{row.number}</span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3.5">
                        <SupplierText name={row.supplier} fallback={dict.none} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{row.warehouse ?? dict.none}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(locale, row.date)}</td>
                      <td className="px-4 py-3.5 text-right nums text-sm font-bold text-slate-900">
                        {formatTHB(row.value)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {row.kind === "receipt" ? (
                          <button
                            type="button"
                            onClick={() => nav.openReceipt(row.id)}
                            className="inline-flex items-center rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-400 hover:shadow"
                          >
                            {dict.actView}
                          </button>
                        ) : (
                          <span className="text-slate-300">{dict.none}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-50 md:hidden">
              {visible.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1">
                        <RecordTypeBadge
                          tone={row.kind}
                          label={row.kind === "po" ? dict.recordPo : dict.recordReceipt}
                        />
                      </div>
                      <p className="nums text-xs font-semibold text-violet-700">{row.number}</p>
                      <p className="truncate text-sm font-medium text-slate-800">{row.supplier ?? dict.none}</p>
                    </div>
                    <span className="nums text-sm font-bold text-slate-900">{formatTHB(row.value)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{formatDate(locale, row.date)}</span>
                    {row.kind === "receipt" ? (
                      <button
                        type="button"
                        onClick={() => nav.openReceipt(row.id)}
                        className="text-xs font-semibold text-violet-700 hover:underline"
                      >
                        {dict.actView}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
