"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";

import { cancelGoodsReceipt, listGoodsReceipts } from "@/services/goods-receipts";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { toast } from "@/components/ui/toast";

import {
  formatDateTimeLabel,
  formatNumber,
  getReceiptRoute,
  normalizeGoodsReceiptDraftList,
  type ReceiveDictionary,
} from "./receive-shared";
import { ReceiptStatusBadge, SummaryCard } from "./receive-cards";

type ReceivePageProps = {
  dictionary: ReceiveDictionary;
  locale: string;
};

export function ReceiveIndexPage({ dictionary, locale }: ReceivePageProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const draftsQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "drafts"],
    queryFn: async () => normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 6, page: 1, status: "draft" })).data.items),
  });
  const recentQuery = useQuery({
    queryKey: ["warehouse", "receive", "index", "recent"],
    queryFn: async () => {
      const items = normalizeGoodsReceiptDraftList((await listGoodsReceipts({ limit: 20, page: 1 })).data.items);
      return items
        .filter((r) => r.status !== "cancelled")
        .sort((a, b) => {
          const aTime = new Date(a.confirmed_at ?? a.updated_at).getTime();
          const bTime = new Date(b.confirmed_at ?? b.updated_at).getTime();
          return bTime - aTime;
        })
        .slice(0, 8);
    },
  });

  const drafts = draftsQuery.data ?? [];
  const recentReceipts = recentQuery.data ?? [];
  const resumeDraft = drafts[0] ?? null;

  function handleDeleteDraft(id: string) {
    startDeleteTransition(async () => {
      try {
        await cancelGoodsReceipt(id);
        await queryClient.invalidateQueries({ queryKey: ["warehouse", "receive", "index"] });
        toast.success(dictionary.badgeCancelled);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : dictionary.stateSaving);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-6 xl:px-2 2xl:px-4">
      <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{dictionary.badgeDraft}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{dictionary.pageTitle}</h1>
            <p className="mt-3 text-sm text-slate-600">{dictionary.helperIndex}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {resumeDraft ? (
              <Link
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                href={getReceiptRoute(locale, resumeDraft)}
              >
                {dictionary.actionResumeDraft}
              </Link>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              href={`/${locale}/warehouse/receive/new`}
            >
              <ReceiptText className="h-4 w-4" />
              {dictionary.actionNewReceipt}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{dictionary.labelDraftReceipts}</h2>
              <p className="mt-1 text-sm text-slate-500">{dictionary.helperDraft}</p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{drafts.length}</span>
          </div>

          {draftsQuery.isLoading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
              {dictionary.stateLoadingDrafts}
            </div>
          ) : draftsQuery.isError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {draftsQuery.error instanceof Error ? draftsQuery.error.message : dictionary.stateLoadingDrafts}
            </div>
          ) : drafts.length ? (
            <div className="mt-5 space-y-3">
              {drafts.map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{receipt.document_no}</p>
                        <ReceiptStatusBadge dictionary={dictionary} receipt={receipt} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <SummaryCard label={dictionary.labelWarehouse} value={receipt.warehouse_name ?? "-"} />
                        <SummaryCard label={dictionary.labelReceivedAt} value={formatDateTimeLabel(receipt.received_at)} />
                        <SummaryCard label={dictionary.labelItems} value={formatNumber(receipt.items.length)} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        disabled={isPendingDelete}
                        onClick={() => setDeletingId(receipt.id)}
                        type="button"
                      >
                        {dictionary.actionCancel}
                      </button>
                      <Link
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                        href={getReceiptRoute(locale, receipt)}
                      >
                        {dictionary.actionResumeDraft}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
              {dictionary.stateNoDrafts}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{dictionary.labelRecentReceipts}</h2>
            {recentQuery.isLoading ? (
              <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.stateLoadingDrafts}
              </div>
            ) : recentQuery.isError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {recentQuery.error instanceof Error ? recentQuery.error.message : dictionary.stateLoadingDrafts}
              </div>
            ) : recentReceipts.length ? (
              <div className="mt-4 space-y-3">
                {recentReceipts.map((receipt) => (
                  <Link
                    className="block rounded-2xl border border-violet-100 bg-violet-50/30 p-4 transition-colors hover:border-violet-200 hover:bg-violet-50/60"
                    href={getReceiptRoute(locale, receipt)}
                    key={receipt.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{receipt.document_no}</p>
                        <p className="mt-1 text-sm text-slate-500">{receipt.warehouse_name ?? "-"}</p>
                      </div>
                      <ReceiptStatusBadge dictionary={dictionary} receipt={receipt} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{formatDateTimeLabel(receipt.updated_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-center text-sm text-slate-500">
                {dictionary.stateNoRecentReceipts}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        confirmLabel={dictionary.actionCancel}
        danger
        isOpen={!!deletingId}
        title={dictionary.confirmTitle}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDeleteDraft(deletingId)}
      >
        {dictionary.confirmCancel}
      </ConfirmDialog>
    </div>
  );
}
