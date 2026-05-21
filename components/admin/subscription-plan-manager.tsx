"use client";

import { useEffect, useState, useTransition } from "react";

import {
  getCurrentSubscription,
  listSubscriptionPlans,
  updateCurrentSubscription,
} from "@/services/stores";
import type { StoreSubscription, SubscriptionPlan } from "@/types/store";

type SubscriptionPlanManagerDictionary = {
  currentLabel: string;
  empty: string;
  helper: string;
  save: string;
  saving: string;
  selectLabel: string;
  title: string;
};

type SubscriptionPlanManagerProps = {
  dictionary: SubscriptionPlanManagerDictionary;
};

export function SubscriptionPlanManager({
  dictionary,
}: SubscriptionPlanManagerProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const [planResponse, subscriptionResponse] = await Promise.all([
          listSubscriptionPlans(),
          getCurrentSubscription(),
        ]);

        setPlans(planResponse.data);
        setSubscription(subscriptionResponse.data);
        setSelectedPlanId(subscriptionResponse.data.plan_id);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }, []);

  function handleSave() {
    if (!selectedPlanId) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const plan = plans.find((candidate) => candidate.id === selectedPlanId);

        if (!plan?.code) {
          throw new Error("Selected plan is missing a code");
        }

        const response = await updateCurrentSubscription(plan.code);
        setSubscription(response.data);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Request failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
        <h2 className="text-3xl font-semibold text-slate-950">{dictionary.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          {dictionary.helper}
        </p>
        <div className="mt-6 rounded-[1.5rem] bg-sky-50/60 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-600">
            {dictionary.currentLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {subscription?.plan?.name ?? dictionary.empty}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            {dictionary.selectLabel}
          </span>
          <select
            className="w-full rounded-2xl border border-sky-100 bg-sky-50/55 px-4 py-3 outline-none focus:border-sky-500 focus:bg-white"
            onChange={(event) => setSelectedPlanId(event.target.value)}
            value={selectedPlanId}
          >
            <option value="">{dictionary.empty}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          className="mt-6 inline-flex rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
          disabled={isPending || !selectedPlanId}
          onClick={handleSave}
          type="button"
        >
          {isPending ? dictionary.saving : dictionary.save}
        </button>
      </section>
    </div>
  );
}
