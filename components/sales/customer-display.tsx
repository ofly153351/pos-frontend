"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, ShoppingCart, CheckCircle2, QrCode, Wallet } from "lucide-react";

import {
  subscribeDisplayState,
  WELCOME,
  type DisplayState,
} from "@/lib/customer-display";

const AUTO_RETURN_MS = 12_000; // success → welcome

type Dict = {
  welcomeTitle: string;
  welcomeSub: string;
  items: string;
  subtotal: string;
  discount: string;
  vat: string;
  total: string;
  customer: string;
  payTitle: string;
  payScanQr: string;
  payCash: string;
  amountDue: string;
  successTitle: string;
  successThanks: string;
  change: string;
  fullscreen: string;
  pieces: string;
};

function baht(v: number) {
  return "฿" + v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CustomerDisplay({ dict, storeName }: { dict: Dict; storeName: string }) {
  const [state, setState] = useState<DisplayState>(WELCOME);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeDisplayState(setState);
  }, []);

  // Auto-return to welcome after success — cancel if any new state arrives (next sale).
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (state.phase === "success") {
      timerRef.current = setTimeout(() => setState(WELCOME), AUTO_RETURN_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  function goFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[linear-gradient(160deg,#241b54_0%,#3a2a8c_45%,#5b3fd1_100%)] text-white select-none">
      {/* header */}
      <div className="flex shrink-0 items-center justify-between px-10 py-6">
        <div className="text-2xl font-extrabold tracking-tight">{storeName}</div>
        <button
          onClick={goFullscreen}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20"
        >
          <Maximize2 className="h-4 w-4" />
          {dict.fullscreen}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch px-10 pb-10">
        {state.phase === "welcome" && <Welcome dict={dict} />}
        {state.phase === "selling" && <Selling dict={dict} state={state} />}
        {state.phase === "payment" && <Payment dict={dict} state={state} />}
        {state.phase === "success" && <Success dict={dict} state={state} />}
      </div>
    </div>
  );
}

function Welcome({ dict }: { dict: Dict }) {
  return (
    <div className="m-auto flex flex-col items-center gap-6 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/10 ring-1 ring-white/20">
        <ShoppingCart className="h-14 w-14 text-white/90" />
      </div>
      <div className="text-5xl font-extrabold tracking-tight">{dict.welcomeTitle}</div>
      <div className="text-xl font-medium text-white/70">{dict.welcomeSub}</div>
    </div>
  );
}

function Selling({ dict, state }: { dict: Dict; state: Extract<DisplayState, { phase: "selling" }> }) {
  const pieces = state.items.reduce((n, it) => n + it.qty, 0);
  return (
    <div className="flex w-full gap-8">
      {/* items list */}
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white/[0.06] ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-7 py-4 text-sm font-semibold uppercase tracking-wider text-white/60">
          <span>{dict.items} · {pieces} {dict.pieces}</span>
          {state.customer ? <span>{dict.customer}: {state.customer}</span> : null}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {state.items.map((it, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-3 odd:bg-white/[0.03]">
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/15 px-2 font-mono text-lg font-bold tabular-nums">
                {it.qty}
              </span>
              <span className="flex-1 truncate text-xl font-semibold">{it.name}</span>
              <span className="font-mono text-lg text-white/60 tabular-nums">{baht(it.unitPrice)}</span>
              <span className="w-32 text-right font-mono text-xl font-bold tabular-nums">{baht(it.lineTotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* totals */}
      <div className="flex w-[26rem] shrink-0 flex-col justify-end gap-3 rounded-3xl bg-white/[0.06] p-7 ring-1 ring-white/10">
        <Row label={dict.subtotal} value={baht(state.subtotal)} />
        {state.discount > 0 && <Row label={dict.discount} value={"-" + baht(state.discount)} dim />}
        {state.vat > 0 && <Row label={dict.vat} value={baht(state.vat)} dim />}
        <div className="my-2 border-t border-dashed border-white/20" />
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{dict.total}</span>
          <span className="bg-gradient-to-b from-white to-violet-200 bg-clip-text font-mono text-5xl font-extrabold tabular-nums text-transparent">
            {baht(state.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Payment({ dict, state }: { dict: Dict; state: Extract<DisplayState, { phase: "payment" }> }) {
  const isQr = Boolean(state.qr);
  return (
    <div className="m-auto flex flex-col items-center gap-7 text-center">
      <div className="text-3xl font-bold text-white/80">{dict.payTitle}</div>
      <div className="bg-gradient-to-b from-white to-violet-200 bg-clip-text font-mono text-6xl font-extrabold tabular-nums text-transparent">
        {baht(state.total)}
      </div>
      <div className="text-lg font-medium text-white/60">{dict.amountDue}</div>

      {isQr ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="PromptPay QR" className="h-72 w-72" />
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <QrCode className="h-4 w-4 text-violet-600" />
            {dict.payScanQr}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-8 py-5 text-2xl font-semibold ring-1 ring-white/15">
          <Wallet className="h-7 w-7 text-emerald-300" />
          {dict.payCash}
        </div>
      )}
    </div>
  );
}

function Success({ dict, state }: { dict: Dict; state: Extract<DisplayState, { phase: "success" }> }) {
  return (
    <div className="m-auto flex flex-col items-center gap-6 text-center">
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-300/40 animate-[scale-in_200ms_ease-out_both]">
        <CheckCircle2 className="h-20 w-20 text-emerald-300" />
      </div>
      <div className="text-5xl font-extrabold">{dict.successTitle}</div>
      <div className="font-mono text-3xl font-bold tabular-nums text-white/80">{baht(state.total)}</div>
      {typeof state.change === "number" && state.change > 0 ? (
        <div className="rounded-2xl bg-white/10 px-6 py-3 text-2xl font-semibold ring-1 ring-white/15">
          {dict.change}: <span className="font-mono tabular-nums">{baht(state.change)}</span>
        </div>
      ) : null}
      <div className="mt-2 text-xl font-medium text-white/60">{dict.successThanks}</div>
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-lg ${dim ? "text-white/55" : "text-white/80"}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
