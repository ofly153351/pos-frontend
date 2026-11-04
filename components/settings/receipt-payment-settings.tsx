"use client";

import { unavailableText } from "@/lib/unavailable";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Save,
  Smartphone,
  Star,
  Trash2,
  X,
  Upload,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { getReceiptSettings, updateReceiptSettings, fetchReceiptPreviewHTML } from "@/services/receipt-settings";
import { getStoreById, listBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from "@/services/stores";
import { getCurrentStoreId } from "@/lib/store-storage";
import { useStoreRole, canManageStore } from "@/lib/use-store-role";
import type { ReceiptSettingsData, UpdateReceiptSettingsInput, PaymentChannelSetting } from "@/types/receipt-settings";
import type { Store as StoreType, StoreBankAccount, CreateBankAccountInput, UpdateBankAccountInput } from "@/types/store";
import { SkeletonSettingsPanel } from "@/components/ui/skeleton";
import th from "@/locales/th.json";
import type { ReceiptPaymentSettingsT } from "./types";
import type { ReceiptPaymentSettingsTaxMode } from "./types";
import type { ReceiptPaymentSettingsPaperSize } from "./types";
import type { ReceiptPaymentSettingsLogoPosition } from "./types";
import type { ReceiptPaymentSettingsTabKey } from "./types";
import type { ReceiptPaymentSettingsPaymentChannel } from "./types";
import type { ReceiptPaymentSettingsGatewayProvider } from "./types";
import type { ReceiptPaymentSettingsGatewayConfig } from "./types";




// ── Types ─────────────────────────────────────────────────────────────────────







// Canonical channels (keys mirror lib/payment-method.ts) + legacy keys kept ONLY so an
// older saved config still renders with the right name. Labels match the canonical
// resolver so settings, checkout and reports all read the same.
const CHANNEL_META: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  // — canonical —
  cash:          { name: "เงินสด",              color: "bg-emerald-500", icon: <Wallet     className="h-4 w-4" /> },
  bank_transfer: { name: "โอนเงิน",             color: "bg-orange-500",  icon: <QrCode     className="h-4 w-4" /> },
  promptpay:     { name: "พร้อมเพย์ (QR)",      color: "bg-violet-600",  icon: <Smartphone className="h-4 w-4" /> },
  card:          { name: "บัตรเครดิต / เดบิต",  color: "bg-blue-600",    icon: <CreditCard className="h-4 w-4" /> },
  truemoney:     { name: "TrueMoney Wallet",    color: "bg-orange-300",  icon: <Wallet     className="h-4 w-4" /> },
  shopeepay:     { name: "ShopeePay",           color: "bg-rose-500",    icon: <Smartphone className="h-4 w-4" /> },
  // — legacy (display-only fallback for pre-existing saved configs) —
  qr:          { name: "พร้อมเพย์ (QR)",   color: "bg-violet-500", icon: <QrCode     className="h-4 w-4" /> },
  credit_card: { name: "บัตรเครดิต",        color: "bg-blue-500",   icon: <CreditCard className="h-4 w-4" /> },
  debit_card:  { name: "บัตรเดบิต",         color: "bg-teal-500",   icon: <CreditCard className="h-4 w-4" /> },
};

function toChannels(raw: PaymentChannelSetting[]): ReceiptPaymentSettingsPaymentChannel[] {
  return raw.map((ch) => ({
    key: ch.key,
    enabled: ch.enabled,
    ...(CHANNEL_META[ch.key] ?? { name: ch.key, color: "bg-slate-500", icon: <Wallet className="h-4 w-4" /> }),
  }));
}

