"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearAuthSession,
  getAuthSession,
} from "@/lib/auth-storage";
import type { Locale } from "@/lib/locale-config";
import type { AuthPayload } from "@/types/auth";

type AuthStatusCardProps = {
  locale: Locale;
  labels: {
    backToLogin: string;
    email: string;
    empty: string;
    logout: string;
    title: string;
    user: string;
  };
};

export function AuthStatusCard({ locale, labels }: AuthStatusCardProps) {
  const router = useRouter();
  const [session] = useState<AuthPayload | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return getAuthSession();
  });

  useEffect(() => {
    if (!session) {
      router.replace(`/${locale}/login`);
    }
  }, [locale, router, session]);

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-violet-100 bg-white p-8 shadow-[0_24px_60px_rgba(124,58,237,0.1)]">
      <h1 className="text-3xl font-semibold text-slate-950">{labels.title}</h1>
      <div className="mt-6 space-y-3 rounded-[1.5rem] bg-violet-50/60 p-5 text-slate-700">
        <p>
          <span className="font-semibold">{labels.user}: </span>
          {session.user.name || labels.empty}
        </p>
        <p>
          <span className="font-semibold">{labels.email}: </span>
          {session.user.email || labels.empty}
        </p>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          className="rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
          onClick={() => {
            clearAuthSession();
            router.replace(`/${locale}/login`);
          }}
          type="button"
        >
          {labels.logout}
        </button>
        <Link
          className="rounded-2xl border border-violet-200 px-5 py-3 font-semibold text-violet-700 transition hover:bg-violet-50"
          href={`/${locale}/login`}
        >
          {labels.backToLogin}
        </Link>
      </div>
    </div>
  );
}
