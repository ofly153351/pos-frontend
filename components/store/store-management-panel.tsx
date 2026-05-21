"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CreditCard,
  Image,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";

import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import { createStore, getStoreById, listMyStores, updateStoreById } from "@/services/stores";
import type { Store } from "@/types/store";

type StoreManagementDictionary = {
  activeLabel: string;
  addStoreButton: string;
  addressLabel: string;
  basicInfoSection: string;
  contactSection: string;
  createStoreTitle: string;
  createSubmit: string;
  createSuccess: string;
  creating: string;
  currencyLabel: string;
  emptyStores: string;
  errorFallback: string;
  locationSection: string;
  logoLabel: string;
  logoPreviewLabel: string;
  logoSection: string;
  nameLabel: string;
  nameRequired: string;
  noLogoLabel: string;
  pageDescription: string;
  pageTitle: string;
  switchSectionTitle: string;
  paymentSection: string;
  phoneLabel: string;
  planLabel: string;
  plans: { growth: string; pro: string; starter: string };
  promptPayLabel: string;
  selectStoreLabel: string;
  storeListTitle: string;
  switchStoreAction: string;
  switchStoreHint: string;
  switchedSuccess: string;
  updateStoreTitle: string;
  updateSubmit: string;
  updateSuccess: string;
  updating: string;
};

type Props = { dictionary: StoreManagementDictionary };

