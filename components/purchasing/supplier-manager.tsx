"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, ChevronDown, CreditCard, FileText,
  Mail, MapPin, MessageSquare, MoreVertical,
  Pencil, Phone, Plus, Search, ShoppingBag,
  SlidersHorizontal, Trash2, User, X,
} from "lucide-react";

import {
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type Supplier,
} from "@/services/suppliers";
import { listPurchaseOrders, type PurchaseOrder } from "@/services/purchases";
import { toast } from "@/components/ui/toast";
import { AddSupplierModal } from "./add-supplier-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "inactive";
type SortBy = "recent" | "name_asc";

type SupplierUI = {
  allSuppliers: string;
  countUnit: string;
  sortRecent: string;
  sortNameAZ: string;
  loadMore: string;
  searchPlaceholder: string;
  filterAll: string;
  filterActive: string;
  filterInactive: string;
  noResults: string;
  noResultsSub: string;
  lastTx: string;
  creditDaysPrefix: string;
  daysSuffix: string;
  selectHint: string;
  selectSub: string;
  codeLabel: string;
  callBtn: string;
  lineBtn: string;
  kpiTotal: string;
  kpiOutstanding: string;
  kpiCreditLimit: string;
  kpiRemaining: string;
  kpiAllTime: string;
  kpiNoDue: string;
  kpiNoLimit: string;
  sectionContact: string;
  sectionPayment: string;
  sectionAddress: string;
  sectionNotes: string;
  primaryContact: string;
  noInfo: string;
  purchaseHistory: string;
  viewAll: string;
  colDocNo: string;
  colDate: string;
  colAmount: string;
  colStatus: string;
  emptyHistory: string;
  badgeActive: string;
  badgeInactive: string;
  addSupplierBtn: string;
};

type SupplierManagerProps = {
  dictionary: {
    title: string;
    createSupplier: string;
    editSupplier: string;
    supplierName: string;
    supplierPhone: string;
    contactPerson: string;
    address: string;
    taxId: string;
    note: string;
    supplierIsActive: string;
    save: string;
    saving: string;
    cancel: string;
    deleteConfirm: string;
    deleteLabel: string;
    successCreated: string;
    successUpdated: string;
    successDeleted: string;
    loading: string;
    emptySuppliers: string;
    requestFailed: string;
    tableActions: string;
    supplierProducts: string;
    addProduct: string;
    editProduct: string;
    removeProduct: string;
    noProducts: string;
    searchProduct: string;
    supplierSKU: string;
    supplierPrice: string;
    productName: string;
    productSKU: string;
    confirmRemoveProduct: string;
    productRemoved: string;
    productAdded: string;
    productUpdated: string;
    selectExistingProduct: string;
    createNewProduct: string;
    productNameRequired: string;
    basePrice: string;
    supplierUI: SupplierUI;
    addSupplierModal: {
      subtitle: string;
      timeHint: string;
      activateNow: string;
      sectionContact: string;
      companyName: string;
      companyNamePlaceholder: string;
      contactNamePlaceholder: string;
      phonePlaceholder: string;
      lineId: string;
      lineIdPlaceholder: string;
      email: string;
      emailPlaceholder: string;
      sectionLogo: string;
      logoOptional: string;
      logoUploadText: string;
      logoUploadHint: string;
      logoRemove: string;
      logoErrType: string;
      logoErrSize: string;
      sectionFinancial: string;
      paymentMethodLabel: string;
      promptpay: string;
      bankAccount: string;
      promptpayNumber: string;
      promptpayNumberPlaceholder: string;
      promptpayHint: string;
      bankNameLabel: string;
      bankAccountNumber: string;
      bankAccountName: string;
      bankAccountNumberPlaceholder: string;
      bankAccountNamePlaceholder: string;
      selectBankPlaceholder: string;
      creditTerm: string;
      creditCash: string;
      creditCustom: string;
      creditCustomLabel: string;
      creditCustomPlaceholder: string;
      creditSuffix: string;
      addressPlaceholder: string;
      notesPlaceholder: string;
      saveSupplier: string;
      cancelConfirmTitle: string;
      cancelConfirmBody: string;
      backToForm: string;
      confirmCancel: string;
      errCompanyName: string;
      errContactName: string;
      errPhone: string;
      errEmail: string;
      errPromptpay: string;
      errBankName: string;
      errBankAccountNumber: string;
      errBankAccountName: string;
      errCreditTerm: string;
      errCustomDays: string;
    };
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: number) {
  return v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear() + 543}`;
}

function supplierInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-violet-700",
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-600",
  "from-cyan-500 to-cyan-700",
  "from-indigo-500 to-indigo-700",
  "from-pink-500 to-pink-700",
];

function avatarGradient(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InitialsAvatar({ name, size }: { name: string; size: "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl rounded-2xl" : "h-12 w-12 text-sm rounded-xl";
  return (
    <div className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${avatarGradient(name)} text-white font-bold ${sizeClass}`}>
      {supplierInitials(name)}
    </div>
  );
}

