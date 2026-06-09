"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Award, ChevronDown, CreditCard, Crown, FileText, Pencil, Plus, Search, Star, Trash2, Users, X } from "lucide-react";

import {
  createCustomer,
  deleteCustomer,
  deleteCustomerLevelDiscount,
  listCustomerLevelDiscounts,
  listCustomers,
  updateCustomer,
  upsertCustomerLevelDiscount,
} from "@/services/customers";
import { friendlyMessage } from "@/lib/form-errors";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";

type CustomerNetworkDictionary = {
  activeLabel: string;
  activeStatus: string;
  addPointsLabel: string;
  addressLabel: string;
  branchLabel: string;
  branchPlaceholder: string;
  cancelEdit: string;
  cancelLabel: string;
  closeLabel: string;
  createSubtitle: string;
  createTitle: string;
  createTitleNew: string;
  deleteConfirm: string;
  deleteLabel: string;
  deletedSuccess: string;
  discountPercentLabel: string;
  discountRuleTitle: string;
  editLabel: string;
  emailLabel: string;
  empty: string;
  filterAllLevels: string;
  fullNameLabel: string;
  fullNameRequired: string;
  inactiveStatus: string;
  invoiceLabel: string;
  kpiGold: string;
  kpiPlatinum: string;
  kpiPoints: string;
  kpiSilver: string;
  kpiTotal: string;
  levelGeneral: string;
  levelGold: string;
  levelLabel: string;
  levelPlatinum: string;
  levelRequired: string;
  levelSilver: string;
  levelVip: string;
  listTitle: string;
  loading: string;
  memberCodeAuto: string;
  memberCodeHint: string;
  memberCodeLabel: string;
  noteLabel: string;
  phoneLabel: string;
  pointsLabel: string;
  requestFailed: string;
  save: string;
  saveDiscount: string;
  saveLabel: string;
  saving: string;
  savingDiscount: string;
  searchPlaceholder: string;
  subtitle: string;
  successCreated: string;
  successDiscountUpdated: string;
  successUpdated: string;
  tableActions: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  title: string;
  totalBillsLabel: string;
  totalPurchaseLabel: string;
  updateTitle: string;
};

type CustomerNetworkManagerProps = {
  dictionary: CustomerNetworkDictionary;
};

type CustomerFormState = {
  address: string;
  branch: string;
  email: string;
  full_name: string;
  is_active: boolean;
  level: string;
  note: string;
  phone: string;
  tax_id: string;
};

const initialFormState: CustomerFormState = {
  address: "",
  branch: "",
  email: "",
  full_name: "",
  is_active: true,
  level: "1",
  note: "",
  phone: "",
  tax_id: "",
};

const LEVEL_BADGE: Record<number, string> = {
  1: "bg-slate-100 text-slate-600",
  2: "bg-blue-100 text-blue-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-rose-100 text-rose-600",
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
];

