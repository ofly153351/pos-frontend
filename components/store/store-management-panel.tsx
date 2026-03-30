"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAuthSession } from "@/lib/auth-storage";
import { getCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import { createStore, getStoreById, listMyStores, updateStoreById } from "@/services/stores";
import type { Store } from "@/types/store";

type StoreManagementDictionary = {
  addressLabel: string;
  createStoreTitle: string;
  createSubmit: string;
  createSuccess: string;
  creating: string;
  currencyLabel: string;
  emptyStores: string;
  errorFallback: string;
  logoLabel: string;
  logoPreviewLabel: string;
  nameLabel: string;
  nameRequired: string;
  noLogoLabel: string;
  pageDescription: string;
  pageTitle: string;
  phoneLabel: string;
  planLabel: string;
  plans: {
    growth: string;
    pro: string;
    starter: string;
  };
  selectStoreLabel: string;
  switchSectionTitle: string;
  switchStoreAction: string;
  switchStoreHint: string;
  switchedSuccess: string;
  updateStoreTitle: string;
  updateSubmit: string;
  updateSuccess: string;
  updating: string;
};

type StoreManagementPanelProps = {
  dictionary: StoreManagementDictionary;
};

const availablePlanCodes = ["starter", "growth", "pro"] as const;

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "ST";
  }

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function StoreManagementPanel({ dictionary }: StoreManagementPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCurrencyCode, setEditCurrencyCode] = useState("THB");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreviewUrl, setEditLogoPreviewUrl] = useState("");
  const [isEditLogoLoading, setIsEditLogoLoading] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createCurrencyCode, setCreateCurrencyCode] = useState("THB");
  const [createPlanCode, setCreatePlanCode] = useState<(typeof availablePlanCodes)[number]>("starter");
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoPreviewUrl, setCreateLogoPreviewUrl] = useState("");
  const [isCreateLogoLoading, setIsCreateLogoLoading] = useState(false);

  const [isSwitchPending, startSwitchTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!editLogoFile) {
      setEditLogoPreviewUrl(currentStore?.logo_url ?? "");
      setIsEditLogoLoading(false);
      return;
    }

    let isActive = true;
    const reader = new FileReader();

    setIsEditLogoLoading(true);
    reader.onload = () => {
      if (!isActive) {
        return;
      }

      setEditLogoPreviewUrl(typeof reader.result === "string" ? reader.result : "");
      setIsEditLogoLoading(false);
    };
    reader.onerror = () => {
      if (!isActive) {
        return;
      }

      setEditLogoPreviewUrl("");
      setIsEditLogoLoading(false);
    };
    reader.readAsDataURL(editLogoFile);

    return () => {
      isActive = false;
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [currentStore?.logo_url, editLogoFile]);

  useEffect(() => {
    if (!createLogoFile) {
      setCreateLogoPreviewUrl("");
      setIsCreateLogoLoading(false);
      return;
    }

    let isActive = true;
    const reader = new FileReader();

    setIsCreateLogoLoading(true);
    reader.onload = () => {
      if (!isActive) {
        return;
      }

      setCreateLogoPreviewUrl(typeof reader.result === "string" ? reader.result : "");
      setIsCreateLogoLoading(false);
    };
    reader.onerror = () => {
      if (!isActive) {
        return;
      }

      setCreateLogoPreviewUrl("");
      setIsCreateLogoLoading(false);
    };
    reader.readAsDataURL(createLogoFile);

    return () => {
      isActive = false;
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [createLogoFile]);

  useEffect(() => {
    let isActive = true;

    async function loadStores() {
      try {
        const storesResponse = await listMyStores();
        const myStores = storesResponse.data ?? [];

        if (!isActive) {
          return;
        }

        setStores(myStores);

        const session = getAuthSession();
        const preferredStoreId = getCurrentStoreId() || session?.store_id || myStores[0]?.id;

        if (!preferredStoreId) {
          setCurrentStore(null);
          setSelectedStoreId("");
          return;
        }

        saveCurrentStoreId(preferredStoreId);
        setSelectedStoreId(preferredStoreId);

        const preferredStore = myStores.find((store) => store.id === preferredStoreId);

        if (preferredStore) {
          setCurrentStore(preferredStore);
          setEditName(preferredStore.name ?? "");
          setEditPhone(preferredStore.phone ?? "");
          setEditAddress(preferredStore.address ?? "");
          setEditCurrencyCode(preferredStore.currency_code ?? "THB");
          return;
        }

        const storeResponse = await getStoreById(preferredStoreId);

        if (!isActive) {
          return;
        }

        setCurrentStore(storeResponse.data);
        setEditName(storeResponse.data.name ?? "");
        setEditPhone(storeResponse.data.phone ?? "");
        setEditAddress(storeResponse.data.address ?? "");
        setEditCurrencyCode(storeResponse.data.currency_code ?? "THB");
      } catch (nextError) {
        if (!isActive) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : dictionary.errorFallback);
      }
    }

    loadStores();

    return () => {
      isActive = false;
    };
  }, [dictionary.errorFallback]);

  function handleStoreSelection(nextStoreId: string) {
    setSelectedStoreId(nextStoreId);
    const nextStore = stores.find((store) => store.id === nextStoreId) ?? null;
    setCurrentStore(nextStore);
    setEditName(nextStore?.name ?? "");
    setEditPhone(nextStore?.phone ?? "");
    setEditAddress(nextStore?.address ?? "");
    setEditCurrencyCode(nextStore?.currency_code ?? "THB");
    setEditLogoFile(null);
  }

  function switchStore() {
    if (!selectedStoreId) {
      return;
    }

    startSwitchTransition(() => {
      saveCurrentStoreId(selectedStoreId);
      setSuccess(dictionary.switchedSuccess);
      router.refresh();
      window.location.assign(pathname);
    });
  }

  function handleUpdateStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedStoreId) {
      setError(dictionary.emptyStores);
      return;
    }

    if (!editName.trim()) {
      setError(dictionary.nameRequired);
      return;
    }

    startUpdateTransition(async () => {
      try {
        const response = await updateStoreById(selectedStoreId, {
          address: editAddress,
          currency_code: editCurrencyCode,
          logo: editLogoFile,
          name: editName,
          phone: editPhone,
        });

        const updatedStore = response.data;

        setCurrentStore(updatedStore);
        setStores((currentStores) =>
          currentStores.map((store) =>
            store.id === updatedStore.id
              ? { ...store, ...updatedStore }
              : store,
          ),
        );
        setEditLogoFile(null);
        setSuccess(dictionary.updateSuccess);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.errorFallback);
      }
    });
  }

  function handleCreateStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!createName.trim()) {
      setError(dictionary.nameRequired);
      return;
    }

    startCreateTransition(async () => {
      try {
        const response = await createStore({
          address: createAddress,
          currency_code: createCurrencyCode,
          logo: createLogoFile,
          name: createName,
          phone: createPhone,
          subscription_plan_code: createPlanCode,
        });

        const nextStore = response.data;
        setStores((currentStores) => [...currentStores, nextStore]);
        setCreateName("");
        setCreatePhone("");
        setCreateAddress("");
        setCreateCurrencyCode("THB");
        setCreatePlanCode("starter");
        setCreateLogoFile(null);
        setSelectedStoreId(nextStore.id);
        setCurrentStore(nextStore);
        setEditName(nextStore.name ?? "");
        setEditPhone(nextStore.phone ?? "");
        setEditAddress(nextStore.address ?? "");
        setEditCurrencyCode(nextStore.currency_code ?? "THB");
        saveCurrentStoreId(nextStore.id);
        setIsCreateFormOpen(false);
        setSuccess(dictionary.createSuccess);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : dictionary.errorFallback);
      }
    });
  }

  if (!hasMounted) {
    return (
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
            {dictionary.pageTitle}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {dictionary.switchSectionTitle}
          </h1>
          <p className="mt-3 text-sm text-slate-600">{dictionary.pageDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="smooth-fade-up rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)] transition-shadow duration-300 hover:shadow-[0_28px_70px_rgba(59,130,246,0.14)]">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
          {dictionary.pageTitle}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {dictionary.switchSectionTitle}
        </h1>
        <p className="mt-3 text-sm text-slate-600">{dictionary.pageDescription}</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.selectStoreLabel}</span>
            <select
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => handleStoreSelection(event.target.value)}
              value={selectedStoreId}
            >
              <option value="">{dictionary.emptyStores}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
            disabled={!selectedStoreId || isSwitchPending}
            onClick={switchStore}
            type="button"
          >
            {dictionary.switchStoreAction}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{dictionary.switchStoreHint}</p>
      </div>

      <div className="flex justify-start">
        <button
          className="smooth-fade-up smooth-delay-1 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:bg-sky-100"
          onClick={() => setIsCreateFormOpen((current) => !current)}
          type="button"
        >
          {dictionary.createStoreTitle}
        </button>
      </div>

      <div className={`grid gap-6 ${isCreateFormOpen ? "xl:grid-cols-2" : ""}`}>
        <form
          className="smooth-fade-up smooth-delay-1 rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)] transition-shadow duration-300 hover:shadow-[0_28px_70px_rgba(59,130,246,0.14)]"
          onSubmit={handleUpdateStore}
        >
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.updateStoreTitle}</h2>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.nameLabel}</span>
              <input
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.phoneLabel}</span>
              <input
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                onChange={(event) => setEditPhone(event.target.value)}
                value={editPhone}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.addressLabel}</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                onChange={(event) => setEditAddress(event.target.value)}
                value={editAddress}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.currencyLabel}</span>
              <input
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                onChange={(event) => setEditCurrencyCode(event.target.value)}
                value={editCurrencyCode}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.logoLabel}</span>
              <input
                accept="image/*"
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white"
                onChange={(event) => setEditLogoFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                {dictionary.logoPreviewLabel}
              </p>
              <div className="mt-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {isEditLogoLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                ) : editLogoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={editName || dictionary.logoLabel} className="h-full w-full object-cover" src={editLogoPreviewUrl} />
                ) : (
                  <span className="text-xs font-bold text-slate-500">{getInitials(editName)}</span>
                )}
              </div>
            </div>
          </div>

          <button
            className="mt-6 inline-flex rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
            disabled={!selectedStoreId || isUpdatePending}
            type="submit"
          >
            {isUpdatePending ? dictionary.updating : dictionary.updateSubmit}
          </button>
        </form>

        {isCreateFormOpen ? (
          <form
            className="smooth-fade-up smooth-delay-2 rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)] transition-shadow duration-300 hover:shadow-[0_28px_70px_rgba(59,130,246,0.14)]"
            onSubmit={handleCreateStore}
          >
            <h2 className="text-2xl font-semibold text-slate-950">{dictionary.createStoreTitle}</h2>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.nameLabel}</span>
                <input
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreateName(event.target.value)}
                  value={createName}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.planLabel}</span>
                <select
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreatePlanCode(event.target.value as (typeof availablePlanCodes)[number])}
                  value={createPlanCode}
                >
                  {availablePlanCodes.map((planCode) => (
                    <option key={planCode} value={planCode}>
                      {dictionary.plans[planCode]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.phoneLabel}</span>
                <input
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreatePhone(event.target.value)}
                  value={createPhone}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.addressLabel}</span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreateAddress(event.target.value)}
                  value={createAddress}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.currencyLabel}</span>
                <input
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreateCurrencyCode(event.target.value)}
                  value={createCurrencyCode}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{dictionary.logoLabel}</span>
                <input
                  accept="image/*"
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white"
                  onChange={(event) => setCreateLogoFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  {dictionary.logoPreviewLabel}
                </p>
                <div className="mt-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {isCreateLogoLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                  ) : createLogoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={createName || dictionary.logoLabel} className="h-full w-full object-cover" src={createLogoPreviewUrl} />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{dictionary.noLogoLabel}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="mt-6 inline-flex rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
              disabled={isCreatePending}
              type="submit"
            >
              {isCreatePending ? dictionary.creating : dictionary.createSubmit}
            </button>
          </form>
        ) : null}
      </div>

      {error ? (
        <div className="smooth-fade rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="smooth-fade rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
    </section>
  );
}
