"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  createCustomer,
  deleteCustomer,
  deleteCustomerLevelDiscount,
  listCustomerLevelDiscounts,
  listCustomers,
  updateCustomer,
  upsertCustomerLevelDiscount,
} from "@/services/customers";
import type { Customer, CustomerLevelDiscount } from "@/types/customer";

type CustomerNetworkDictionary = {
  activeLabel: string;
  activeStatus: string;
  addressLabel: string;
  closeLabel: string;
  deleteLabel: string;
  discountPercentLabel: string;
  discountRuleTitle: string;
  editLabel: string;
  createTitle: string;
  deleteConfirm: string;
  deletedSuccess: string;
  emailLabel: string;
  empty: string;
  fullNameLabel: string;
  fullNameRequired: string;
  inactiveStatus: string;
  levelLabel: string;
  levelRequired: string;
  listTitle: string;
  loading: string;
  noteLabel: string;
  phoneLabel: string;
  requestFailed: string;
  save: string;
  cancelEdit: string;
  saveDiscount: string;
  savingDiscount: string;
  saving: string;
  successDiscountUpdated: string;
  successUpdated: string;
  searchPlaceholder: string;
  subtitle: string;
  successCreated: string;
  tableActions: string;
  title: string;
};

type CustomerNetworkManagerProps = {
  dictionary: CustomerNetworkDictionary;
};

type CustomerFormState = {
  address: string;
  email: string;
  full_name: string;
  is_active: boolean;
  level: string;
  note: string;
  phone: string;
};

const initialFormState: CustomerFormState = {
  address: "",
  email: "",
  full_name: "",
  is_active: true,
  level: "1",
  note: "",
  phone: "",
};

