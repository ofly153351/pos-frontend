"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createStore, updateStoreSubscription } from "@/services/stores";
import { saveCurrentStoreId } from "@/lib/store-storage";
import type { Locale } from "@/lib/locale-config";
import {
  clearPendingPlanId,
  getPendingPlanChoice,
  type PendingPlanChoice,
} from "@/lib/subscription-storage";

type StoreSetupDictionary = {
  createTitle: string;
  descriptionLabel: string;
  existingStoreIdLabel: string;
  helper: string;
  manualSelect: string;
  nameLabel: string;
  slugLabel: string;
  phoneLabel: string;
  addressLabel: string;
  currencyLabel: string;
  openDashboard: string;
  save: string;
  selectedPlanEmpty: string;
  selectedPlanLabel: string;
  planRequired: string;
  saving: string;
  title: string;
  planNames: Record<string, string>;
};

type StoreSetupFormProps = {
  dictionary: StoreSetupDictionary;
  locale: Locale;
};

export function StoreSetupForm({
  dictionary,
  locale,
}: StoreSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [existingStoreId, setExistingStoreId] = useState("");
  const [pendingPlan, setPendingPlan] = useState<PendingPlanChoice | null>(() =>
    typeof window === "undefined" ? null : getPendingPlanChoice(),
  );
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currencyCode, setCurrencyCode] = useState("THB");
  const [error, setError] = useState("");

  async function applyPendingPlan(storeId: string) {
    if (!pendingPlan?.code) {
      return;
    }

    await updateStoreSubscription(storeId, pendingPlan.code);
    clearPendingPlanId();
    setPendingPlan(null);
  }

  function handleSelectExistingStore() {
    if (!existingStoreId.trim()) {
      return;
    }

    const storeId = existingStoreId.trim();

    startTransition(async () => {
      try {
        saveCurrentStoreId(storeId);
        await applyPendingPlan(storeId);
        router.replace(`/${locale}/admin/plans`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!pendingPlan?.code) {
      setError(dictionary.planRequired);
      return;
    }

    startTransition(async () => {
      try {
        const response = await createStore({
          address: address || undefined,
          currency_code: currencyCode || undefined,
          description,
          name,
          phone: phone || undefined,
          slug,
          subscription_plan_code: pendingPlan.code,
        });

        saveCurrentStoreId(response.data.id);
        await applyPendingPlan(response.data.id);
        router.replace(`/${locale}/admin/plans`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">
          {dictionary.title}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {dictionary.createTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          {dictionary.helper}
        </p>
        <div className="mt-6 rounded-[1.5rem] bg-sky-50/60 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-600">
            {dictionary.selectedPlanLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {pendingPlan?.id
              ? dictionary.planNames[pendingPlan.id] ??
                dictionary.planNames[pendingPlan.code] ??
                pendingPlan.id
              : dictionary.selectedPlanEmpty}
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.nameLabel}
            </span>
            <input
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.slugLabel}
            </span>
            <input
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setSlug(event.target.value)}
              placeholder="kinetic-pos"
              required
              value={slug}
            />
          </label>
          <label className="block grid gap-2 lg:grid-cols-3">
            <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-slate-500 lg:col-span-3">
              {dictionary.phoneLabel}
            </span>
            <input
              className="lg:col-span-3 w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+66 1234 5678"
              value={phone}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.addressLabel}
            </span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setAddress(event.target.value)}
              value={address}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.currencyLabel}
            </span>
            <input
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setCurrencyCode(event.target.value)}
              placeholder="THB"
              value={currencyCode}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.descriptionLabel}
            </span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            className="inline-flex rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
            disabled={isPending}
            type="submit"
          >
            {isPending ? dictionary.saving : dictionary.save}
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(59,130,246,0.1)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          {dictionary.manualSelect}
        </h2>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.existingStoreIdLabel}
            </span>
            <input
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
              onChange={(event) => setExistingStoreId(event.target.value)}
              value={existingStoreId}
            />
          </label>
          <button
            className="inline-flex rounded-2xl border border-sky-200 px-5 py-3 font-semibold text-sky-700 transition hover:bg-sky-50"
            disabled={isPending}
            onClick={handleSelectExistingStore}
            type="button"
          >
            {dictionary.openDashboard}
          </button>
        </div>
      </section>
    </div>
  );
}
