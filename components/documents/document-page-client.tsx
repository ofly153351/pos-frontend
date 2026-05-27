"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { getCurrentStoreId } from "@/lib/store-storage";
import {
  bulkDocumentAction,
  getDocuments,
  updateDocumentStatus,
} from "@/services/documents";
import { toast } from "@/components/ui/toast";
import type { DocumentListQuery, DocumentStatus, DocumentType } from "@/types/document";

import { DocumentFilterBar } from "./document-filter-bar";
import { DocumentStatsCards } from "./document-stats-cards";
import { DocumentTable } from "./document-table";
import { DocumentPreviewPanel } from "./document-preview-panel";
import { CreateDocumentModal } from "./create-document-modal";

type DocumentDict = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  filter: string;
  resetFilter: string;
  allTypes: string;
  allStatuses: string;
  allCustomers: string;
  allStaff: string;
  allPayments: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
  statusDraft: string;
  statusPending: string;
  statusOverdue: string;
  statusCompleted: string;
  statusCancelled: string;
  paymentUnpaid: string;
  paymentPartial: string;
  paymentPaid: string;
  statsTotal: string;
  statsPending: string;
  statsOverdue: string;
  statsPaid: string;
  exportExcel: string;
  printReport: string;
  createDocument: string;
  selectedCount: string;
  print: string;
  send: string;
  changeStatus: string;
  delete: string;
  cancelSelection: string;
  colDocumentNo: string;
  colType: string;
  colCustomer: string;
  colDate: string;
  colDueDate: string;
  colAmount: string;
  colStatus: string;
  colPaymentStatus: string;
  colActions: string;
  showing: string;
  of: string;
  records: string;
  perPage: string;
  copy: string;
  moreOptions: string;
  previewTitle: string;
  documentNo: string;
  date: string;
  dueDate: string;
  customer: string;
  items: string;
  subtotal: string;
  vat: string;
  total: string;
  relatedDocs: string;
  viewFull: string;
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  documentDate: string;
  optionalDueDate: string;
  addItem: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  enableVat: string;
  notes: string;
  cancel: string;
  create: string;
  createSuccess: string;
  createError: string;
  deleteSuccess: string;
  deleteError: string;
  statusUpdateSuccess: string;
  statusUpdateError: string;
  noDocuments: string;
  noDocumentsHint: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  confirm: string;
  units: string;
  loading: string;
  requestFailed: string;
  noResults: string;
};

type Props = { dictionary: DocumentDict };

const EMPTY_STATS = { total: 0, pending_payment: 0, overdue: 0, paid: 0 };
const DEFAULT_QUERY: DocumentListQuery = { page: 1, limit: 20 };

export function DocumentPageClient({ dictionary: d }: Props) {
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => { setStoreId(getCurrentStoreId()); }, []);

  const [query, setQuery] = useState<DocumentListQuery>(DEFAULT_QUERY);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalType, setCreateModalType] = useState<DocumentType | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  const { data, isLoading } = useQuery({
    queryKey: ["documents", storeId, query],
    queryFn: () => getDocuments(query),
    enabled: !!storeId,
    placeholderData: (prev) => prev,
  });

  const documents = data?.items ?? [];
  const stats = data?.stats ?? EMPTY_STATS;
  const total = data?.total ?? 0;

  const updateQuery = useCallback((patch: Partial<DocumentListQuery>) => {
    setQuery((q) => ({ ...q, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setQuery(DEFAULT_QUERY);
    setSelectedIds(new Set());
  }, []);

  function handleSelectDoc(id: string) {
    setSelectedDocId((prev) => (prev === id ? null : id));
  }

  function handleToggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (documents.every((d) => selectedIds.has(d.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  function handleBulkDelete() {
    if (!window.confirm(d.confirmDeleteMessage.replace("{n}", String(selectedIds.size)))) return;
    startBulkTransition(async () => {
      try {
        await bulkDocumentAction({ ids: Array.from(selectedIds), action: "DELETE" });
        toast.success(d.deleteSuccess);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        toast.error(d.deleteError);
      }
    });
  }

  function handleBulkStatus(status: DocumentStatus) {
    startBulkTransition(async () => {
      try {
        await bulkDocumentAction({ ids: Array.from(selectedIds), action: "SET_STATUS", status });
        toast.success(d.statusUpdateSuccess);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        toast.error(d.statusUpdateError);
      }
    });
  }

  function handleModalSuccess() {
    setCreateModalType(null);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  return (
    <>
      <div
        className="-mx-6 -my-6 flex flex-col overflow-hidden lg:-mx-8 lg:-my-8"
        style={{ height: "calc(100dvh - 4.5rem)" }}
      >
        {/* Page header */}
        <div className="shrink-0 border-b border-violet-100 bg-white/80 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{d.title}</h1>
              <p className="text-sm text-slate-500">{d.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <DocumentFilterBar
          dict={d}
          query={query}
          onChange={updateQuery}
          onReset={resetFilters}
        />

        {/* Stats + actions */}
        <DocumentStatsCards
          dict={d}
          stats={stats}
          onExport={() => toast.info(d.exportExcel)}
          onPrint={() => window.print()}
          onCreateDocument={(type) => setCreateModalType(type)}
        />

        {/* Body: table + preview panel */}
        <div className="flex min-h-0 flex-1">
          <DocumentTable
            dict={d}
            documents={documents}
            total={total}
            page={query.page ?? 1}
            limit={query.limit ?? 20}
            isLoading={isLoading}
            selectedDocId={selectedDocId}
            selectedIds={selectedIds}
            onSelectDoc={handleSelectDoc}
            onToggleId={handleToggleId}
            onToggleAll={handleToggleAll}
            onPageChange={(page) => updateQuery({ page })}
            onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
            onBulkDelete={handleBulkDelete}
            onBulkStatus={handleBulkStatus}
            onClearSelection={() => setSelectedIds(new Set())}
            onCreateDocument={() => setCreateModalType("INVOICE")}
            isBulkPending={isBulkPending}
          />

          {/* Preview panel — slides in when a doc is selected */}
          {selectedDocId && (
            <DocumentPreviewPanel
              documentId={selectedDocId}
              dict={d}
              onClose={() => setSelectedDocId(null)}
            />
          )}
        </div>
      </div>

      {/* Create modal */}
      {createModalType && (
        <CreateDocumentModal
          dict={d}
          initialType={createModalType}
          onClose={() => setCreateModalType(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