export function CustomerNetworkManager({ dictionary }: CustomerNetworkManagerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<CustomerLevelDiscount[]>([]);
  const [search, setSearch] = useState("");
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
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isDiscountDrawerOpen, setIsDiscountDrawerOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    startTransition(async () => {
      try {
        const [customerResponse, discountResponse] = await Promise.all([
          listCustomers(),
          listCustomerLevelDiscounts(),
        ]);

        setCustomers(customerResponse.data ?? []);
        setDiscounts(discountResponse.data ?? []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.requestFailed);
      }
    });
  }, [dictionary.requestFailed, hasMounted]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!keyword) {
        return true;
      }

      return (
        customer.full_name.toLowerCase().includes(keyword) ||
        (customer.phone ?? "").toLowerCase().includes(keyword) ||
        (customer.email ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  const customerLevelOptions = useMemo(() => {
    const levels = new Set<number>();

    for (const customer of customers) {
      const level = Number(customer.level ?? 1);
      if (Number.isInteger(level) && level > 0) {
        levels.add(level);
      }
    }

    for (const discount of discounts) {
      const level = Number(discount.level);
      if (Number.isInteger(level) && level > 0) {
        levels.add(level);
      }
    }

    const selectedLevel = Number(formState.level);
    if (Number.isInteger(selectedLevel) && selectedLevel > 0) {
      levels.add(selectedLevel);
    }

    if (levels.size === 0) {
      levels.add(1);
    }

    return [...levels].sort((a, b) => a - b);
  }, [customers, discounts, formState.level]);

  const discountPercentByLevel = useMemo(() => {
    const map = new Map<number, number>();

    for (const discount of discounts) {
      const level = Number(discount.level);
      const percent = Number(discount.discount_percent ?? 0);

      if (Number.isInteger(level) && level > 0 && Number.isFinite(percent)) {
        map.set(level, percent);
      }
    }

    return map;
  }, [discounts]);

  if (!hasMounted) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{dictionary.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{dictionary.loading}</p>
        </section>
      </div>
    );
  }

  function onFieldChange<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setFormState(initialFormState);
    setEditingCustomerId(null);
  }

  function openCreateCustomerDrawer() {
    setError("");
    setSuccess("");
    clearForm();
    setIsDiscountDrawerOpen(false);
    setIsCustomerDrawerOpen(true);
  }

  function closeCustomerDrawer() {
    setIsCustomerDrawerOpen(false);
    clearForm();
  }

  function openDiscountDrawer() {
    setDiscountError("");
    setDiscountSuccess("");
    setIsCustomerDrawerOpen(false);
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
    setSuccess("");

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
        if (editingCustomerId) {
          await updateCustomer(editingCustomerId, {
            address: formState.address.trim() || undefined,
            email: formState.email.trim() || undefined,
            full_name: formState.full_name.trim(),
            is_active: formState.is_active,
            level: levelNumber,
            note: formState.note.trim() || undefined,
            phone: formState.phone.trim() || undefined,
          });
        } else {
          await createCustomer({
            address: formState.address.trim() || undefined,
            email: formState.email.trim() || undefined,
            full_name: formState.full_name.trim(),
            is_active: formState.is_active,
            level: levelNumber,
            note: formState.note.trim() || undefined,
            phone: formState.phone.trim() || undefined,
          });
        }

        await reloadData();
        clearForm();
        setSuccess(editingCustomerId ? dictionary.successUpdated : dictionary.successCreated);
        setIsCustomerDrawerOpen(false);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.requestFailed);
      }
    });
  }

  function onEditCustomer(customer: Customer) {
    setError("");
    setSuccess("");
    setEditingCustomerId(customer.id);
    setIsCustomerDrawerOpen(true);
    setFormState({
      address: customer.address ?? "",
      email: customer.email ?? "",
      full_name: customer.full_name,
      is_active: customer.is_active,
      level: String(customer.level ?? 1),
      note: customer.note ?? "",
      phone: customer.phone ?? "",
    });
  }

  function onDeleteCustomer(customerId: string) {
    if (!window.confirm(dictionary.deleteConfirm)) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await deleteCustomer(customerId);
        await reloadData();
        if (editingCustomerId === customerId) {
          clearForm();
        }
        setSuccess(dictionary.deletedSuccess);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.requestFailed);
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
        setDiscountError(nextError instanceof Error ? nextError.message : dictionary.requestFailed);
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
        setDiscountError(nextError instanceof Error ? nextError.message : dictionary.requestFailed);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">{dictionary.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{dictionary.subtitle}</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            onClick={openCreateCustomerDrawer}
            type="button"
          >
            {dictionary.createTitle}
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={openDiscountDrawer}
            type="button"
          >
            {dictionary.discountRuleTitle}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-emerald-700">{success}</p> : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{dictionary.listTitle}</h3>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 md:w-80"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dictionary.searchPlaceholder}
            value={search}
          />
        </div>

        {isPending && customers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{dictionary.loading}</p>
        ) : null}

        {!isPending && filteredCustomers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{dictionary.empty}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{dictionary.fullNameLabel}</th>
                <th className="px-4 py-3">{dictionary.levelLabel}</th>
                <th className="px-4 py-3">{dictionary.phoneLabel}</th>
                <th className="px-4 py-3">{dictionary.emailLabel}</th>
                <th className="px-4 py-3">{dictionary.activeLabel}</th>
                <th className="px-4 py-3">{dictionary.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{customer.full_name}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.level ?? 1}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.phone || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        customer.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {customer.is_active ? dictionary.activeStatus : dictionary.inactiveStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => onEditCustomer(customer)}
                        type="button"
                      >
                        {dictionary.editLabel}
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => onDeleteCustomer(customer.id)}
                        type="button"
                      >
                        {dictionary.deleteLabel}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-50 bg-slate-900/35 p-4 backdrop-blur-[1px] transition-opacity duration-300 md:p-8 ${
          isCustomerDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCustomerDrawer}
      >
        <div
          className={`ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 md:w-[35vw] ${
            isCustomerDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingCustomerId ? dictionary.editLabel : dictionary.createTitle}
            </h3>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              onClick={closeCustomerDrawer}
              type="button"
            >
              {dictionary.closeLabel}
            </button>
          </div>
          <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.fullNameLabel}</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("full_name", event.target.value)}
                value={formState.full_name}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.levelLabel}</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("level", event.target.value)}
                value={formState.level}
              >
                {customerLevelOptions.map((level) => (
                  <option key={level} value={String(level)}>
                    {dictionary.levelLabel} {level} ({discountPercentByLevel.get(level) ?? 0}%)
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.phoneLabel}</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("phone", event.target.value)}
                value={formState.phone}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.emailLabel}</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("email", event.target.value)}
                value={formState.email}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.addressLabel}</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("address", event.target.value)}
                value={formState.address}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.noteLabel}</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                onChange={(event) => onFieldChange("note", event.target.value)}
                value={formState.note}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={formState.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">{dictionary.activeLabel}</span>
            </label>
            <button
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
              disabled={isPending}
              type="submit"
            >
              {isPending ? dictionary.saving : dictionary.save}
            </button>
            {editingCustomerId ? (
              <button
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={clearForm}
                type="button"
              >
                {dictionary.cancelEdit}
              </button>
            ) : null}
          </form>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-slate-900/35 p-4 backdrop-blur-[1px] transition-opacity duration-300 md:p-8 ${
          isDiscountDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDiscountDrawer}
      >
        <div
          className={`ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 md:w-[35vw] ${
            isDiscountDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{dictionary.discountRuleTitle}</h3>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                max="100"
                min="0"
                onChange={(event) => setDiscountPercent(event.target.value)}
                step="0.01"
                type="number"
                value={discountPercent}
              />
            </label>
            <button
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
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
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                key={discount.level}
              >
                <p className="text-sm font-medium text-slate-700">
                  {dictionary.levelLabel} {discount.level}: {discount.discount_percent}%
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
