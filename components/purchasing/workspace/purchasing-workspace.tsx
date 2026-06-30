"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, PackagePlus, Plus } from "lucide-react";

import { PurchaseForm } from "@/components/purchasing/purchase-form";
import { listPurchaseOrders, type PurchaseOrder } from "@/services/purchases";
import { listGoodsReceipts } from "@/services/goods-receipts";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";

import {
  canOperateStore,
  isOpenPo,
  isWorkspaceTab,
  poProgress,
  WORKSPACE_TABS,
  type WorkspaceNav,
  type WorkspaceTabKey,
  type WsDict,
} from "./workspace-shared";
import { TabButton } from "./workspace-ui";
import { OverviewTab } from "./overview-tab";
import { PurchaseOrdersTab } from "./purchase-orders-tab";
import { PendingReceivingTab } from "./pending-receiving-tab";
import { GoodsReceiptsTab } from "./goods-receipts-tab";
import { PendingApprovalTab } from "./pending-approval-tab";
import { CompletedTab } from "./completed-tab";

const RECEIPTS_SUMMARY_LIMIT = 200;

type FormDict = React.ComponentProps<typeof PurchaseForm>["dictionary"];

type Props = {
  dict: WsDict;
  formDict: FormDict;
};

export function PurchasingWorkspace({ dict, formDict }: Props) {
  const params = useParams();
  const locale = (params?.locale as string) || "th";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { role, loading: roleLoading } = useStoreRole();

  const [showCreateForm, setShowCreateForm] = useState(false);
  // First day of the current month (stable per mount) for "completed this month".
  const [monthStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });

  const tabParam = searchParams.get("tab");
  const activeTab: WorkspaceTabKey = isWorkspaceTab(tabParam) ? tabParam : "overview";

  // Until the store role resolves, treat privileged actions as not-yet-allowed
  // (disabled) rather than briefly enabling them for an unknown user. The backend
  // still enforces every gate.
  const canManage = !roleLoading && canManageStore(role);
  const canOperate = !roleLoading && canOperateStore(role);

  // ── Shared queries (Overview + multiple tabs / badges) ──────────────────────
  const posQuery = useQuery<PurchaseOrder[]>({
    queryKey: ["workspace", "purchase-orders"],
    queryFn: async () => (await listPurchaseOrders()).data ?? [],
  });
  const pendingReviewQuery = useQuery({
    queryKey: ["workspace", "receipts", "pending_review_summary"],
    queryFn: async () =>
      (await listGoodsReceipts({ status: "pending_review", limit: RECEIPTS_SUMMARY_LIMIT })).data,
  });
  const confirmedQuery = useQuery({
    queryKey: ["workspace", "receipts", "confirmed_summary"],
    queryFn: async () =>
      (await listGoodsReceipts({ status: "confirmed", limit: RECEIPTS_SUMMARY_LIMIT })).data,
  });

  const pos = useMemo(() => posQuery.data ?? [], [posQuery.data]);
  const pendingReviewItems = useMemo(
    () => pendingReviewQuery.data?.items ?? [],
    [pendingReviewQuery.data],
  );
  const pendingReviewTotal = pendingReviewQuery.data?.total ?? pendingReviewItems.length;
  const confirmedItems = useMemo(() => confirmedQuery.data?.items ?? [], [confirmedQuery.data]);
  const confirmedTotal = confirmedQuery.data?.total ?? confirmedItems.length;

  // ── Tab badge counts ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const pendingReceiving = pos.filter((po) => isOpenPo(po) && (poProgress(po).outstanding > 0 || poProgress(po).ordered === 0)).length;
    const completedPo = pos.filter((po) => po.status === "completed").length;
    return {
      "purchase-orders": pos.length,
      "pending-receiving": pendingReceiving,
      "pending-approval": pendingReviewTotal,
      completed: completedPo + confirmedTotal,
    } as Partial<Record<WorkspaceTabKey, number>>;
  }, [pos, pendingReviewTotal, confirmedTotal]);

  // ── Navigation helpers (all receiving → canonical editor) ───────────────────
  const nav: WorkspaceNav = useMemo(
    () => ({
      receiveForPo: (poId: string) => router.push(`/${locale}/warehouse/receive/new?po=${poId}`),
      receiveWithoutPo: () => router.push(`/${locale}/warehouse/receive/new`),
      openReceipt: (receiptId: string) => router.push(`/${locale}/warehouse/receive/${receiptId}`),
      // `tab` is the only query param the workspace uses, so set it directly
      // (avoids depending on the per-render searchParams reference).
      switchTab: (tab: WorkspaceTabKey) =>
        router.replace(`${pathname}?tab=${tab}`, { scroll: false }),
    }),
    [locale, pathname, router],
  );

  const tabLabel: Record<WorkspaceTabKey, string> = {
    overview: dict.tabOverview,
    "purchase-orders": dict.tabPurchaseOrders,
    "pending-receiving": dict.tabPendingReceiving,
    "goods-receipts": dict.tabGoodsReceipts,
    "pending-approval": dict.tabPendingApproval,
    completed: dict.tabCompleted,
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Create PO form (toggled by the quick action) */}
      {showCreateForm ? (
        <PurchaseForm
          dictionary={formDict}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ["workspace", "purchase-orders"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          }}
        />
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900 md:text-2xl">{dict.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{dict.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setShowCreateForm(true)}
            title={canManage ? undefined : dict.createPoDenied}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {dict.createPo}
          </button>
          <button
            type="button"
            disabled={!canOperate}
            onClick={() => nav.receiveWithoutPo()}
            title={canOperate ? undefined : dict.receiveDenied}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PackagePlus className="h-4 w-4" />
            {dict.receiveWithoutPo}
          </button>
          <button
            type="button"
            onClick={() => nav.switchTab("goods-receipts")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ListChecks className="h-4 w-4" />
            {dict.openReceivingList}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {WORKSPACE_TABS.map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            label={tabLabel[tab]}
            count={counts[tab]}
            onClick={() => nav.switchTab(tab)}
          />
        ))}
      </div>

      {/* Active tab */}
      {activeTab === "overview" ? (
        <OverviewTab
          dict={dict}
          locale={locale}
          pos={pos}
          posLoading={posQuery.isLoading}
          posError={posQuery.isError}
          onRetryPos={() => posQuery.refetch()}
          pendingReview={pendingReviewItems}
          pendingReviewTotal={pendingReviewTotal}
          pendingLoading={pendingReviewQuery.isLoading}
          confirmed={confirmedItems}
          confirmedLoading={confirmedQuery.isLoading}
          monthStart={monthStart}
          nav={nav}
        />
      ) : null}

      {activeTab === "purchase-orders" ? (
        <PurchaseOrdersTab
          dict={dict}
          locale={locale}
          canOperate={canOperate}
          canManage={canManage}
          pos={pos}
          loading={posQuery.isLoading}
          error={posQuery.isError}
          onRetry={() => posQuery.refetch()}
          nav={nav}
        />
      ) : null}

      {activeTab === "pending-receiving" ? (
        <PendingReceivingTab
          dict={dict}
          locale={locale}
          canOperate={canOperate}
          pos={pos}
          loading={posQuery.isLoading}
          error={posQuery.isError}
          onRetry={() => posQuery.refetch()}
          nav={nav}
        />
      ) : null}

      {activeTab === "goods-receipts" ? (
        <GoodsReceiptsTab dict={dict} locale={locale} nav={nav} />
      ) : null}

      {activeTab === "pending-approval" ? (
        <PendingApprovalTab
          dict={dict}
          locale={locale}
          items={pendingReviewItems}
          loading={pendingReviewQuery.isLoading}
          error={pendingReviewQuery.isError}
          onRetry={() => pendingReviewQuery.refetch()}
          nav={nav}
        />
      ) : null}

      {activeTab === "completed" ? (
        <CompletedTab
          dict={dict}
          locale={locale}
          pos={pos}
          confirmed={confirmedItems}
          loading={posQuery.isLoading || confirmedQuery.isLoading}
          error={posQuery.isError}
          onRetry={() => {
            posQuery.refetch();
            confirmedQuery.refetch();
          }}
          nav={nav}
        />
      ) : null}
    </div>
  );
}