const availablePlanCodes = ["starter", "growth", "pro"] as const;

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ST";
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function StoreAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";
  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-white/30 bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center font-bold text-white shadow-sm`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-full w-full object-cover" src={logoUrl} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-violet-500">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <div className="ml-2 h-px flex-1 bg-slate-100" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100";

export function StoreManagementPanel({ dictionary }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [hasMounted, setHasMounted] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState("");   // store currently in use
  const [selectedStoreId, setSelectedStoreId] = useState(""); // store selected in the list
  const [currentStore, setCurrentStore] = useState<Store | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPromptPayId, setEditPromptPayId] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCurrencyCode, setEditCurrencyCode] = useState("THB");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreviewUrl, setEditLogoPreviewUrl] = useState("");
  const [isEditLogoLoading, setIsEditLogoLoading] = useState(false);

  // Create fields
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPromptPayId, setCreatePromptPayId] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createCurrencyCode, setCreateCurrencyCode] = useState("THB");
  const [createPlanCode, setCreatePlanCode] = useState<(typeof availablePlanCodes)[number]>("starter");
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoPreviewUrl, setCreateLogoPreviewUrl] = useState("");
  const [isCreateLogoLoading, setIsCreateLogoLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isSwitchPending, startSwitchTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();

  const createModalRef = useRef<HTMLDivElement>(null);

  // ── mount ──
  useEffect(() => { setHasMounted(true); }, []);

  // ── Escape key for create modal ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setIsCreateModalOpen(false); }
    if (isCreateModalOpen) { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }
  }, [isCreateModalOpen]);
  useEffect(() => { if (isCreateModalOpen) createModalRef.current?.focus(); }, [isCreateModalOpen]);

  // ── Edit logo preview ──
  useEffect(() => {
    if (!editLogoFile) { setEditLogoPreviewUrl(currentStore?.logo_url ?? ""); setIsEditLogoLoading(false); return; }
    let active = true;
    const reader = new FileReader();
    setIsEditLogoLoading(true);
    reader.onload = () => { if (active) { setEditLogoPreviewUrl(typeof reader.result === "string" ? reader.result : ""); setIsEditLogoLoading(false); } };
    reader.onerror = () => { if (active) { setEditLogoPreviewUrl(""); setIsEditLogoLoading(false); } };
    reader.readAsDataURL(editLogoFile);
    return () => { active = false; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [currentStore?.logo_url, editLogoFile]);

  // ── Create logo preview ──
  useEffect(() => {
    if (!createLogoFile) { setCreateLogoPreviewUrl(""); setIsCreateLogoLoading(false); return; }
    let active = true;
    const reader = new FileReader();
    setIsCreateLogoLoading(true);
    reader.onload = () => { if (active) { setCreateLogoPreviewUrl(typeof reader.result === "string" ? reader.result : ""); setIsCreateLogoLoading(false); } };
    reader.onerror = () => { if (active) { setCreateLogoPreviewUrl(""); setIsCreateLogoLoading(false); } };
    reader.readAsDataURL(createLogoFile);
    return () => { active = false; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [createLogoFile]);

  // ── Load stores ──
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await listMyStores();
        const myStores = res.data ?? [];
        if (!active) return;
        setStores(myStores);
        const session = getAuthSession();
        const preferred = getCurrentStoreId() || session?.store_id || myStores[0]?.id || "";
        setActiveStoreId(preferred);
        if (!preferred) return;
        selectStore(preferred, myStores);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : dictionary.errorFallback);
      }
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictionary.errorFallback]);

  function selectStore(id: string, storeList: Store[] = stores) {
    setSelectedStoreId(id);
    const store = storeList.find((s) => s.id === id) ?? null;
    if (store) {
      setCurrentStore(store);
      populateEditFields(store);
    } else {
      getStoreById(id).then((res) => {
        setCurrentStore(res.data);
        populateEditFields(res.data);
      }).catch(() => {});
    }
    setEditLogoFile(null);
    setError("");
    setSuccess("");
  }

  function populateEditFields(store: Store) {
    setEditName(store.name ?? "");
    setEditPhone(store.phone ?? "");
    setEditPromptPayId(store.promptpay_id ?? "");
    setEditAddress(store.address ?? "");
    setEditCurrencyCode(store.currency_code ?? "THB");
  }

  function switchStore() {
    if (!selectedStoreId) return;
    startSwitchTransition(() => {
      saveCurrentStoreId(selectedStoreId);
      setActiveStoreId(selectedStoreId);
      setSuccess(dictionary.switchedSuccess);
      router.refresh();
      window.location.assign(pathname);
    });
  }

  function handleUpdateStore(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!selectedStoreId) { setError(dictionary.emptyStores); return; }
    if (!editName.trim()) { setError(dictionary.nameRequired); return; }
    startUpdateTransition(async () => {
      try {
        const res = await updateStoreById(selectedStoreId, {
          address: editAddress, currency_code: editCurrencyCode,
          logo: editLogoFile, name: editName,
          phone: editPhone, promptpay_id: editPromptPayId.trim(),
        });
        const updated = res.data;
        setCurrentStore(updated);
        setStores((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
        setEditLogoFile(null);
        setSuccess(dictionary.updateSuccess);
      } catch (e) {
        setError(e instanceof Error ? e.message : dictionary.errorFallback);
      }
    });
  }

  function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!createName.trim()) { setError(dictionary.nameRequired); return; }
    startCreateTransition(async () => {
      try {
        const res = await createStore({
          address: createAddress, currency_code: createCurrencyCode,
          logo: createLogoFile, name: createName,
          phone: createPhone, promptpay_id: createPromptPayId.trim(),
          subscription_plan_code: createPlanCode,
        });
        const next = res.data;
        setStores((prev) => [...prev, next]);
        setCreateName(""); setCreatePhone(""); setCreatePromptPayId("");
        setCreateAddress(""); setCreateCurrencyCode("THB");
        setCreatePlanCode("starter"); setCreateLogoFile(null);
        selectStore(next.id, [...stores, next]);
        saveCurrentStoreId(next.id);
        setActiveStoreId(next.id);
        setIsCreateModalOpen(false);
        setSuccess(dictionary.createSuccess);
      } catch (e) {
        setError(e instanceof Error ? e.message : dictionary.errorFallback);
      }
    });
  }

  // ── Skeleton ──
  if (!hasMounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-28 rounded-[2rem] bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="h-64 rounded-[2rem] bg-slate-100" />
          <div className="h-64 rounded-[2rem] bg-slate-100" />
        </div>
      </div>
    );
  }

  const isActiveSelected = selectedStoreId === activeStoreId;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-purple-500 p-7 text-white shadow-[0_16px_48px_rgba(59,130,246,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">{dictionary.pageTitle}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{dictionary.switchSectionTitle}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/70">{dictionary.pageDescription}</p>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <X className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-rose-400 hover:text-rose-600" onClick={() => setError("")} type="button"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          <span>{success}</span>
          <button className="ml-auto text-emerald-400 hover:text-emerald-600" onClick={() => setSuccess("")} type="button"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── Main two-panel layout ── */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

        {/* ── Left: Store list ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{dictionary.storeListTitle}</span>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {dictionary.addStoreButton}
            </button>
          </div>

          {stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-400">
              {dictionary.emptyStores}
            </div>
          ) : (
            <div className="space-y-2">
              {stores.map((store) => {
                const isSelected = store.id === selectedStoreId;
                const isActive = store.id === activeStoreId;
                return (
                  <button
                    className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                      isSelected
                        ? "border-violet-300 bg-violet-600 shadow-[0_4px_16px_rgba(124,58,237,0.12)]"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                    key={store.id}
                    onClick={() => selectStore(store.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <StoreAvatar logoUrl={store.logo_url ?? undefined} name={store.name ?? ""} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isSelected ? "text-violet-900" : "text-slate-800"}`}>
                          {store.name}
                        </p>
                        {isActive && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {dictionary.activeLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-violet-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Switch active store */}
          {selectedStoreId && !isActiveSelected && (
            <button
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-600 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
              disabled={isSwitchPending}
              onClick={switchStore}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isSwitchPending ? "animate-spin" : ""}`} />
              {dictionary.switchStoreAction}
            </button>
          )}
          {selectedStoreId && !isActiveSelected && (
            <p className="px-1 text-[11px] text-slate-400">{dictionary.switchStoreHint}</p>
          )}
        </div>

        {/* ── Right: Edit form ── */}
        {currentStore ? (
          <form
            className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_12px_40px_rgba(59,130,246,0.08)] sm:p-8"
            onSubmit={handleUpdateStore}
          >
            {/* Store identity header */}
            <div className="mb-7 flex items-center gap-4">
              <div className="relative">
                <StoreAvatar logoUrl={editLogoPreviewUrl || currentStore.logo_url || undefined} name={editName} size="lg" />
                {isEditLogoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{editName || currentStore.name}</h2>
                <p className="text-sm text-slate-500">{dictionary.updateStoreTitle}</p>
              </div>
            </div>

            <div className="space-y-7">
              {/* Basic info */}
              <div>
                <SectionLabel icon={<Building2 className="h-3.5 w-3.5" />} label={dictionary.basicInfoSection} />
                <Field label={dictionary.nameLabel}>
                  <input className={inputCls} onChange={(e) => setEditName(e.target.value)} value={editName} />
                </Field>
              </div>

              {/* Contact */}
              <div>
                <SectionLabel icon={<Phone className="h-3.5 w-3.5" />} label={dictionary.contactSection} />
                <Field label={dictionary.phoneLabel}>
                  <input className={inputCls} onChange={(e) => setEditPhone(e.target.value)} type="tel" value={editPhone} />
                </Field>
              </div>

              {/* Payment */}
              <div>
                <SectionLabel icon={<CreditCard className="h-3.5 w-3.5" />} label={dictionary.paymentSection} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={dictionary.promptPayLabel}>
                    <input className={inputCls} onChange={(e) => setEditPromptPayId(e.target.value)} value={editPromptPayId} />
                  </Field>
                  <Field label={dictionary.currencyLabel}>
                    <input className={inputCls} maxLength={5} onChange={(e) => setEditCurrencyCode(e.target.value.toUpperCase())} value={editCurrencyCode} />
                  </Field>
                </div>
              </div>

              {/* Location */}
              <div>
                <SectionLabel icon={<MapPin className="h-3.5 w-3.5" />} label={dictionary.locationSection} />
                <Field label={dictionary.addressLabel}>
                  <textarea
                    className={`${inputCls} min-h-20 resize-none`}
                    onChange={(e) => setEditAddress(e.target.value)}
                    value={editAddress}
                  />
                </Field>
              </div>

              {/* Logo */}
              <div>
                <SectionLabel icon={<Image className="h-3.5 w-3.5" />} label={dictionary.logoSection} />
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {isEditLogoLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                    ) : editLogoPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={editName} className="h-full w-full object-cover" src={editLogoPreviewUrl} />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">{getInitials(editName)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block cursor-pointer rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-3 text-center text-sm text-violet-600 transition hover:bg-violet-100">
                      <span>{dictionary.logoLabel}</span>
                      <input
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                    {editLogoPreviewUrl && editLogoFile && (
                      <button
                        className="mt-1.5 w-full text-xs text-slate-400 hover:text-rose-500 transition"
                        onClick={() => setEditLogoFile(null)}
                        type="button"
                      >
                        {dictionary.noLogoLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="mt-8 flex items-center justify-end">
              <button
                className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                disabled={!selectedStoreId || isUpdatePending}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {isUpdatePending ? dictionary.updating : dictionary.updateSubmit}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-center rounded-[2rem] border border-dashed border-violet-200 bg-violet-50/40 p-12 text-center text-slate-400">
            <div>
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">{dictionary.selectStoreLabel}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Create store modal ── */}
      {isCreateModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(59,130,246,0.2)]"
              onClick={(e) => e.stopPropagation()}
              ref={createModalRef}
              tabIndex={-1}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-700 to-purple-500 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{dictionary.createStoreTitle}</h2>
                </div>
                <button
                  className="rounded-xl p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal body */}
              <form className="flex-1 overflow-y-auto px-6 py-5" onSubmit={handleCreateStore}>
                <div className="space-y-4">
                  <Field label={dictionary.nameLabel}>
                    <input className={inputCls} onChange={(e) => setCreateName(e.target.value)} placeholder={dictionary.nameLabel} value={createName} />
                  </Field>
                  <Field label={dictionary.planLabel}>
                    <select className={inputCls} onChange={(e) => setCreatePlanCode(e.target.value as typeof createPlanCode)} value={createPlanCode}>
                      {availablePlanCodes.map((p) => (
                        <option key={p} value={p}>{dictionary.plans[p]}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={dictionary.phoneLabel}>
                      <input className={inputCls} onChange={(e) => setCreatePhone(e.target.value)} type="tel" value={createPhone} />
                    </Field>
                    <Field label={dictionary.currencyLabel}>
                      <input className={inputCls} maxLength={5} onChange={(e) => setCreateCurrencyCode(e.target.value.toUpperCase())} value={createCurrencyCode} />
                    </Field>
                  </div>
                  <Field label={dictionary.promptPayLabel}>
                    <input className={inputCls} onChange={(e) => setCreatePromptPayId(e.target.value)} value={createPromptPayId} />
                  </Field>
                  <Field label={dictionary.addressLabel}>
                    <textarea className={`${inputCls} min-h-20 resize-none`} onChange={(e) => setCreateAddress(e.target.value)} value={createAddress} />
                  </Field>

                  {/* Logo upload */}
                  <Field label={dictionary.logoLabel}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {isCreateLogoLoading ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                        ) : createLogoPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={createName} className="h-full w-full object-cover" src={createLogoPreviewUrl} />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">{createName ? getInitials(createName) : "?"}</span>
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-4 py-2.5 text-center text-sm text-violet-600 transition hover:bg-violet-100">
                        {dictionary.logoLabel}
                        <input accept="image/*" className="sr-only" onChange={(e) => setCreateLogoFile(e.target.files?.[0] ?? null)} type="file" />
                      </label>
                    </div>
                  </Field>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setIsCreateModalOpen(false)}
                    type="button"
                  >
                    {/* cancel */}
                    ยกเลิก
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                    disabled={isCreatePending}
                    type="submit"
                  >
                    <Plus className="h-4 w-4" />
                    {isCreatePending ? dictionary.creating : dictionary.createSubmit}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
