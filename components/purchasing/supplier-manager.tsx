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
import { friendlyMessage } from "@/lib/form-errors";
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
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-pink-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InitialsAvatar({ name, logoUrl, size }: { name: string; logoUrl?: string; size: "md" | "lg" }) {
  const sizeClass = size === "lg"
    ? "h-16 w-16 rounded-2xl ring-2 ring-white/30 shadow-lg"
    : "h-11 w-11 rounded-xl shadow-sm";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className={`${sizeClass} shrink-0 object-cover`}
        src={logoUrl}
      />
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center ${avatarColor(name)} text-white font-bold ${sizeClass}`}>
      {supplierInitials(name)}
    </div>
  );
}

function StatusBadge({ isActive, ui }: { isActive: boolean; ui: SupplierUI }) {
  return isActive ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/50">
      {ui.badgeActive}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
      {ui.badgeInactive}
    </span>
  );
}

function StatusBadgeOnDark({ isActive, ui }: { isActive: boolean; ui: SupplierUI }) {
  return isActive ? (
    <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/40">
      {ui.badgeActive}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white/70 ring-1 ring-white/30">
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
      className={`w-full text-left transition-all duration-200 ${
        isSelected
          ? "border-l-[3px] border-violet-500 bg-violet-50"
          : "border-l-[3px] border-transparent hover:bg-slate-50/80"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <InitialsAvatar name={supplier.name} logoUrl={supplier.logo_url} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <p className={`line-clamp-1 text-sm font-bold leading-tight ${isSelected ? "text-violet-900" : "text-slate-800"}`}>
              {supplier.name}
            </p>
            <StatusBadge isActive={supplier.is_active} ui={ui} />
          </div>
          {supplier.contact_person && (
            <p className="mb-1.5 truncate text-xs text-slate-500">{supplier.contact_person}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {supplier.phone && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="font-mono">{supplier.phone}</span>
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-100">
              {ui.creditDaysPrefix} 30 {ui.daysSuffix}
            </span>
          </div>
        </div>
      </div>
      <div className={`mx-4 h-px ${isSelected ? "bg-violet-100" : "bg-slate-100"}`} />
    </button>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon, alert, primary,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  alert?: boolean;
  primary?: boolean;
}) {
  return (
    <div className={`flex flex-1 flex-col gap-2.5 rounded-xl p-4 ${
      primary
        ? "bg-violet-600 shadow-md shadow-violet-200/60"
        : alert
        ? "border border-red-200 bg-red-50"
        : "border border-violet-100 bg-violet-50/30"
    }`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
        primary
          ? "bg-white/20 text-white"
          : alert
          ? "bg-red-100 text-red-600"
          : "bg-violet-100 text-violet-600"
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-xl font-bold tabular-nums leading-tight ${
          primary ? "text-white" : alert ? "text-red-600" : "text-slate-800"
        }`}>
          {value}
        </p>
        <p className={`mt-0.5 text-xs font-medium ${primary ? "text-violet-100" : "text-slate-600"}`}>{title}</p>
        <p className={`text-[11px] ${primary ? "text-white/60" : alert ? "text-red-400" : "text-slate-400"}`}>{sub}</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Info section card ─────────────────────────────────────────────────────────

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          {icon}
        </span>
        {title}
      </h4>
      {children}
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
      {/* ── Hero header ── */}
      <div className="shrink-0 bg-violet-600 px-6 pt-5 pb-14">
        <div className="flex items-start gap-4">
          <InitialsAvatar name={supplier.name} logoUrl={supplier.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-white leading-tight">{supplier.name}</h2>
                <p className="mt-0.5 font-mono text-sm text-violet-200">
                  #{supplier.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <StatusBadgeOnDark isActive={supplier.is_active} ui={ui} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {ui.callBtn}
                </a>
              )}
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                แก้ไข
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:bg-red-400/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards — floats over gradient with negative margin ── */}
      <div className="-mt-8 shrink-0 px-6 pb-1">
        <div className="flex gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_4px_24px_rgba(124,58,237,0.14)]">
          <KpiCard
            title={ui.kpiTotal}
            value={`฿${fmtAmount(totalValue)}`}
            sub={ui.kpiAllTime}
            icon={<ShoppingBag className="h-4.5 w-4.5" />}
            primary
          />
          <KpiCard
            title={ui.kpiOutstanding}
            value="฿0.00"
            sub={ui.kpiNoDue}
            icon={<CreditCard className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title={ui.kpiCreditLimit}
            value="฿0.00"
            sub={ui.kpiNoLimit}
            icon={<Building2 className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title={ui.kpiRemaining}
            value="฿0.00"
            sub={ui.kpiNoLimit}
            icon={<FileText className="h-4.5 w-4.5" />}
          />
        </div>
      </div>

      {/* ── Info grid — 2×2 cards ── */}
      <div className="shrink-0 border-b border-slate-100 px-6 py-5">
        <div className="grid grid-cols-2 gap-4">
          <InfoCard icon={<User className="h-3.5 w-3.5" />} title={ui.sectionContact}>
            <div className="space-y-1.5">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label={ui.primaryContact} value={supplier.contact_person ?? ""} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="เบอร์โทร" value={supplier.phone ?? ""} />
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="อีเมล" value="" />
            </div>
          </InfoCard>

          <InfoCard icon={<CreditCard className="h-3.5 w-3.5" />} title={ui.sectionPayment}>
            <div className="space-y-1.5">
              <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="วิธีการชำระ" value="PromptPay" />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เลขที่บัญชี" value="" />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เครดิตเทอม" value="30 วัน" />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="เลขประจำตัวผู้เสียภาษี" value={supplier.tax_id ?? ""} />
            </div>
          </InfoCard>

          <InfoCard icon={<MapPin className="h-3.5 w-3.5" />} title={ui.sectionAddress}>
            {supplier.address ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{supplier.address}</p>
            ) : (
              <p className="text-sm italic text-slate-400">{ui.noInfo}</p>
            )}
          </InfoCard>

          <InfoCard icon={<MessageSquare className="h-3.5 w-3.5" />} title={ui.sectionNotes}>
            {supplier.note ? (
              <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
                <p className="text-sm italic leading-relaxed text-slate-600 whitespace-pre-line">{supplier.note}</p>
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">{ui.noInfo}</p>
            )}
          </InfoCard>
        </div>
      </div>

      {/* ── Purchase history ── */}
      <div className="flex-1 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
              <FileText className="h-4 w-4 text-violet-600" />
            </span>
            {ui.purchaseHistory}
            <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
              {supplierPOs.length}
            </span>
          </h4>
        </div>

        {recentPOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
              <FileText className="h-6 w-6 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">{ui.emptyHistory}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-violet-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    className={`border-t border-slate-100 transition-colors hover:bg-violet-50/40 ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                      {po.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(po.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                      ฿{fmtAmount(po.total_cost)}
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
  email: string;
  line_id: string;
  address: string;
  tax_id: string;
  note: string;
  is_active: boolean;
  payment_method: "promptpay" | "bank_account" | "";
  promptpay_number: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  credit_days: number | "";
  logo?: File;
  remove_logo: boolean;
};

const THAI_BANKS = [
  "ธนาคารกรุงเทพ (BBL)", "ธนาคารกสิกรไทย (KBANK)", "ธนาคารกรุงไทย (KTB)",
  "ธนาคารไทยพาณิชย์ (SCB)", "ธนาคารกรุงศรีอยุธยา (BAY)", "ธนาคารทหารไทยธนชาต (TTB)",
  "ธนาคารออมสิน (GSB)", "ธนาคารเพื่อการเกษตร (BAAC)", "ธนาคารซีไอเอ็มบีไทย (CIMB)",
  "ธนาคารยูโอบี (UOB)", "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH)", "ธนาคารอาคารสงเคราะห์ (GHB)",
];

const CREDIT_PRESETS = [0, 7, 15, 30, 45, 60, 90];

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
  const m = dict.addSupplierModal;
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EditFormData>({
    name: supplier.name,
    phone: supplier.phone ?? "",
    contact_person: supplier.contact_person ?? "",
    email: supplier.email ?? "",
    line_id: supplier.line_id ?? "",
    address: supplier.address ?? "",
    tax_id: supplier.tax_id ?? "",
    note: supplier.note ?? "",
    is_active: supplier.is_active,
    payment_method: supplier.payment_method ?? "",
    promptpay_number: supplier.promptpay_number ?? "",
    bank_name: supplier.bank_name ?? "",
    bank_account_number: supplier.bank_account_number ?? "",
    bank_account_name: supplier.bank_account_name ?? "",
    credit_days: supplier.credit_days ?? "",
    remove_logo: false,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(supplier.logo_url ?? null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { setError(m.logoErrType); return; }
    if (file.size > 2 * 1024 * 1024) { setError(m.logoErrSize); return; }
    setForm((f) => ({ ...f, logo: file, remove_logo: false }));
    setLogoPreview(URL.createObjectURL(file));
    setError("");
  }

  function handleRemoveLogo() {
    setForm((f) => ({ ...f, logo: undefined, remove_logo: true }));
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function set<K extends keyof EditFormData>(k: K, v: EditFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSave() {
    if (!form.name.trim()) { setError(dict.supplierName + " is required"); return; }
    startTransition(async () => {
      try {
        await updateSupplier(supplier.id, {
          ...form,
          credit_days: form.credit_days === "" ? undefined : Number(form.credit_days),
          payment_method: form.payment_method || undefined,
        });
        toast.success(dict.successUpdated);
        onSuccess();
        onClose();
      } catch (err) {
        setError(friendlyMessage(err));
      }
    });
  }

  const inp = "w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  const sectionTitle = "mb-3 text-xs font-bold uppercase tracking-wide text-violet-600";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(124,58,237,0.18)]" style={{ maxHeight: "92vh" }}>
          {/* Header */}
          <div className="h-1 shrink-0 bg-gradient-to-r from-violet-600 to-violet-400" />
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <Pencil className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{dict.editSupplier}</h4>
                <p className="text-xs text-slate-400">{supplier.name}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

            {/* Logo */}
            <div>
              <p className={sectionTitle}>{m.sectionLogo}</p>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" />
                    : <Building2 className="h-8 w-8 text-violet-300" />}
                </div>
                <div className="space-y-2">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoChange} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                    {m.logoUploadText}
                  </button>
                  {logoPreview && (
                    <button type="button" onClick={handleRemoveLogo}
                      className="ml-2 rounded-lg border border-red-100 bg-white px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                      {m.logoRemove}
                    </button>
                  )}
                  <p className="text-xs text-slate-400">{m.logoUploadHint}</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className={sectionTitle}>{m.sectionContact}</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{m.companyName} <span className="text-red-500">*</span></label>
                  <input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.contactPerson}</label>
                    <input className={inp} value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder={m.contactNamePlaceholder} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.supplierPhone}</label>
                    <input className={inp} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={m.phonePlaceholder} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{m.email}</label>
                    <input className={inp} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={m.emailPlaceholder} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{m.lineId}</label>
                    <input className={inp} value={form.line_id} onChange={(e) => set("line_id", e.target.value)} placeholder={m.lineIdPlaceholder} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <p className={sectionTitle}>{m.sectionFinancial}</p>
              <div className="space-y-3">
                {/* Payment method toggle */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">{m.paymentMethodLabel}</label>
                  <div className="flex gap-2">
                    {(["promptpay", "bank_account", ""] as const).map((v) => (
                      <button key={v} type="button" onClick={() => set("payment_method", v)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${form.payment_method === v ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                        {v === "promptpay" ? m.promptpay : v === "bank_account" ? m.bankAccount : dict.cancel.replace("ยกเลิก", "ไม่ระบุ")}
                      </button>
                    ))}
                  </div>
                </div>
                {form.payment_method === "promptpay" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{m.promptpayNumber}</label>
                    <input className={inp} value={form.promptpay_number} onChange={(e) => set("promptpay_number", e.target.value)} placeholder={m.promptpayNumberPlaceholder} />
                    <p className="mt-1 text-xs text-slate-400">{m.promptpayHint}</p>
                  </div>
                )}
                {form.payment_method === "bank_account" && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">{m.bankNameLabel}</label>
                      <select className={inp} value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)}>
                        <option value="">{m.selectBankPlaceholder}</option>
                        {THAI_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">{m.bankAccountNumber}</label>
                        <input className={inp} value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} placeholder={m.bankAccountNumberPlaceholder} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">{m.bankAccountName}</label>
                        <input className={inp} value={form.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} placeholder={m.bankAccountNamePlaceholder} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Credit term */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">{m.creditTerm}</label>
                  <div className="flex flex-wrap gap-2">
                    {CREDIT_PRESETS.map((d) => (
                      <button key={d} type="button" onClick={() => set("credit_days", d)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.credit_days === d ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                        {d === 0 ? m.creditCash : `${d} ${m.creditSuffix}`}
                      </button>
                    ))}
                    <button type="button" onClick={() => set("credit_days", "")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.credit_days === "" ? "border-slate-400 bg-slate-100 text-slate-700" : !CREDIT_PRESETS.includes(Number(form.credit_days)) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {m.creditCustom}
                    </button>
                  </div>
                  {!CREDIT_PRESETS.includes(Number(form.credit_days)) && (
                    <input type="number" min={0} max={365} className={inp + " mt-2"} value={form.credit_days} onChange={(e) => set("credit_days", e.target.value === "" ? "" : Number(e.target.value))} placeholder={m.creditCustomPlaceholder} />
                  )}
                </div>
              </div>
            </div>

            {/* Address & Notes */}
            <div>
              <p className={sectionTitle}>{dict.address}</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.address}</label>
                  <textarea className={inp + " resize-none"} rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={m.addressPlaceholder} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.taxId}</label>
                  <input className={inp} value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{dict.note}</label>
                  <textarea className={inp + " resize-none"} rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={m.notesPlaceholder} />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <button type="button" role="switch" aria-checked={form.is_active}
                onClick={() => set("is_active", !form.is_active)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? "bg-violet-600" : "bg-slate-300"}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-700">{dict.supplierIsActive}</p>
                <p className="text-xs text-slate-400">{form.is_active ? dict.supplierUI.badgeActive : dict.supplierUI.badgeInactive}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {dict.cancel}
            </button>
            <button type="button" onClick={handleSave} disabled={isPending}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
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
      <div className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50/80 to-white px-6 py-3.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

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

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          {ui.addSupplierBtn}
        </button>
      </div>

      {/* ── 2-panel layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─ Left panel ─ */}
        <div className="flex w-[320px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
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

          <div className="flex-1 overflow-y-auto pretty-scroll">
            {loadingSuppliers ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
                  <Search className="h-6 w-6 text-violet-300" />
                </div>
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
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50"
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
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center px-8">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-violet-100">
                  <Building2 className="h-11 w-11 text-violet-400" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
                  <User className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
              <div className="max-w-[220px]">
                <p className="text-base font-bold text-slate-700">{ui.selectHint}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{ui.selectSub}</p>
              </div>
            </div>
          ) : (
            <div key={selectedId} className="smooth-fade-up h-full">
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
