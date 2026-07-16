"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  QrCode,
  Save,
  ShoppingBag,
  Upload,
  User,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { createSupplier, type Supplier } from "@/services/suppliers";
import { toast } from "@/components/ui/toast";

// ── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "promptpay" | "bank_account";
type CreditOption = 0 | 7 | 15 | 30 | 45 | "custom";

interface FormState {
  companyName: string;
  contactName: string;
  phone: string;
  lineId: string;
  email: string;
  taxId: string;
  logoFile: File | null;
  logoPreviewUrl: string;
  logoError: string;
  paymentMethod: PaymentMethod;
  promptpayNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  creditTerm: CreditOption;
  customDays: string;
  address: string;
  notes: string;
  isActive: boolean;
}

interface FormErrors {
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  promptpayNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  creditTerm?: string;
  customDays?: string;
}

export type AddSupplierDict = {
  createSupplier: string;
  contactPerson: string;
  supplierPhone: string;
  address: string;
  note: string;
  save: string;
  saving: string;
  cancel: string;
  successCreated: string;
  requestFailed: string;
  addSupplierModal: {
    subtitle: string;
    timeHint: string;
    activateNow: string;
    sectionContact: string;
    sectionAdditional: string;
    companyName: string;
    companyNamePlaceholder: string;
    contactNamePlaceholder: string;
    phonePlaceholder: string;
    lineId: string;
    lineIdPlaceholder: string;
    email: string;
    emailPlaceholder: string;
    taxId: string;
    taxIdPlaceholder: string;
    errTaxId: string;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const CREDIT_OPTIONS: CreditOption[] = [0, 7, 15, 30, 45, "custom"];

const THAI_BANKS = [
  { code: "SCB",   name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { code: "KBANK", name: "ธนาคารกสิกรไทย (KBANK)" },
  { code: "BBL",   name: "ธนาคารกรุงเทพ (BBL)" },
  { code: "KTB",   name: "ธนาคารกรุงไทย (KTB)" },
  { code: "BAY",   name: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { code: "TTB",   name: "ธนาคารทหารไทยธนชาต (TTB)" },
  { code: "GSB",   name: "ธนาคารออมสิน (GSB)" },
  { code: "KKP",   name: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { code: "LH",    name: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH)" },
];

const INITIAL_FORM: FormState = {
  companyName: "",
  contactName: "",
  phone: "",
  lineId: "",
  email: "",
  taxId: "",
  logoFile: null,
  logoPreviewUrl: "",
  logoError: "",
  paymentMethod: "promptpay",
  promptpayNumber: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  creditTerm: 30,
  customDays: "",
  address: "",
  notes: "",
  isActive: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidThaiPhone(v: string) {
  return /^0\d{9}$/.test(v);
}

function isValidPromptPay(v: string) {
  return /^\d{10}$/.test(v) || /^\d{13}$/.test(v);
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, suffix }: { icon: React.ReactNode; title: string; suffix?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          {icon}
        </span>
        <span className="text-sm font-bold text-slate-800">{title}</span>
        {suffix && <span className="text-xs italic text-slate-400">{suffix}</span>}
      </div>
      <div className="mt-2 h-px bg-slate-100" />
    </div>
  );
}

// ── Input wrapper helpers ─────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-600">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldError({ msg, id }: { msg?: string; id: string }) {
  if (!msg) return null;
  return (
    <p className="error-slide-in mt-1 text-xs text-red-500" id={id} role="alert">
      {msg}
    </p>
  );
}

const inputBase =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:ring-2 focus:ring-violet-100";
const inputNormal = `${inputBase} border-violet-200 focus:border-violet-400`;
const inputError  = `${inputBase} border-rose-300 bg-rose-50/70`;

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  dictionary: AddSupplierDict;
  onClose: () => void;
  onSuccess?: (supplier: Supplier) => void;
}

export function AddSupplierModal({ dictionary: dict, onClose, onSuccess }: Props) {
  const m = dict.addSupplierModal;
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const companyNameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Focus first field on open
  useEffect(() => {
    const t = setTimeout(() => companyNameRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showCancelConfirm) { setShowCancelConfirm(false); return; }
      handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  const isDirty = useMemo(() => {
    return (
      form.companyName !== "" ||
      form.contactName !== "" ||
      form.phone !== "" ||
      form.lineId !== "" ||
      form.email !== "" ||
      form.taxId !== "" ||
      form.logoFile !== null ||
      form.paymentMethod !== "promptpay" ||
      form.promptpayNumber !== "" ||
      form.bankName !== "" ||
      form.bankAccountNumber !== "" ||
      form.bankAccountName !== "" ||
      form.creditTerm !== 30 ||
      form.customDays !== "" ||
      form.address !== "" ||
      form.notes !== "" ||
      !form.isActive
    );
  }, [form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      triggerClose();
    }
  }

  function triggerClose() {
    setIsClosing(true);
  }

  function handleAnimationEnd() {
    if (isClosing) onClose();
  }

  // ── Logo ────────────────────────────────────────────────────────────────────

  function processFile(file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setForm((f) => ({ ...f, logoError: m.logoErrType }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setForm((f) => ({ ...f, logoError: m.logoErrSize }));
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, logoFile: file, logoPreviewUrl: url, logoError: "" }));
  }

  function handleFileDrop(files: FileList | null) {
    if (files && files.length > 0) processFile(files[0]);
  }

  function handleLogoRemove() {
    if (form.logoPreviewUrl) URL.revokeObjectURL(form.logoPreviewUrl);
    setForm((f) => ({ ...f, logoFile: null, logoPreviewUrl: "", logoError: "" }));
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (form.companyName.trim().length < 2) e.companyName = m.errCompanyName;
    if (form.contactName.trim().length < 2) e.contactName = m.errContactName;
    if (!isValidThaiPhone(form.phone)) e.phone = m.errPhone;
    if (form.email && !isValidEmail(form.email)) e.email = m.errEmail;
    if (form.taxId && form.taxId.length !== 13) e.taxId = m.errTaxId;
    if (form.paymentMethod === "promptpay") {
      if (!isValidPromptPay(form.promptpayNumber)) e.promptpayNumber = m.errPromptpay;
    } else {
      if (!form.bankName) e.bankName = m.errBankName;
      if (!/^\d{10,12}$/.test(form.bankAccountNumber)) e.bankAccountNumber = m.errBankAccountNumber;
      if (!form.bankAccountName.trim()) e.bankAccountName = m.errBankAccountName;
    }
    if (form.creditTerm === "custom") {
      const n = parseInt(form.customDays, 10);
      if (!form.customDays || isNaN(n) || n < 1 || n > 365) e.customDays = m.errCustomDays;
    }
    return e;
  }

  function scrollToFirstError(errs: FormErrors) {
    const keys = Object.keys(errs) as (keyof FormErrors)[];
    if (!keys.length) return;
    const el = bodyRef.current?.querySelector(`[aria-describedby="err-${keys[0]}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }
    setSaving(true);
    try {
      const creditDays =
        form.creditTerm === "custom" ? parseInt(form.customDays, 10) : form.creditTerm;
      const result = await createSupplier({
        name: form.companyName.trim(),
        contact_person: form.contactName.trim(),
        phone: form.phone,
        address: form.address.trim() || undefined,
        note: form.notes.trim() || undefined,
        is_active: form.isActive,
        line_id: form.lineId.trim() || undefined,
        email: form.email.trim() || undefined,
        payment_method: form.paymentMethod,
        promptpay_number: form.paymentMethod === "promptpay" ? form.promptpayNumber : undefined,
        bank_name: form.paymentMethod === "bank_account" ? form.bankName : undefined,
        bank_account_number: form.paymentMethod === "bank_account" ? form.bankAccountNumber : undefined,
        bank_account_name: form.paymentMethod === "bank_account" ? form.bankAccountName.trim() : undefined,
        tax_id: form.taxId.trim() || undefined,
        credit_days: creditDays,
        logo: form.logoFile ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`${dict.successCreated} — ${form.companyName.trim()}`);
      onSuccess?.(result.data!);
      triggerClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.requestFailed);
    } finally {
      setSaving(false);
    }
  }

  // ── Pill label ────────────────────────────────────────────────────────────────

  function creditLabel(c: CreditOption) {
    if (c === 0) return m.creditCash;
    if (c === "custom") return m.creditCustom;
    return `${c} ${m.creditSuffix}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/45 smooth-fade"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative flex w-full max-w-[780px] max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_56px_rgba(0,0,0,0.18)] will-change-transform ${isClosing ? "fade-out" : "smooth-fade-up"}`}
          onAnimationEnd={handleAnimationEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Accent bar */}
          <div className="h-1.5 shrink-0 bg-violet-600" />

          {/* ── Header ── */}
          <div className="flex shrink-0 items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-6 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-200/60">
              <ShoppingBag className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                {dict.createSupplier}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">{m.subtitle}</p>
              <p className="mt-0.5 text-xs text-slate-400">⏱ {m.timeHint}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">{m.activateNow}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => set("isActive", !form.isActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.isActive ? "bg-violet-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
              {/* ─ Left column: Contact ─ */}
              <div className="px-6 py-5 space-y-5">
                <div>
                  <SectionHeader icon={<User className="h-4 w-4" />} title={m.sectionContact} />
                  <div className="space-y-3">
                    {/* Row 1: Company Name + Contact Person */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel required>{m.companyName}</FieldLabel>
                        <input
                          ref={companyNameRef}
                          type="text"
                          maxLength={200}
                          placeholder={m.companyNamePlaceholder}
                          value={form.companyName}
                          onChange={(e) => set("companyName", e.target.value)}
                          aria-describedby="err-companyName"
                          className={errors.companyName ? inputError : inputNormal}
                        />
                        <FieldError msg={errors.companyName} id="err-companyName" />
                      </div>
                      <div>
                        <FieldLabel required>{dict.contactPerson}</FieldLabel>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder={m.contactNamePlaceholder}
                          value={form.contactName}
                          onChange={(e) => set("contactName", e.target.value)}
                          aria-describedby="err-contactName"
                          className={errors.contactName ? inputError : inputNormal}
                        />
                        <FieldError msg={errors.contactName} id="err-contactName" />
                      </div>
                    </div>

                    {/* Row 2: Phone + LINE ID */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel required>{dict.supplierPhone}</FieldLabel>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder={m.phonePlaceholder}
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                            aria-describedby="err-phone"
                            className={`${errors.phone ? inputError : inputNormal} pl-9`}
                          />
                        </div>
                        <FieldError msg={errors.phone} id="err-phone" />
                      </div>
                      <div>
                        <FieldLabel>{m.lineId}</FieldLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#00B900] font-bold text-xs">LINE</span>
                          <input
                            type="text"
                            maxLength={50}
                            placeholder={m.lineIdPlaceholder}
                            value={form.lineId}
                            onChange={(e) => set("lineId", e.target.value)}
                            className={`${inputNormal} pl-11`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Email + Tax ID */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>{m.email}</FieldLabel>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            placeholder={m.emailPlaceholder}
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            aria-describedby="err-email"
                            className={`${errors.email ? inputError : inputNormal} pl-9`}
                          />
                        </div>
                        <FieldError msg={errors.email} id="err-email" />
                      </div>
                      <div>
                        <FieldLabel>{m.taxId}</FieldLabel>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={13}
                          placeholder={m.taxIdPlaceholder}
                          value={form.taxId}
                          onChange={(e) => set("taxId", e.target.value.replace(/\D/g, "").slice(0, 13))}
                          aria-describedby="err-taxId"
                          className={errors.taxId ? inputError : inputNormal}
                        />
                        <FieldError msg={errors.taxId} id="err-taxId" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Right column: Financial + Address ─ */}
              <div className="px-6 py-5 space-y-5">
                <div>
                  <SectionHeader icon={<CreditCard className="h-4 w-4" />} title={m.sectionFinancial} />
                  <div className="space-y-4">
                    {/* Payment method toggle */}
                    <div>
                      <FieldLabel required>{m.paymentMethodLabel}</FieldLabel>
                      <div className="flex gap-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {(["promptpay", "bank_account"] as PaymentMethod[]).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => set("paymentMethod", method)}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                              form.paymentMethod === method
                                ? "bg-violet-600 text-white shadow"
                                : "text-slate-600 hover:bg-white hover:text-violet-700"
                            }`}
                          >
                            {method === "promptpay" ? <QrCode className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            {method === "promptpay" ? m.promptpay : m.bankAccount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional payment fields */}
                    <div key={form.paymentMethod} className="field-slide-in">
                      {form.paymentMethod === "promptpay" ? (
                        <div>
                          <FieldLabel required>{m.promptpayNumber}</FieldLabel>
                          <input
                            type="text"
                            maxLength={13}
                            placeholder={m.promptpayNumberPlaceholder}
                            value={form.promptpayNumber}
                            onChange={(e) => set("promptpayNumber", e.target.value.replace(/\D/g, "").slice(0, 13))}
                            aria-describedby="err-promptpayNumber"
                            className={errors.promptpayNumber ? inputError : inputNormal}
                          />
                          <p className="mt-1 text-xs text-slate-400">{m.promptpayHint}</p>
                          <FieldError msg={errors.promptpayNumber} id="err-promptpayNumber" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <FieldLabel required>{m.bankNameLabel}</FieldLabel>
                            <select
                              value={form.bankName}
                              onChange={(e) => set("bankName", e.target.value)}
                              aria-describedby="err-bankName"
                              className={`${errors.bankName ? inputError : inputNormal} appearance-none`}
                            >
                              <option value="">{m.selectBankPlaceholder}</option>
                              {THAI_BANKS.map((b) => (
                                <option key={b.code} value={b.code}>{b.name}</option>
                              ))}
                            </select>
                            <FieldError msg={errors.bankName} id="err-bankName" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel required>{m.bankAccountNumber}</FieldLabel>
                              <input
                                type="text"
                                maxLength={12}
                                placeholder={m.bankAccountNumberPlaceholder}
                                value={form.bankAccountNumber}
                                onChange={(e) => set("bankAccountNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
                                aria-describedby="err-bankAccountNumber"
                                className={errors.bankAccountNumber ? inputError : inputNormal}
                              />
                              <FieldError msg={errors.bankAccountNumber} id="err-bankAccountNumber" />
                            </div>
                            <div>
                              <FieldLabel required>{m.bankAccountName}</FieldLabel>
                              <input
                                type="text"
                                placeholder={m.bankAccountNamePlaceholder}
                                value={form.bankAccountName}
                                onChange={(e) => set("bankAccountName", e.target.value)}
                                aria-describedby="err-bankAccountName"
                                className={errors.bankAccountName ? inputError : inputNormal}
                              />
                              <FieldError msg={errors.bankAccountName} id="err-bankAccountName" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Credit term pills */}
                    <div>
                      <FieldLabel required>{m.creditTerm}</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {CREDIT_OPTIONS.map((c) => (
                          <button
                            key={String(c)}
                            type="button"
                            onClick={() => set("creditTerm", c)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                              form.creditTerm === c
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-violet-300 bg-white text-violet-600 hover:bg-violet-50"
                            }`}
                          >
                            {creditLabel(c)}
                          </button>
                        ))}
                      </div>
                      {form.creditTerm === "custom" && (
                        <div className="field-slide-in mt-3">
                          <FieldLabel>{m.creditCustomLabel}</FieldLabel>
                          <div className="relative">
                            <input
                              type="number"
                              min={1}
                              max={365}
                              placeholder={m.creditCustomPlaceholder}
                              value={form.customDays}
                              onChange={(e) => set("customDays", e.target.value)}
                              aria-describedby="err-customDays"
                              className={`${errors.customDays ? inputError : inputNormal} pr-12`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              {m.creditSuffix}
                            </span>
                          </div>
                          <FieldError msg={errors.customDays} id="err-customDays" />
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <FieldLabel>{dict.address}</FieldLabel>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <textarea
                          rows={5}
                          maxLength={500}
                          placeholder={m.addressPlaceholder}
                          value={form.address}
                          onChange={(e) => set("address", e.target.value)}
                          className={`${inputNormal} resize-none pl-9`}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-xs text-slate-400">
                        {form.address.length}/500
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─ Bottom: Additional Information (Logo + Notes) ─ */}
            <div className="border-t border-slate-100 px-6 py-5">
              <SectionHeader icon={<Upload className="h-4 w-4" />} title={m.sectionAdditional} />
              <div className="grid grid-cols-2 gap-6">
                {/* Logo upload */}
                <div>
                  <FieldLabel>{m.sectionLogo} <span className="font-normal text-slate-400">{m.logoOptional}</span></FieldLabel>
                  {form.logoPreviewUrl ? (
                    <div className="field-slide-in flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
                      <img
                        src={form.logoPreviewUrl}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-slate-100 object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {form.logoFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="mt-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                          {m.logoRemove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => handleFileDrop(e.target.files)}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files); }}
                        className={`relative flex h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                          dragOver
                            ? "border-violet-500 bg-violet-50"
                            : form.logoError
                            ? "border-red-400 bg-red-50"
                            : "border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/30"
                        }`}
                      >
                        <Upload className="h-6 w-6 text-slate-400" />
                        <p className="text-xs font-medium text-slate-600">{m.logoUploadText}</p>
                        <p className="text-xs text-slate-400">{m.logoUploadHint}</p>
                        <div className="pointer-events-none absolute bottom-2 right-3 flex gap-1 opacity-10">
                          <Building2 className="h-8 w-8 text-slate-500" />
                        </div>
                      </div>
                      {form.logoError && (
                        <p className="error-slide-in mt-1 text-xs text-red-500">{form.logoError}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <FieldLabel>{dict.note}</FieldLabel>
                  <div className="relative">
                    <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea
                      rows={5}
                      maxLength={300}
                      placeholder={m.notesPlaceholder}
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      className={`${inputNormal} resize-none pl-9`}
                    />
                  </div>
                  <p className="mt-0.5 text-right text-xs text-slate-400">
                    {form.notes.length}/300
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-gradient-to-r from-violet-50/40 to-white px-6 py-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {dict.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/60 transition-all hover:bg-violet-700 hover:shadow-lg disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {dict.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {m.saveSupplier}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Cancel confirmation dialog ── */}
      {showCancelConfirm && (
        <>
          <div className="fixed inset-0 z-60 bg-black/20 smooth-fade" />
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="smooth-fade-up mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{m.cancelConfirmTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">{m.cancelConfirmBody}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {m.backToForm}
                </button>
                <button
                  type="button"
                  onClick={triggerClose}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  {m.confirmCancel}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