function StatusBadge({ isActive, ui }: { isActive: boolean; ui: SupplierUI }) {
  return isActive ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      {ui.badgeActive}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
      {ui.badgeInactive}
    </span>
  );
}

function POStatusBadge({ status }: { status: PurchaseOrder["status"] }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    pending:   "bg-amber-100 text-amber-700",
    partial:   "bg-blue-100 text-blue-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  const labelMap: Record<string, string> = {
    completed: "ชำระครบ",
    pending:   "รอดำเนินการ",
    partial:   "รับบางส่วน",
    cancelled: "ยกเลิก",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? map.pending}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

// ── Supplier card ─────────────────────────────────────────────────────────────

function SupplierCard({
  supplier, isSelected, onClick, ui,
}: {
  supplier: Supplier;
  isSelected: boolean;
  onClick: () => void;
  ui: SupplierUI;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left transition-all ${
        isSelected
          ? "border-l-4 border-violet-500 bg-violet-50/80"
          : "border-l-4 border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <InitialsAvatar name={supplier.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-bold text-slate-800 leading-tight">
              {supplier.name}
            </p>
            <StatusBadge isActive={supplier.is_active} ui={ui} />
          </div>
          {supplier.contact_person && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{supplier.contact_person}</p>
          )}
          {supplier.phone && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Phone className="h-3 w-3 shrink-0" />
              {supplier.phone}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
            <span>{ui.creditDaysPrefix} 30 {ui.daysSuffix}</span>
            <span>·</span>
            <span>{ui.lastTx} {fmtDate(supplier.updated_at)}</span>
          </div>
        </div>
      </div>
      <div className="mx-4 h-px bg-slate-100" />
    </button>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon, alert,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`flex flex-1 flex-col gap-2 rounded-2xl border p-4 ${
      alert ? "border-red-200 bg-red-50" : "border-violet-100 bg-white"
    }`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
        alert ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-600"
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-lg font-bold tabular-nums ${alert ? "text-red-600" : "text-slate-800"}`}>
          {value}
        </p>
        <p className="text-xs text-slate-500">{title}</p>
        <p className={`mt-0.5 text-xs ${alert ? "text-red-400" : "text-slate-400"}`}>{sub}</p>
      </div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="mt-0.5 shrink-0 text-violet-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Supplier detail ───────────────────────────────────────────────────────────

function SupplierDetail({
  supplier,
  pos,
  ui,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  pos: PurchaseOrder[];
  ui: SupplierUI;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const supplierPOs = pos
    .filter((p) => p.supplier_id === supplier.id && p.status !== "cancelled")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalValue = supplierPOs.reduce((s, p) => s + p.total_cost, 0);
  const recentPOs = supplierPOs.slice(0, 5);

  return (
    <div className="flex h-full flex-col overflow-y-auto pretty-scroll">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
        <div className="flex items-start gap-4">
          <InitialsAvatar name={supplier.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{supplier.name}</h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  {ui.codeLabel}: {supplier.id.substring(0, 12).toUpperCase()}
                </p>
              </div>
              <StatusBadge isActive={supplier.is_active} ui={ui} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {ui.callBtn}
                </a>
              )}
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                {/* edit */}
                แก้ไข
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
        <div className="flex gap-3">
          <KpiCard
            title={ui.kpiTotal}
            value={`${fmtAmount(totalValue)}`}
            sub={ui.kpiAllTime}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <KpiCard
            title={ui.kpiOutstanding}
            value="0.00"
            sub={ui.kpiNoDue}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <KpiCard
            title={ui.kpiCreditLimit}
            value="0.00"
            sub={ui.kpiNoLimit}
            icon={<Building2 className="h-5 w-5" />}
          />
          <KpiCard
            title={ui.kpiRemaining}
            value="0.00"
            sub={ui.kpiNoLimit}
            icon={<FileText className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Info grid */}
      <div className="shrink-0 border-b border-slate-100 px-6 py-5">
        <div className="grid grid-cols-4 gap-6">
          {/* Contact */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <User className="h-3.5 w-3.5" />
              {ui.sectionContact}
            </h4>
            <div className="space-y-0.5">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label={ui.primaryContact} value={supplier.contact_person ?? ""} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label={/* phone */ "เบอร์โทร"} value={supplier.phone ?? ""} />
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="อีเมล" value={""} />
            </div>
          </div>
          {/* Payment */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <CreditCard className="h-3.5 w-3.5" />
              {ui.sectionPayment}
            </h4>
            <div className="space-y-0.5">
              <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="วิธีการชำระ" value="PromptPay" />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เลขที่บัญชี" value="" />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เครดิตเทอม" value={`30 วัน`} />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เลขประจำตัวผู้เสียภาษี" value={supplier.tax_id ?? ""} />
            </div>
          </div>
          {/* Address */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {ui.sectionAddress}
            </h4>
            {supplier.address ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{supplier.address}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">{ui.noInfo}</p>
            )}
          </div>
          {/* Notes */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              {ui.sectionNotes}
            </h4>
            {supplier.note ? (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm italic text-slate-600 leading-relaxed whitespace-pre-line">{supplier.note}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">{ui.noInfo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Purchase history */}
      <div className="flex-1 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FileText className="h-4 w-4 text-violet-500" />
            {ui.purchaseHistory}
            <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
              {supplierPOs.length}
            </span>
          </h4>
        </div>

        {recentPOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{ui.emptyHistory}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">{ui.colDocNo}</th>
                  <th className="px-4 py-3 text-left">{ui.colDate}</th>
                  <th className="px-4 py-3 text-right">{ui.colAmount}</th>
                  <th className="px-4 py-3 text-center">{ui.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po, idx) => (
                  <tr
                    key={po.id}
                    className={`border-t border-slate-100 transition-colors hover:bg-violet-50/40 ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                      {po.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(po.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                      {fmtAmount(po.total_cost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <POStatusBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
              <p className="text-xs text-slate-400">
                แสดง {recentPOs.length} จาก {supplierPOs.length} รายการ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit supplier modal ───────────────────────────────────────────────────────

type EditFormData = {
  name: string;
  phone: string;
  contact_person: string;
  address: string;
  tax_id: string;
  note: string;
  is_active: boolean;
};

function EditSupplierModal({
  supplier,
  dict,
  onClose,
  onSuccess,
}: {
  supplier: Supplier;
  dict: SupplierManagerProps["dictionary"];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EditFormData>({
    name: supplier.name,
    phone: supplier.phone ?? "",
    contact_person: supplier.contact_person ?? "",
    address: supplier.address ?? "",
    tax_id: supplier.tax_id ?? "",
    note: supplier.note ?? "",
    is_active: supplier.is_active,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSave() {
    if (!form.name.trim()) { setError(dict.supplierName + " is required"); return; }
    startTransition(async () => {
      try {
        await updateSupplier(supplier.id, form);
        toast.success(dict.successUpdated);
        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.requestFailed);
      }
    });
  }

  const inputCls = "w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 smooth-fade" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="smooth-fade-up w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_60px_rgba(124,58,237,0.15)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h4 className="text-base font-bold text-slate-900">{dict.editSupplier}</h4>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.supplierName} <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.supplierPhone}</label>
                <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.contactPerson}</label>
                <input className={inputCls} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.address}</label>
              <textarea className={inputCls + " resize-none"} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.taxId}</label>
                <input className={inputCls} value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.note}</label>
                <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? "bg-violet-600" : "bg-slate-300"}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm font-medium text-slate-700">{dict.supplierIsActive}</span>
            </div>
          </div>
          <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              {dict.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-pink-600 disabled:opacity-60 transition-all"
            >
              {isPending ? dict.saving : dict.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SupplierManager({ dictionary }: SupplierManagerProps) {
  const ui = dictionary.supplierUI;
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [visibleCount, setVisibleCount] = useState(20);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await listSuppliers();
      return res.data ?? [];
    },
  });

  const { data: allPOs = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await listPurchaseOrders();
      return res.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = [...suppliers];
    if (statusFilter === "active") list = list.filter((s) => s.is_active);
    else if (statusFilter === "inactive") list = list.filter((s) => !s.is_active);

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone ?? "").includes(q) ||
          (s.contact_person ?? "").toLowerCase().includes(q),
      );
    }

    if (sortBy === "name_asc") list.sort((a, b) => a.name.localeCompare(b.name, "th"));
    else list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return list;
  }, [suppliers, statusFilter, debouncedSearch, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const selectedSupplier = suppliers.find((s) => s.id === selectedId) ?? null;

  async function handleDelete(supplier: Supplier) {
    if (!window.confirm(dictionary.deleteConfirm)) return;
    setIsDeletingId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (selectedId === supplier.id) setSelectedId(null);
      toast.success(dictionary.successDeleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dictionary.requestFailed);
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <div className="-mx-6 -my-6 lg:-mx-8 lg:-my-8 flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 4.5rem)" }}>
      {/* ── Top search bar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="appearance-none rounded-xl border border-violet-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="all">{ui.filterAll}</option>
            <option value="active">{ui.filterActive}</option>
            <option value="inactive">{ui.filterInactive}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex-1" />

        {/* Add button */}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-pink-600 transition-all"
        >
          <Plus className="h-4 w-4" />
          {ui.addSupplierBtn}
        </button>
      </div>

      {/* ── 2-panel layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─ Left panel ─ */}
        <div className="flex w-[320px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          {/* Panel header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">{ui.allSuppliers}</span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
                {filtered.length} {ui.countUnit}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="appearance-none rounded-lg border-0 bg-transparent py-1 pl-2 pr-6 text-xs font-medium text-slate-600 outline-none focus:ring-0"
              >
                <option value="recent">{ui.sortRecent}</option>
                <option value="name_asc">{ui.sortNameAZ}</option>
              </select>
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto pretty-scroll">
            {loadingSuppliers ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
                <Search className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">{ui.noResults}</p>
                <p className="text-xs text-slate-400">{ui.noResultsSub}</p>
              </div>
            ) : (
              <>
                {visible.map((s) => (
                  <SupplierCard
                    key={s.id}
                    supplier={s}
                    isSelected={s.id === selectedId}
                    onClick={() => setSelectedId(s.id === selectedId ? selectedId : s.id)}
                    ui={ui}
                  />
                ))}
                {filtered.length > visibleCount && (
                  <div className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + 20)}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      {ui.loadMore}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─ Right panel ─ */}
        <div className="relative flex-1 overflow-hidden bg-[linear-gradient(160deg,_#f5f3ff_0%,_#faf5ff_35%,_#f8fafc_100%)]">
          {!selectedSupplier ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100">
                <ShoppingBag className="h-9 w-9 text-violet-400" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-700">{ui.selectHint}</p>
                <p className="mt-1 text-sm text-slate-400">{ui.selectSub}</p>
              </div>
            </div>
          ) : (
            <div key={selectedId} className="detail-slide-in h-full">
              <SupplierDetail
                supplier={selectedSupplier}
                pos={allPOs}
                ui={ui}
                onEdit={() => setIsEditOpen(true)}
                onDelete={() => handleDelete(selectedSupplier)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {isAddOpen && (
        <AddSupplierModal
          dictionary={dictionary}
          onClose={() => setIsAddOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setIsAddOpen(false);
          }}
        />
      )}

      {isEditOpen && selectedSupplier && (
        <EditSupplierModal
          supplier={selectedSupplier}
          dict={dictionary}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
        />
      )}
    </div>
  );
}
