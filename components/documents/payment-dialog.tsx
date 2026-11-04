"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessages } from "@/lib/api-error";
import { todayBusinessDate } from "@/lib/business-date";
import { showApiError } from "@/lib/form-errors";
import { getDocumentPayments, recordDocumentPayment, type RecordPaymentPayload } from "@/services/documents";
import { toast } from "@/components/ui/toast";

type PaymentCopy = {
  title: string; total: string; paid: string; credited: string; remaining: string;
  amount: string; method: string; date: string; note: string;
  methods: Record<RecordPaymentPayload["method"], string>;
  resultFull: string; resultPartial: string; resultOver: string; settles: string;
  confirm: string; cancel: string; success: string; nothingDue: string;
};

const METHODS: RecordPaymentPayload["method"][] = ["cash", "transfer", "qr", "card", "cheque"];

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * B05: payment is an explicit, confirmed action. Shows the debt this document
 * carries (total / paid / credited / remaining), lets the user enter a partial
 * amount, method, date and note, and states the resulting document state
 * before saving. One idempotency key per opened dialog makes retries safe.
 */
export function PaymentDialog({ documentId, open, onClose, onPaid }: {
  documentId: string;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const copy = (getApiErrorMessages() as Record<string, unknown>).payment as PaymentCopy | undefined;
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["document-payments", documentId],
    queryFn: () => getDocumentPayments(documentId),
    enabled: open && !!documentId,
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<RecordPaymentPayload["method"]>("cash");
  const [paidDate, setPaidDate] = useState(todayBusinessDate());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const keyRef = useRef(newKey());

  useEffect(() => {
    if (open) {
      keyRef.current = newKey();
      setPaidDate(todayBusinessDate());
      setNote("");
    }
  }, [open]);
  useEffect(() => {
    if (data) setAmount(data.remaining > 0 ? String(data.remaining) : "");
  }, [data]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);
  useEffect(() => {
    if (isError) showApiError(error);
  }, [isError, error]);

  const value = Number(amount);
  const remaining = data?.remaining ?? 0;
  const result = useMemo(() => {
    if (!copy || !data || !Number.isFinite(value) || value <= 0) return "";
    if (value > remaining + 0.005) return copy.resultOver;
    const after = Math.max(remaining - value, 0);
    return after <= 0.005 ? copy.resultFull : copy.resultPartial.replace("{remaining}", fmt(after));
  }, [copy, data, value, remaining]);

  if (!open || typeof document === "undefined" || !copy) return null;

  const valid = Number.isFinite(value) && value > 0 && value <= remaining + 0.005 && !!paidDate;
  const settles = (data?.balances ?? []).filter((b) => b.remaining > 0).map((b) => b.document_no).join(", ");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await recordDocumentPayment(documentId, { amount: Math.round(value * 100) / 100, method, paid_date: paidDate, note: note.trim() || undefined }, keyRef.current);
      toast.success(copy!.success);
      onPaid();
      onClose();
    } catch (err) {
      showApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="smooth-fade absolute inset-0 bg-slate-900/40" onClick={saving ? undefined : onClose} />
      <form role="dialog" aria-modal="true" onSubmit={submit}
        className="smooth-fade relative z-[91] w-full max-w-md overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-violet-600" />
          <h2 className="text-base font-bold text-slate-900">{copy.title}</h2>
        </div>

        {isPending ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
        ) : data ? (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-violet-50 p-3 text-sm">
              <dt className="text-slate-500">{copy.total}</dt><dd className="text-right font-mono">฿{fmt(data.total)}</dd>
              <dt className="text-slate-500">{copy.paid}</dt><dd className="text-right font-mono">฿{fmt(data.paid)}</dd>
              {data.credited > 0 ? (<><dt className="text-slate-500">{copy.credited}</dt><dd className="text-right font-mono">฿{fmt(data.credited)}</dd></>) : null}
              <dt className="font-semibold text-slate-700">{copy.remaining}</dt><dd className="text-right font-mono font-bold text-violet-700">฿{fmt(remaining)}</dd>
            </dl>
            {remaining <= 0 ? (
              <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{copy.nothingDue}</p>
            ) : (
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-600">{copy.amount}
                  <input type="number" min={0} max={remaining} step="0.01" required autoFocus value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 font-mono text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">{copy.method}
                    <select value={method} onChange={(e) => setMethod(e.target.value as RecordPaymentPayload["method"])}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none">
                      {METHODS.map((m) => <option key={m} value={m}>{copy.methods[m]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">{copy.date}
                    <input type="date" required value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none" />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">{copy.note}
                  <input value={note} onChange={(e) => setNote(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none" />
                </label>
                {settles ? <p className="text-xs text-slate-500">{copy.settles.replace("{documents}", settles)}</p> : null}
                {result ? (
                  <p className={`rounded-xl px-3 py-2 text-sm ${value > remaining + 0.005 ? "bg-amber-50 text-amber-800" : "bg-violet-50 text-violet-800"}`}>{result}</p>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">{copy.cancel}</button>
          {remaining > 0 ? (
            <button type="submit" disabled={!valid || saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{copy.confirm}
            </button>
          ) : null}
        </div>
      </form>
    </div>,
    document.body,
  );
}
