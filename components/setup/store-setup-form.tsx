"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createStore, updateStoreSubscription } from "@/services/stores";
import { getCurrentStoreId, saveCurrentStoreId } from "@/lib/store-storage";
import type { Locale } from "@/lib/locale-config";
import {
  clearPendingPlanId,
  getPendingPlanChoice,
  type PendingPlanChoice,
} from "@/lib/subscription-storage";

type StoreSetupDictionary = {
  createTitle: string;
  descriptionLabel: string;
  helper: string;
  nameLabel: string;
  phoneLabel: string;
  addressLabel: string;
  currencyLabel: string;
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
  const [description, setDescription] = useState("");
  const [resolvedStoreId, setResolvedStoreId] = useState("");
  const [pendingPlan, setPendingPlan] = useState<PendingPlanChoice | null>(() =>
    typeof window === "undefined" ? null : getPendingPlanChoice(),
  );
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currencyCode, setCurrencyCode] = useState("THB");
  const [error, setError] = useState("");

  useEffect(() => {
    const currentStoreId = getCurrentStoreId();

    if (currentStoreId) {
      setResolvedStoreId(currentStoreId);
    }
  }, []);

  async function applyPendingPlan(storeId: string) {
    if (!pendingPlan?.code) {
      return;
    }

    await updateStoreSubscription(storeId, pendingPlan.code);
    clearPendingPlanId();
    setPendingPlan(null);
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
        if (resolvedStoreId.trim()) {
          const storeId = resolvedStoreId.trim();
          saveCurrentStoreId(storeId);
          await applyPendingPlan(storeId);
          router.replace(`/${locale}/admin/plans`);
          return;
        }

        const response = await createStore({
          address: address || undefined,
          currency_code: currencyCode || undefined,
          description,
          name,
          phone: phone || undefined,
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
    <div className="mx-auto max-w-3xl">
      <section className="rounded-[2rem] border border-violet-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">
          {dictionary.title}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {dictionary.createTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          {dictionary.helper}
        </p>
        <div className="mt-6 rounded-[1.5rem] bg-violet-50/60 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-violet-600">
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
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="block grid gap-2 lg:grid-cols-3">
            <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-slate-500 lg:col-span-3">
              {dictionary.phoneLabel}
            </span>
            <input
              className="lg:col-span-3 w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white"
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
              className="min-h-24 w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white"
              onChange={(event) => setAddress(event.target.value)}
              value={address}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {dictionary.currencyLabel}
            </span>
            <input
              className="w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white"
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
              className="min-h-32 w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white"
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
            className="inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:bg-violet-300"
            disabled={isPending}
            type="submit"
          >
            {isPending ? dictionary.saving : dictionary.save}
          </button>
        </form>
      </section>
    </div>
  );
}