// TODO: The "printer" and "display" tabs (PrinterTab / DisplayTab components below) are
// fully built but intentionally NOT listed here yet — the backend does not persist a real
// printer config or customer-display device, so exposing them would let users save settings
// that have no effect. Re-add them to this array once those features are wired end-to-end.
function makeTabs(t: ReceiptPaymentSettingsT) {
  return [
    { key: "receipt"      as ReceiptPaymentSettingsTabKey, label: t.tabs.receipt,      icon: <ReceiptText className="h-4 w-4" /> },
    { key: "payment"      as ReceiptPaymentSettingsTabKey, label: t.tabs.payment,      icon: <CreditCard  className="h-4 w-4" /> },
    { key: "promptpay"    as ReceiptPaymentSettingsTabKey, label: t.tabs.promptpay,    icon: <QrCode      className="h-4 w-4" /> },
    { key: "bankAccounts" as ReceiptPaymentSettingsTabKey, label: t.tabs.bankAccounts, icon: <Banknote    className="h-4 w-4" /> },
    { key: "gateway"      as ReceiptPaymentSettingsTabKey, label: t.tabs.gateway,      icon: <Zap         className="h-4 w-4" /> },
    // { key: "printer"   as ReceiptPaymentSettingsTabKey, label: t.tabs.printer,   icon: <Printer className="h-4 w-4" /> },
    // { key: "display"   as ReceiptPaymentSettingsTabKey, label: t.tabs.display,   icon: <Monitor className="h-4 w-4" /> },
  ];
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-base font-bold text-slate-800">{children}</h3>;
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-slate-700">{children}</span>
      {hint && <span className="ml-1.5 text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const selectCls = "w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

// ── Tab panels ────────────────────────────────────────────────────────────────
function ReceiptTab({ settings, onChange, t }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void; t: ReceiptPaymentSettingsT }) {
  const r = t.receipt;
  const taxLabels: Record<ReceiptPaymentSettingsTaxMode, string> = { none: r.taxNone, inclusive: r.taxInclusive, exclusive: r.taxExclusive };
  const storeInfoFields: [keyof ReceiptSettingsData, string][] = [
    ["show_store_name", r.showStoreName],
    ["show_address",    r.showAddress],
    ["show_phone",      r.showPhone],
    ["show_tax_id",     r.showTaxId],
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionTemplate}</SectionTitle>
        <FieldLabel>{r.labelTemplate}</FieldLabel>
        <select className={selectCls} value={settings.template_key} onChange={(e) => onChange({ template_key: e.target.value })}>
          <option value="modern_classic">Modern Classic</option>
          <option value="minimal">Minimal</option>
          <option value="classic">Classic</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionPaper}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{r.labelPaperSize}</FieldLabel>
            <select className={selectCls} value={settings.paper_size} onChange={(e) => onChange({ paper_size: e.target.value as ReceiptPaymentSettingsPaperSize })}>
              <option value="80mm">{r.paper80mm}</option>
              <option value="a4">{r.paperA4}</option>
            </select>
          </div>
          <div>
            <FieldLabel>{r.labelPaperLength}</FieldLabel>
            <select className={selectCls} value={settings.paper_length} onChange={(e) => onChange({ paper_length: e.target.value })}>
              <option value="auto">{r.lengthAuto}</option>
              <option value="150mm">Fixed 150mm</option>
              <option value="200mm">Fixed 200mm</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionTax}</SectionTitle>
        <div className="mb-4 flex gap-2">
          {(["none", "inclusive", "exclusive"] as ReceiptPaymentSettingsTaxMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => onChange({ tax_mode: mode })}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${settings.tax_mode === mode ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200 bg-white text-slate-600 hover:border-violet-400"}`}>
              {taxLabels[mode]}
            </button>
          ))}
        </div>
        <div className={`grid grid-cols-2 gap-3 ${settings.tax_mode === "none" ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <FieldLabel>{r.labelVatRate}</FieldLabel>
            <select className={selectCls} value={settings.vat_rate} onChange={(e) => onChange({ vat_rate: Number(e.target.value) })}>
              <option value={7}>{r.vat7}</option>
              <option value={0}>{r.vat0}</option>
            </select>
          </div>
          <div>
            <FieldLabel>{r.labelTaxLabel}</FieldLabel>
            <input className={inputCls} value={settings.tax_label} onChange={(e) => onChange({ tax_label: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>{r.sectionLogo}</SectionTitle>
          <Toggle checked={settings.show_logo} onChange={(v) => onChange({ show_logo: v })} />
        </div>
        <div className={`space-y-3 ${!settings.show_logo ? "pointer-events-none opacity-40" : ""}`}>
          {/* TODO: wire logo upload (file picker + upload service) then re-enable. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {r.changeLogo}
            </button>
            <span className="text-xs font-medium text-amber-600">{r.changeLogoComingSoon}</span>
          </div>
          <div>
            <FieldLabel>{r.labelLogoPosition}</FieldLabel>
            <select className={selectCls} value={settings.logo_position} onChange={(e) => onChange({ logo_position: e.target.value as ReceiptPaymentSettingsLogoPosition })}>
              <option value="top_center">{r.logoCenter}</option>
              <option value="top_left">{r.logoLeft}</option>
              <option value="top_right">{r.logoRight}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionStoreInfo}</SectionTitle>
        <div className="space-y-3">
          {storeInfoFields.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <Toggle checked={settings[key] as boolean} onChange={(v) => onChange({ [key]: v })} />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionAmountRounding}</SectionTitle>
        <label className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-slate-700">{r.labelRoundAmount}</span>
            <span className="ml-1.5 text-xs text-slate-400">{r.roundAmountHint}</span>
          </div>
          <Toggle checked={settings.round_amount} onChange={(v) => onChange({ round_amount: v })} />
        </label>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{r.sectionFooter}</SectionTitle>
        <textarea className={`${inputCls} resize-none`} rows={5} maxLength={300}
          value={settings.footer_text} onChange={(e) => onChange({ footer_text: e.target.value })} />
        <p className="mt-1 text-right text-xs text-slate-400">{settings.footer_text.length} / 300</p>
      </div>
    </div>
  );
}

function PaymentTab({ channels, onChange, t }: { channels: ReceiptPaymentSettingsPaymentChannel[]; onChange: (key: string, enabled: boolean) => void; t: ReceiptPaymentSettingsT }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{t.payment.sectionChannels}</SectionTitle>
        <p className="mb-4 text-xs text-slate-500">{t.payment.channelsHint}</p>
        <div className="space-y-1">
          {channels.map((ch) => (
            <div
              key={ch.key}
              className={`flex items-center gap-3 rounded-xl px-4 py-4 transition ${ch.enabled ? "bg-violet-50/60" : "bg-slate-50"}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${ch.color}`}>
                {ch.icon}
              </span>
              <span className={`flex-1 text-sm font-medium ${ch.enabled ? "text-slate-800" : "text-slate-400"}`}>{ch.name}</span>
              <Toggle checked={ch.enabled} onChange={(v) => onChange(ch.key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromptPayTab({ settings, store, onChange, t }: { settings: ReceiptSettingsData; store: StoreType | null; onChange: (p: Partial<ReceiptSettingsData>) => void; t: ReceiptPaymentSettingsT }) {
  const p = t.promptpay;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{p.sectionInfo}</SectionTitle>
        <div className="space-y-4">
          <div>
            <FieldLabel>{p.labelNumber}</FieldLabel>
            <input className={inputCls} value={store?.promptpay_id ?? ""} readOnly placeholder={p.numberPlaceholder} />
            <p className="mt-1 text-xs text-slate-400">{p.editHint} <Link href="../" className="text-violet-600 hover:underline">{p.editLink}</Link></p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>{p.sectionQr}</SectionTitle>
          <Toggle checked={settings.show_qr && !!store?.promptpay_id} onChange={(v) => !store?.promptpay_id ? undefined : onChange({ show_qr: v })} />
        </div>
        {!store?.promptpay_id && <p className="mb-3 text-xs text-amber-600">{p.qrNoPromptPay}</p>}
        <div className={`space-y-3 ${(!settings.show_qr || !store?.promptpay_id) ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <FieldLabel>{p.labelQrSize}</FieldLabel>
            <select className={selectCls} value={settings.qr_size} onChange={(e) => onChange({ qr_size: e.target.value as ReceiptSettingsData["qr_size"] })}>
              <option value="small">{p.qrSmall}</option>
              <option value="medium">{p.qrMedium}</option>
              <option value="large">{p.qrLarge}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrinterTab({ settings, onChange, t }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void; t: ReceiptPaymentSettingsT }) {
  const p = t.printer;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{p.sectionPrinter}</SectionTitle>
        <div className="space-y-4">
          <div>
            <FieldLabel>{p.labelType}</FieldLabel>
            <select className={selectCls} value={settings.printer_type} onChange={(e) => onChange({ printer_type: e.target.value as ReceiptSettingsData["printer_type"] })}>
              <option value="thermal">{p.typeThermal}</option>
              <option value="inkjet">{p.typeInkjet}</option>
              <option value="pdf">{p.typePdf}</option>
            </select>
          </div>
          <div>
            <FieldLabel>{p.labelName}</FieldLabel>
            <input className={inputCls} value={settings.printer_name} onChange={(e) => onChange({ printer_name: e.target.value })} placeholder={p.namePlaceholder} />
          </div>
          <div className="flex items-center justify-between">
            <FieldLabel>{p.labelAutoPrint}</FieldLabel>
            <Toggle checked={settings.auto_print} onChange={(v) => onChange({ auto_print: v })} />
          </div>
          <div>
            <FieldLabel>{p.labelCopies}</FieldLabel>
            <input type="number" min={1} max={5} className={inputCls} value={settings.copies} onChange={(e) => onChange({ copies: Math.min(5, Math.max(1, Number(e.target.value))) })} />
          </div>
        </div>
      </div>
      {/* TODO: wire test-print (call print/preview service) then re-enable. */}
      <button
        type="button"
        disabled
        className="w-full rounded-xl border border-violet-200 bg-white py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Printer className="mr-2 inline h-4 w-4" />{p.testPrint}
        <span className="ml-2 text-xs font-medium text-amber-600">{p.testPrintComingSoon}</span>
      </button>
    </div>
  );
}

