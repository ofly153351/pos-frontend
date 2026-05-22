"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/locale-config";
import {
  getPendingPlanChoice,
  savePendingPlanChoice,
} from "@/lib/subscription-storage";

type PlanCard = {
  code: string;
  currency: string;
  description: string;
  durationDays: number;
  id: string;
  name: string;
  price: string;
};

type SubscriptionPlanSelectorProps = {
  ctaLabel: string;
  helper: string;
  locale: Locale;
  plans: PlanCard[];
  selectedBadge: string;
  subtitle: string;
  title: string;
};

export function SubscriptionPlanSelector({
  ctaLabel,
  helper,
  locale,
  plans,
  selectedBadge,
  subtitle,
  title,
}: SubscriptionPlanSelectorProps) {
  const router = useRouter();
  const storedPlan = typeof window === "undefined" ? null : getPendingPlanChoice();
  const [selectedPlanId, setSelectedPlanId] = useState(
    storedPlan?.id ?? plans[0]?.id ?? "",
  );
  const [selectedPlanCode, setSelectedPlanCode] = useState(
    storedPlan?.code ?? plans[0]?.code ?? "",
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-violet-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">
            POS Suite
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {subtitle}
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;

            return (
              <button
                key={plan.id}
                className={`rounded-[2rem] border p-8 text-left shadow-[0_24px_60px_rgba(124,58,237,0.1)] transition ${
                  isSelected
                    ? "border-violet-500 bg-violet-50/60"
                    : "border-violet-100 bg-white hover:border-violet-300"
                }`}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setSelectedPlanCode(plan.code);
                  savePendingPlanChoice({ id: plan.id, code: plan.code });
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">
                      {plan.code}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                      {plan.name}
                    </h2>
                  </div>
                  {isSelected ? (
                    <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                      {selectedBadge}
                    </span>
                  ) : null}
                </div>

                <p className="mt-5 text-base leading-7 text-slate-600">
                  {plan.description}
                </p>

                <div className="mt-8 flex items-end gap-3">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm font-medium text-slate-500">
                    {plan.currency}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {plan.durationDays} days
                </p>
              </button>
            );
          })}
        </section>

        <section className="mt-8 flex flex-col items-start gap-4 rounded-[2rem] border border-violet-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
          <p className="text-sm leading-6 text-slate-600">{helper}</p>
              <button
                className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                onClick={() => {
                  savePendingPlanChoice({
                    id: selectedPlanId,
                    code: selectedPlanCode,
                  });
                  router.replace(`/${locale}/setup/store`);
                }}
                type="button"
              >
            {ctaLabel}
          </button>
        </section>
      </div>
    </main>
  );
}