export function CustomerNetworkManager({ dictionary }: CustomerNetworkManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<CustomerLevelDiscount[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountSuccess, setDiscountSuccess] = useState("");
  const [formState, setFormState] = useState<CustomerFormState>(initialFormState);
  const [isPending, startTransition] = useTransition();
  const [isDiscountPending, startDiscountTransition] = useTransition();
  const [discountLevel, setDiscountLevel] = useState("1");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDiscountDrawerOpen, setIsDiscountDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [customerResponse, discountResponse] = await Promise.all([
          listCustomers(),
          listCustomerLevelDiscounts(),
        ]);
        setCustomers(customerResponse.data ?? []);
        setDiscounts(discountResponse.data ?? []);
      } catch (nextError) {
        setError(friendlyMessage(nextError));
      } finally {
        setIsLoading(false);
      }
    }
    void loadInitialData();
  }, []);

  // ─── KPI ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const total = customers.length;
    const silver = customers.filter((c) => (c.level ?? 1) === 2).length;
    const gold = customers.filter((c) => (c.level ?? 1) === 3).length;
    const platinum = customers.filter((c) => (c.level ?? 1) === 4).length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.points ?? 0), 0);
    return { gold, platinum, silver, total, totalPoints };
  }, [customers]);

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchSearch =
        !keyword ||
        c.full_name.toLowerCase().includes(keyword) ||
        (c.phone ?? "").includes(keyword) ||
        (c.member_code ?? "").toLowerCase().includes(keyword);
      const matchLevel = levelFilter === "all" || String(c.level ?? 1) === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [customers, levelFilter, search]);

  // ─── Level options ────────────────────────────────────────────────────────
  const customerLevelOptions = useMemo(() => {
    const levels = new Set<number>();
    for (const c of customers) {
      const l = Number(c.level ?? 1);
      if (Number.isInteger(l) && l > 0) levels.add(l);
    }
    for (const d of discounts) {
      const l = Number(d.level);
      if (Number.isInteger(l) && l > 0) levels.add(l);
    }
    const sel = Number(formState.level);
    if (Number.isInteger(sel) && sel > 0) levels.add(sel);
    if (levels.size === 0) levels.add(1);
    return [...levels].sort((a, b) => a - b);
  }, [customers, discounts, formState.level]);

  const discountPercentByLevel = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of discounts) {
      const l = Number(d.level);
      const p = Number(d.discount_percent ?? 0);
      if (Number.isInteger(l) && l > 0 && Number.isFinite(p)) map.set(l, p);
    }
    return map;
  }, [discounts]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function getLevelName(level: number) {
    switch (level) {
      case 2: return dictionary.levelSilver;
      case 3: return dictionary.levelGold;
      case 4: return dictionary.levelPlatinum;
      case 5: return dictionary.levelVip;
      default: return dictionary.levelGeneral;
    }
  }

  function getAvatarClass(index: number) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{dictionary.loading}</p>
      </div>
    );
  }

  // ─── Event handlers ───────────────────────────────────────────────────────
  function onFieldChange<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setFormState(initialFormState);
    setEditingCustomerId(null);
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    clearForm();
    setIsDiscountDrawerOpen(false);
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setIsCustomerModalOpen(false);
    clearForm();
    setError("");
  }

  function openDiscountDrawer() {
    setDiscountError("");
    setDiscountSuccess("");
    setIsCustomerModalOpen(false);
    setIsDiscountDrawerOpen(true);
  }

  function closeDiscountDrawer() {
    setIsDiscountDrawerOpen(false);
  }

  async function reloadData() {
    const [customerResponse, discountResponse] = await Promise.all([
      listCustomers(),
      listCustomerLevelDiscounts(),
    ]);
    setCustomers(customerResponse.data ?? []);
    setDiscounts(discountResponse.data ?? []);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formState.full_name.trim()) {
      setError(dictionary.fullNameRequired);
      return;
    }

    const levelNumber = Number(formState.level);
    if (!Number.isInteger(levelNumber) || levelNumber <= 0) {
      setError(dictionary.levelRequired);
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          address: formState.address.trim() || undefined,
          branch: formState.branch.trim() || undefined,
          email: formState.email.trim() || undefined,
          full_name: formState.full_name.trim(),
          is_active: formState.is_active,
          level: levelNumber,
          note: formState.note.trim() || undefined,
          phone: formState.phone.trim() || undefined,
          tax_id: formState.tax_id.trim() || undefined,
        };

        if (editingCustomerId) {
          await updateCustomer(editingCustomerId, payload);
        } else {
          await createCustomer(payload);
        }

        await reloadData();
        clearForm();
        setSuccess(editingCustomerId ? dictionary.successUpdated : dictionary.successCreated);
        setIsCustomerModalOpen(false);
      } catch (nextError) {
        setError(friendlyMessage(nextError));
      }
    });
  }

  function onEditCustomer(customer: Customer) {
    setError("");
    setSuccess("");
    setEditingCustomerId(customer.id);
    setFormState({
      address: customer.address ?? "",
      branch: customer.branch ?? "",
      email: customer.email ?? "",
      full_name: customer.full_name,
      is_active: customer.is_active,
      level: String(customer.level ?? 1),
      note: customer.note ?? "",
      phone: customer.phone ?? "",
      tax_id: customer.tax_id ?? "",
    });
    setIsCustomerModalOpen(true);
  }

  function onDeleteCustomer(customerId: string) {
    if (!window.confirm(dictionary.deleteConfirm)) return;

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await deleteCustomer(customerId);
        await reloadData();
        if (editingCustomerId === customerId) clearForm();
        setSuccess(dictionary.deletedSuccess);
      } catch (nextError) {
        setError(friendlyMessage(nextError));
      }
    });
  }

  function onSubmitDiscount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDiscountError("");
    setDiscountSuccess("");

    const level = Number(discountLevel);
    const percent = Number(discountPercent);

    if (!Number.isInteger(level) || level <= 0) {
      setDiscountError(dictionary.levelRequired);
      return;
    }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setDiscountError(dictionary.discountPercentLabel);
      return;
    }

    startDiscountTransition(async () => {
      try {
        await upsertCustomerLevelDiscount(level, percent);
        await reloadData();
        setDiscountSuccess(dictionary.successDiscountUpdated);
        setIsDiscountDrawerOpen(false);
      } catch (nextError) {
        setDiscountError(friendlyMessage(nextError));
      }
    });
  }

  function onDeleteDiscount(level: number) {
    setDiscountError("");
    setDiscountSuccess("");
    startDiscountTransition(async () => {
      try {
        await deleteCustomerLevelDiscount(level);
        await reloadData();
      } catch (nextError) {
        setDiscountError(friendlyMessage(nextError));
      }
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dictionary.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{dictionary.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={openDiscountDrawer}
            type="button"
          >
            {dictionary.discountRuleTitle}
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
            onClick={openCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.createTitleNew}
          </button>
        </div>
      </div>

      {/* ── Success banner ── */}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.total}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiTotal}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.silver}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiSilver}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Award className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.gold}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiGold}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
            <Crown className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.platinum}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiPlatinum}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <Star className="h-5 w-5 text-rose-500" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900">{kpi.totalPoints.toLocaleString()}</p>
            <p className="truncate text-xs text-slate-500">{dictionary.kpiPoints}</p>
          </div>
        </div>
      </div>

      {/* ── Customer table card ── */}
      <div className="rounded-2xl bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-violet-500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={dictionary.searchPlaceholder}
              value={search}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-slate-200 py-2.5 pl-3 pr-8 text-sm outline-none transition focus:border-violet-500"
              onChange={(event) => setLevelFilter(event.target.value)}
              value={levelFilter}
            >
              <option value="all">{dictionary.filterAllLevels}</option>
              {customerLevelOptions.map((l) => (
                <option key={l} value={String(l)}>
                  {getLevelName(l)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Table body */}
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{dictionary.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{dictionary.fullNameLabel}</th>
                  <th className="px-4 py-3">{dictionary.phoneLabel}</th>
                  <th className="px-4 py-3">{dictionary.levelLabel}</th>
                  <th className="px-4 py-3 text-right">{dictionary.pointsLabel}</th>
                  <th className="px-4 py-3 text-right">{dictionary.totalPurchaseLabel}</th>
                  <th className="px-4 py-3 text-right">{dictionary.totalBillsLabel}</th>
                  <th className="px-4 py-3">{dictionary.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {filteredCustomers.map((customer, idx) => {
                  const level = customer.level ?? 1;
                  const badgeClass = LEVEL_BADGE[level] ?? LEVEL_BADGE[1];
                  return (
                    <tr key={customer.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarClass(idx)}`}
                          >
                            {customer.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{customer.full_name}</p>
                            {customer.member_code ? (
                              <p className="text-xs text-slate-400">{customer.member_code}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{customer.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                          {getLevelName(level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {customer.points != null ? customer.points.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {customer.total_purchase != null
                          ? `฿${customer.total_purchase.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {customer.total_bills != null ? customer.total_bills : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            className="flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                            title={dictionary.addPointsLabel}
                            type="button"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {dictionary.addPointsLabel}
                          </button>
                          <button
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            title={dictionary.invoiceLabel}
                            type="button"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {dictionary.invoiceLabel}
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-violet-700"
                            onClick={() => onEditCustomer(customer)}
                            title={dictionary.editLabel}
                            type="button"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => onDeleteCustomer(customer.id)}
                            title={dictionary.deleteLabel}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      {isCustomerModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={closeCustomerModal}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header — violet */}
            <div className="flex items-start justify-between bg-violet-700 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-200" />
                  <h3 className="text-lg font-bold text-white">
                    {editingCustomerId ? dictionary.updateTitle : dictionary.createTitleNew}
                  </h3>
                </div>
                {!editingCustomerId ? (
                  <p className="mt-0.5 text-sm text-violet-200">{dictionary.createSubtitle}</p>
                ) : null}
              </div>
              <button
                className="rounded-lg p-1 text-violet-200 transition hover:bg-violet-600 hover:text-white"
                onClick={closeCustomerModal}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form className="max-h-[72vh] overflow-y-auto px-6 py-5" onSubmit={onSubmit}>
              {error ? (
                <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
              ) : null}

              {/* Full name */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {dictionary.fullNameLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                  onChange={(event) => onFieldChange("full_name", event.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  value={formState.full_name}
                />
              </div>

              {/* Phone + Email */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.phoneLabel}</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                    onChange={(event) => onFieldChange("phone", event.target.value)}
                    placeholder="08xxxxxxxx"
                    value={formState.phone}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.emailLabel}</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                    onChange={(event) => onFieldChange("email", event.target.value)}
                    placeholder="name@email.com"
                    type="email"
                    value={formState.email}
                  />
                </div>
              </div>

              {/* Level + Member code */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.levelLabel}</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                    onChange={(event) => onFieldChange("level", event.target.value)}
                    value={formState.level}
                  >
                    {customerLevelOptions.map((l) => (
                      <option key={l} value={String(l)}>
                        {getLevelName(l)} ({discountPercentByLevel.get(l) ?? 0}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.memberCodeLabel}</label>
                  <input
                    className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 outline-none"
                    disabled
                    placeholder={dictionary.memberCodeAuto}
                    readOnly
                    value={
                      editingCustomerId
                        ? (customers.find((c) => c.id === editingCustomerId)?.member_code ?? "")
                        : ""
                    }
                  />
                  <p className="mt-1 text-xs text-slate-400">{dictionary.memberCodeHint}</p>
                </div>
              </div>

              {/* Tax ID + Branch */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.taxIdLabel}</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                    maxLength={13}
                    onChange={(event) => onFieldChange("tax_id", event.target.value.replace(/\D/g, ""))}
                    placeholder={dictionary.taxIdPlaceholder}
                    value={formState.tax_id}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.branchLabel}</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                    onChange={(event) => onFieldChange("branch", event.target.value)}
                    placeholder={dictionary.branchPlaceholder}
                    value={formState.branch}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{dictionary.addressLabel}</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500"
                  onChange={(event) => onFieldChange("address", event.target.value)}
                  placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด"
                  rows={2}
                  value={formState.address}
                />
              </div>

              {/* Active toggle */}
              <label className="mb-5 flex cursor-pointer items-center gap-2">
                <input
                  checked={formState.is_active}
                  className="accent-violet-600"
                  onChange={(event) => onFieldChange("is_active", event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm font-medium text-slate-700">{dictionary.activeLabel}</span>
              </label>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={closeCustomerModal}
                  type="button"
                >
                  {dictionary.cancelLabel}
                </button>
                <button
                  className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:bg-violet-400"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? dictionary.saving : dictionary.saveLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Discount drawer ── */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/35 p-4 backdrop-blur-[1px] transition-opacity duration-300 md:p-8 ${
          isDiscountDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDiscountDrawer}
      >
        <div
          className={`ml-auto h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 ${
            isDiscountDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{dictionary.discountRuleTitle}</h3>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
              onClick={closeDiscountDrawer}
              type="button"
            >
              {dictionary.closeLabel}
            </button>
          </div>

          <form className="mt-4 grid gap-4" onSubmit={onSubmitDiscount}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.levelLabel}</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                min="1"
                onChange={(event) => setDiscountLevel(event.target.value)}
                step="1"
                type="number"
                value={discountLevel}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.discountPercentLabel}</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                max="100"
                min="0"
                onChange={(event) => setDiscountPercent(event.target.value)}
                step="0.01"
                type="number"
                value={discountPercent}
              />
            </label>
            <button
              className="rounded-lg bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:bg-violet-400"
              disabled={isDiscountPending}
              type="submit"
            >
              {isDiscountPending ? dictionary.savingDiscount : dictionary.saveDiscount}
            </button>
          </form>

          {discountError ? <p className="mt-4 text-sm text-rose-600">{discountError}</p> : null}
          {discountSuccess ? <p className="mt-4 text-sm text-emerald-700">{discountSuccess}</p> : null}

          <div className="mt-4 space-y-2">
            {discounts.map((discount) => (
              <div
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                key={discount.level}
              >
                <p className="text-sm font-medium text-slate-700">
                  {getLevelName(discount.level)}{" "}
                  <span className="text-slate-400">
                    ({dictionary.levelLabel} {discount.level})
                  </span>
                  : {discount.discount_percent}%
                </p>
                <button
                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={() => onDeleteDiscount(discount.level)}
                  type="button"
                >
                  {dictionary.deleteLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