function BankAccountsTab({ storeId, t, canManage }: { storeId: string; t: ReceiptPaymentSettingsT; canManage: boolean }) {
  const p = t.bankAccounts;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ bank_name: "", account_no: "", account_name: "" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts", storeId],
    queryFn: () => listBankAccounts(storeId).then((r) => r.data ?? []),
    enabled: !!storeId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bank-accounts", storeId] });

  const createMut = useMutation({
    mutationFn: (inp: CreateBankAccountInput) => createBankAccount(storeId, inp),
    onSuccess: () => { invalidate(); setShowForm(false); setForm({ bank_name: "", account_no: "", account_name: "" }); },
    onError: () => toast.error("เพิ่มบัญชีไม่สำเร็จ"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...inp }: { id: string } & UpdateBankAccountInput) =>
      updateBankAccount(storeId, id, inp),
    onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); },
    onError: () => toast.error("แก้ไขบัญชีไม่สำเร็จ"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBankAccount(storeId, id),
    onSuccess: invalidate,
    onError: () => toast.error("ลบบัญชีไม่สำเร็จ"),
  });

  function openAdd() {
    setEditingId(null);
    setForm({ bank_name: "", account_no: "", account_name: "" });
    setShowForm(true);
  }

  function openEdit(acc: StoreBankAccount) {
    setEditingId(acc.id);
    setForm({ bank_name: acc.bank_name, account_no: acc.account_no, account_name: acc.account_name });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ bank_name: "", account_no: "", account_name: "" });
  }

  function handleSubmit() {
    if (!form.bank_name.trim() || !form.account_no.trim() || !form.account_name.trim()) return;
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <SectionTitle>{p.sectionTitle}</SectionTitle>
            <p className="mt-1 text-sm text-slate-500">{p.hint}</p>
          </div>
          {canManage && !showForm && (
            <button
              type="button"
              onClick={openAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />{p.addButton}
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonSettingsPanel rows={3} />
        ) : accounts.length === 0 && !showForm ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 py-10 text-center">
            <Banknote className="h-8 w-8 text-violet-300" />
            <p className="text-sm font-semibold text-slate-600">{p.emptyState}</p>
            <p className="text-xs text-slate-400">{p.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  acc.is_default
                    ? "border-violet-300 bg-violet-50"
                    : acc.is_active
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{acc.bank_name}</span>
                    {acc.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        <Star className="h-2.5 w-2.5" />{p.defaultLabel}
                      </span>
                    )}
                    {!acc.is_active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">ปิดใช้งาน</span>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">{acc.account_no}</span>
                  <span className="text-xs text-slate-500">{acc.account_name}</span>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-violet-50">
                      <input
                        type="checkbox"
                        checked={acc.is_default}
                        disabled={updateMut.isPending || !acc.is_active || acc.is_default}
                        onChange={() => updateMut.mutate({ id: acc.id, is_default: true })}
                        className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                      />
                      <span>{p.primaryLabel}</span>
                    </label>
                    <button
                      type="button"
                      title={acc.is_active ? "ปิดใช้งาน" : p.activeLabel}
                      onClick={() => updateMut.mutate({ id: acc.id, is_active: !acc.is_active })}
                      disabled={updateMut.isPending}
                      className={`rounded-lg p-1.5 transition disabled:opacity-40 ${
                        acc.is_active
                          ? "text-emerald-500 hover:bg-emerald-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={t.save}
                      onClick={() => openEdit(acc)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={p.deleteButton}
                      onClick={() => { if (confirm("ต้องการลบบัญชีนี้?")) deleteMut.mutate(acc.id); }}
                      disabled={deleteMut.isPending}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && canManage && (
          <div className="mt-4 space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{p.bankNameLabel}</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder={p.bankNamePlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{p.accountNoLabel}</label>
                <input
                  type="text"
                  value={form.account_no}
                  onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))}
                  placeholder={p.accountNoPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{p.accountNameLabel}</label>
                <input
                  type="text"
                  value={form.account_name}
                  onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  placeholder={p.accountNamePlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !form.bank_name.trim() || !form.account_no.trim() || !form.account_name.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {p.saveButton}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
              >
                {p.cancelButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayTab({ settings, onChange, t }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void; t: ReceiptPaymentSettingsT }) {
  const d = t.display;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>{d.sectionDisplay}</SectionTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FieldLabel>{d.labelCustomerDisplay}</FieldLabel>
            <Toggle checked={settings.show_customer_display} onChange={(v) => onChange({ show_customer_display: v })} />
          </div>
          <div className="flex items-center justify-between">
            <FieldLabel>{d.labelShowProductImages}</FieldLabel>
            <Toggle checked={settings.show_product_images} onChange={(v) => onChange({ show_product_images: v })} />
          </div>
          <div>
            <FieldLabel>{d.labelDateFormat}</FieldLabel>
            <select className={selectCls} value={settings.date_format} onChange={(e) => onChange({ date_format: e.target.value })}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <FieldLabel>{d.labelTimeFormat}</FieldLabel>
            <select className={selectCls} value={settings.time_format} onChange={(e) => onChange({ time_format: e.target.value as ReceiptSettingsData["time_format"] })}>
              <option value="24h">{d.time24h}</option>
              <option value="12h">{d.time12h}</option>
            </select>
          </div>
          <div>
            <FieldLabel>{d.labelCurrencyPosition}</FieldLabel>
            <select className={selectCls} value={settings.currency_position} onChange={(e) => onChange({ currency_position: e.target.value as ReceiptSettingsData["currency_position"] })}>
              <option value="before">{d.currencyBefore}</option>
              <option value="after">{d.currencyAfter}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gateway tab ───────────────────────────────────────────────────────────────


const GATEWAY_DEFAULT: ReceiptPaymentSettingsGatewayConfig = {
  provider: "none",
  omise: { public_key: "", secret_key: "", webhook_secret: "" },
  c2p: { merchant_id: "", secret_key: "" },
};

function WebhookUrlField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">Webhook URL <span className="text-slate-400">(ใส่ใน dashboard ของ gateway / ธนาคาร)</span></label>
      <div className="flex gap-2">
        <input readOnly value={url} className={`${inputCls} flex-1 bg-slate-50 font-mono text-xs text-slate-500`} />
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "คัดลอก" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function GatewayTab({ storeId }: { storeId: string }) {
  const [config, setConfig] = useState<ReceiptPaymentSettingsGatewayConfig>(GATEWAY_DEFAULT);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/payment`;

  function toggleSecret(k: string) { setShowSecrets(p => ({ ...p, [k]: !p[k] })); }

  // B27: the gateway is not connected to the backend. Never claim a save, and
  // never keep gateway secrets in browser storage — purge any earlier copy.
  useEffect(() => {
    try {
      localStorage.removeItem(`pos_gateway_${storeId}`);
    } catch {
      /* storage unavailable */
    }
  }, [storeId]);
  const saved = false;

  const PROVIDERS = [
    { key: "none" as ReceiptPaymentSettingsGatewayProvider,  label: "ไม่ใช้ Gateway", desc: "ยืนยันด้วยตนเองผ่านมือถือ",           badge: "bg-slate-500" },
    { key: "omise" as ReceiptPaymentSettingsGatewayProvider, label: "Omise",           desc: "แนะนำ · รองรับทุกธนาคารไทย",        badge: "bg-blue-600"  },
    { key: "2c2p" as ReceiptPaymentSettingsGatewayProvider,  label: "2C2P",            desc: "Payment gateway ยอดนิยมในไทย",      badge: "bg-rose-500"  },
  ];

  return (
    <div className="space-y-5">
      {/* Coming-soon banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">{unavailableText("unavailableTitle")}</p>
          <p className="mt-0.5 text-amber-700">{unavailableText("gatewayUnavailableBody")}</p>
        </div>
      </div>
      <fieldset disabled className="space-y-5 opacity-60">

      {/* Provider selector */}
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-slate-700">เลือก Payment Gateway</p>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, provider: p.key }))}
              className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${config.provider === p.key ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-violet-300"}`}
            >
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${p.badge}`}>{p.label}</span>
              <span className="text-xs text-slate-500">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Omise credentials */}
      {config.provider === "omise" && (
        <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-700">Omise — API Credentials</p>
            <p className="mt-0.5 text-xs text-slate-400">รับ key จาก <span className="font-mono text-violet-600">dashboard.omise.co → Settings → Keys</span></p>
          </div>
          {([
            ["public_key",      "Public Key",      "pkey_test_..."],
            ["secret_key",      "Secret Key",      "skey_test_..."],
            ["webhook_secret",  "Webhook Secret",  "whsec_..."],
          ] as [keyof typeof config.omise, string, string][]).map(([field, label, ph]) => (
            <div key={field}>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
              <div className="relative">
                <input
                  type={showSecrets[field] ? "text" : "password"}
                  value={config.omise[field]}
                  onChange={e => setConfig(p => ({ ...p, omise: { ...p.omise, [field]: e.target.value } }))}
                  placeholder={ph}
                  className={`${inputCls} pr-10 font-mono text-xs`}
                />
                <button type="button" onClick={() => toggleSecret(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <WebhookUrlField url={webhookUrl} />
        </div>
      )}

      {/* 2C2P credentials */}
      {config.provider === "2c2p" && (
        <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-700">2C2P — Merchant Credentials</p>
            <p className="mt-0.5 text-xs text-slate-400">รับข้อมูลจาก <span className="font-mono text-violet-600">2C2P Merchant Portal → API Integration</span></p>
          </div>
          {([
            ["merchant_id", "Merchant ID",  "764XXXXXXX"],
            ["secret_key",  "Secret Key",   "xxxxxxxxxxxxxxxx"],
          ] as [keyof typeof config.c2p, string, string][]).map(([field, label, ph]) => (
            <div key={field}>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
              <div className="relative">
                <input
                  type={showSecrets[field] ? "text" : "password"}
                  value={config.c2p[field]}
                  onChange={e => setConfig(p => ({ ...p, c2p: { ...p.c2p, [field]: e.target.value } }))}
                  placeholder={ph}
                  className={`${inputCls} pr-10 font-mono text-xs`}
                />
                <button type="button" onClick={() => toggleSecret(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <WebhookUrlField url={webhookUrl} />
        </div>
      )}

      {/* None */}
      {config.provider === "none" && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
          แคชเชียร์ตรวจสอบยอดชำระเงินผ่านมือถือแล้วกด <strong className="text-slate-700">ตกลง</strong> เอง — เหมาะกับร้านขนาดเล็กที่รับ PromptPay แบบ manual
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" title={unavailableText("unavailableTitle")} className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "บันทึกแล้ว" : "บันทึก"}
        </button>
      </div>
      </fieldset>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ReceiptPaymentSettings({ t }: { t: ReceiptPaymentSettingsT }) {
  const queryClient = useQueryClient();
  const { role } = useStoreRole();
  const canManage = canManageStore(role);
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    setStoreId(getCurrentStoreId() ?? "");
  }, []);

  // ── Server state ──────────────────────────────────────────────────────────
  const { data: remoteSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["receipt-settings", storeId],
    queryFn: async () => {
      const res = await getReceiptSettings();
      return res.data;
    },
    enabled: !!storeId,
  });

  const { data: storeData } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const res = await getStoreById(storeId);
      return res.data;
    },
    enabled: !!storeId,
  });

  const saveMutation = useMutation({
    mutationFn: (input: UpdateReceiptSettingsInput) => updateReceiptSettings(input),
    onSuccess: (res) => {
      queryClient.setQueryData(["receipt-settings", storeId], res.data);
      setLocalSettings(res.data);
      setIsDirty(false);
      toast.success(t.saveSuccess);
    },
    onError: () => {
      toast.error(t.save + " failed");
    },
  });

  // ── Local (draft) state ───────────────────────────────────────────────────
  const [localSettings, setLocalSettings] = useState<ReceiptSettingsData | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Live preview (iframe srcdoc) ─────────────────────────────────────────
  const [previewSrcdoc, setPreviewSrcdoc] = useState<string>("");
  const [previewError, setPreviewError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRequest = useRef(0);

  async function refreshPreview(settings: ReceiptSettingsData) {
    if (!storeId) return;
    const requestId = ++previewRequest.current;
    setPreviewError(false);
    try {
      const { id, store_id, created_at, updated_at, ...input } = settings;
      const html = await fetchReceiptPreviewHTML(input);
      if (requestId === previewRequest.current) {
        setPreviewSrcdoc(html);
        setPreviewError(!html);
      }
    } catch {
      if (requestId === previewRequest.current) {
        setPreviewError(true);
      }
    }
  }

  useEffect(() => () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewRequest.current += 1;
  }, []);

  // Hydrate local state once remote data arrives
  useEffect(() => {
    if (remoteSettings && !isDirty) {
      setLocalSettings(remoteSettings);
      refreshPreview(remoteSettings);
    }
  }, [remoteSettings, isDirty]);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ReceiptPaymentSettingsTabKey>("receipt");
  const TABS = makeTabs(t);

  function schedulePreview(next: ReceiptSettingsData) {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      previewTimer.current = null;
      void refreshPreview(next);
    }, 700);
  }

  function update(patch: Partial<ReceiptSettingsData>) {
    const next = localSettings ? { ...localSettings, ...patch } : null;
    setLocalSettings((s) => {
      return s ? { ...s, ...patch } : s;
    });
    if (next) schedulePreview(next);
    setIsDirty(true);
  }

  function updateChannel(key: string, enabled: boolean) {
    const next = localSettings
      ? {
          ...localSettings,
          payment_channels: localSettings.payment_channels.map((ch) =>
            ch.key === key ? { ...ch, enabled } : ch,
          ),
        }
      : null;
    setLocalSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        payment_channels: s.payment_channels.map((ch) =>
          ch.key === key ? { ...ch, enabled } : ch,
        ),
      };
    });
    if (next) schedulePreview(next);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!localSettings) return;
    const { id, store_id, created_at, updated_at, ...input } = localSettings;
    saveMutation.mutate(input);
  }

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!previewOpen) return;
    const dialog = previewDialogRef.current;
    if (!dialog) return;
    const trigger = previewButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [previewOpen]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (settingsLoading || !localSettings) {
    return (
      <div className="space-y-4">
        <SkeletonSettingsPanel rows={5} />
        <SkeletonSettingsPanel rows={3} />
      </div>
    );
  }

  const channels = toChannels(localSettings.payment_channels);

  const panelContent: Record<ReceiptPaymentSettingsTabKey, React.ReactNode> = {
    receipt:      <ReceiptTab      settings={localSettings} onChange={update}        t={t} />,
    payment:      <PaymentTab      channels={channels}       onChange={updateChannel} t={t} />,
    promptpay:    <PromptPayTab    settings={localSettings} store={storeData ?? null} onChange={update} t={t} />,
    bankAccounts: <BankAccountsTab storeId={storeId}         t={t}                   canManage={canManage} />,
    gateway:      <GatewayTab     storeId={storeId} />,
    printer:      <PrinterTab      settings={localSettings} onChange={update}        t={t} />,
    display:      <DisplayTab      settings={localSettings} onChange={update}        t={t} />,
  };

  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-violet-500">
          <Link href="../" className="hover:text-violet-700">{t.page.settingsLink}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">{t.page.title}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">{t.page.settingsLink}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t.page.title}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-500">{t.page.description}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label={t.page.sectionsLabel} className="space-y-2" role="tablist">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t.page.sectionsLabel}</p>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                id={`receipt-settings-tab-${tab.key}`}
                aria-controls="receipt-settings-panel"
                aria-selected={active}
                role="tab"
                type="button"
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(event) => {
                  const index = TABS.findIndex((item) => item.key === tab.key);
                  const next = event.key === "ArrowDown" || event.key === "ArrowRight"
                    ? TABS[(index + 1) % TABS.length]
                    : event.key === "ArrowUp" || event.key === "ArrowLeft"
                      ? TABS[(index - 1 + TABS.length) % TABS.length]
                      : event.key === "Home" ? TABS[0] : event.key === "End" ? TABS[TABS.length - 1] : null;
                  if (next) {
                    event.preventDefault();
                    setActiveTab(next.key);
                    document.getElementById(`receipt-settings-tab-${next.key}`)?.focus();
                  }
                }}
                tabIndex={active ? 0 : -1}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                  active
                    ? "border-violet-200 bg-white text-violet-700 shadow-[0_6px_20px_rgba(124,58,237,0.12)]"
                    : "border-violet-100 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/60"
                }`}
              >
                <span className={active ? "text-violet-600" : "text-violet-400"}>{tab.icon}</span>
                {tab.label}
                {active && <Check className="ml-auto h-4 w-4 text-violet-600" />}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-5">
          <section
            aria-labelledby={`receipt-settings-tab-${activeTab}`}
            className="min-w-0 rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_12px_40px_rgba(124,58,237,0.1)] sm:p-8"
            id="receipt-settings-panel"
            role="tabpanel"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4 text-violet-600">
              <div className="flex items-center gap-2">
                {TABS.find((tab) => tab.key === activeTab)?.icon}
                <h2 className="text-lg font-semibold text-slate-900">{TABS.find((tab) => tab.key === activeTab)?.label}</h2>
              </div>
              {activeTab === "receipt" && (
                <button
                  ref={previewButtonRef}
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  <Eye className="h-4 w-4" />
                  {t.page.previewButton}
                </button>
              )}
            </div>
            {panelContent[activeTab]}
          </section>

        </div>
      </div>

      {previewOpen && (
        <dialog
          ref={previewDialogRef}
          aria-label={t.previewLabel}
          onCancel={() => setPreviewOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
          className="fixed inset-0 m-auto h-[min(90dvh,760px)] w-[min(95vw,520px)] max-w-none overflow-hidden rounded-2xl border border-violet-100 bg-white p-0 shadow-xl backdrop:bg-slate-900/60"
        >
          <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">{t.previewLabel}</h2>
              <button
                type="button"
                aria-label={t.page.closePreview}
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-violet-50/40">
              <div className="mx-auto h-full w-full max-w-[360px] bg-white">
                {previewError ? (
                  <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">{t.page.previewError}</div>
                ) : previewSrcdoc ? (
                  <iframe srcDoc={previewSrcdoc} title={t.previewLabel} className="h-full w-full border-0" sandbox="" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></div>
                )}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
