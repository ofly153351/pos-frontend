"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Trash2, X } from "lucide-react";

import { authorizedApiRequest } from "@/services/api";
import { getCurrentStoreId } from "@/lib/store-storage";
import { createDocument } from "@/services/documents";
import { toast } from "@/components/ui/toast";
import type { CreateDocumentPayload, DocumentType } from "@/types/document";

type Customer = { id: string; full_name: string };

type Dict = {
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  documentDate: string;
  optionalDueDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  amount: string;
  addItem: string;
  enableVat: string;
  notes: string;
  subtotal: string;
  total: string;
  cancel: string;
  create: string;
  creating?: string;
  createSuccess: string;
  createError: string;
  typeInvoice: string;
  typeReceipt: string;
  typeTaxInvoice: string;
  typeQuotation: string;
  typeBill: string;
  typeCreditNote: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  discount_type: "" | "PERCENT" | "AMOUNT";
  discount_value: number;
};

type Props = {
  dict: Dict;
  initialType: DocumentType;
  onClose: () => void;
  onSuccess: () => void;
};

const TYPE_LABELS: Record<DocumentType, keyof Dict> = {
  INVOICE: "typeInvoice", RECEIPT: "typeReceipt", TAX_INVOICE: "typeTaxInvoice",
  QUOTATION: "typeQuotation", BILL: "typeBill", CREDIT_NOTE: "typeCreditNote",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function lineAmount(item: LineItem): number {
  let amt = item.quantity * item.unit_price;
  if (item.discount_type === "PERCENT") amt -= amt * item.discount_value / 100;
  if (item.discount_type === "AMOUNT") amt -= item.discount_value;
  return Math.max(0, amt);
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
}

export function CreateDocumentModal({ dict: d, initialType, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isClosing, setIsClosing] = useState(false);
  const [docType, setDocType] = useState<DocumentType>(initialType);
  const [customerId, setCustomerId] = useState("");
  const [docDate, setDocDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, discount_type: "", discount_value: 0 },
  ]);
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => { setStoreId(getCurrentStoreId()); }, []);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers-simple", storeId],
    queryFn: async () => {
      const res = await authorizedApiRequest<Customer[]>(`/api/stores/${storeId}/customers`);
      return res.data;
    },
    enabled: !!storeId,
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") triggerClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerClose() { setIsClosing(true); }
  function handleAnimEnd() { if (isClosing) onClose(); }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, discount_type: "", discount_value: 0 }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem<K extends keyof LineItem>(i: number, key: K, value: LineItem[K]) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  }

  const subtotal = items.reduce((s, item) => s + lineAmount(item), 0);
  const vatAmount = vatEnabled ? subtotal * 0.07 : 0;
  const total = subtotal + vatAmount;

  function handleSave() {
    setError("");
    if (!customerId) { setError(d.selectCustomer); return; }
    if (items.some((it) => !it.description || it.quantity <= 0)) {
      setError(d.description + " / " + d.quantity); return;
    }

    const payload: CreateDocumentPayload = {
      type: docType,
      customer_id: customerId,
      document_date: docDate,
      due_date: dueDate || undefined,
      vat_rate: vatEnabled ? 7 : 0,
      notes: notes || undefined,
      items: items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_type: it.discount_type,
        discount_value: it.discount_value,
      })),
    };

    startTransition(async () => {
      try {
        await createDocument(payload);
        toast.success(d.createSuccess);
        onSuccess();
      } catch {
        setError(d.createError);
      }
    });
  }

  const docTypeLabel = d[TYPE_LABELS[docType]] as string;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 ${isClosing ? "fade-out" : "smooth-fade"}`}
        onClick={triggerClose}
      />
      <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4">
        <div
          className={`flex h-full flex-col overflow-hidden bg-white md:h-auto md:max-h-[90vh] md:w-full md:max-w-3xl md:rounded-2xl md:shadow-[0_24px_60px_rgba(124,58,237,0.18)] ${isClosing ? "fade-out" : "smooth-fade-up"}`}
          onAnimationEnd={handleAnimEnd}
        >
          {/* Accent */}
          <div className="h-1 shrink-0 bg-violet-600" />

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-violet-600 px-6 py-4 text-white">
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold">{d.createTitle}</h4>
              <p className="text-xs text-violet-200">{d.createSubtitle}</p>
            </div>
            {/* Type tabs */}
            <div className="hidden items-center gap-1 rounded-lg bg-violet-700/50 p-1 md:flex">
              {(Object.keys(TYPE_LABELS) as DocumentType[]).map((t) => (
                <button
                  key={t}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    docType === t ? "bg-white text-violet-700" : "text-violet-200 hover:text-white"
                  }`}
                  onClick={() => setDocType(t)}
                  type="button"
                >
                  {d[TYPE_LABELS[t]] as string}
                </button>
              ))}
            </div>
            <button
              className="rounded-xl p-2 text-violet-200 transition-colors hover:bg-violet-700 hover:text-white"
              onClick={triggerClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Mobile type select */}
            <div className="mb-4 md:hidden">
              <select
                className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
              >
                {(Object.keys(TYPE_LABELS) as DocumentType[]).map((t) => (
                  <option key={t} value={t}>{d[TYPE_LABELS[t]] as string}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Customer */}
              <div className="md:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.selectCustomer}
                </label>
                <select
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">— {d.selectCustomer} —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Document date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.documentDate}
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                />
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.optionalDueDate}
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="mt-4">
              <div className="overflow-hidden rounded-xl border border-violet-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5 text-left">{d.description}</th>
                      <th className="w-20 px-3 py-2.5 text-center">{d.quantity}</th>
                      <th className="w-28 px-3 py-2.5 text-right">{d.unitPrice}</th>
                      <th className="w-32 px-3 py-2.5 text-right">{d.amount}</th>
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            placeholder={d.description}
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(i, "quantity", Math.max(1, item.quantity - 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200">
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number" min={1}
                              className="w-12 rounded-lg border border-violet-200 px-1.5 py-1.5 text-center text-sm outline-none focus:border-violet-400"
                              value={item.quantity}
                              onChange={(e) => updateItem(i, "quantity", Math.max(1, Number(e.target.value)))}
                            />
                            <button type="button" onClick={() => updateItem(i, "quantity", item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} step="0.01"
                            className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-right font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            value={item.unit_price}
                            onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-slate-800">
                          {fmt(lineAmount(item))}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            disabled={items.length === 1}
                            onClick={() => removeItem(i)}
                            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-violet-100 bg-violet-50/30 px-3 py-2">
                  <button
                    className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700"
                    onClick={addItem}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {d.addItem}
                  </button>
                </div>
              </div>
            </div>

            {/* Totals + VAT toggle + Notes */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.notes}
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-xl border border-violet-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder={d.notes}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2 rounded-xl border border-violet-100 p-4">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{d.subtotal}</span>
                  <span className="font-mono tabular-nums">{fmt(subtotal)}</span>
                </div>
                <label className="flex cursor-pointer items-center justify-between">
                  <span className="text-sm text-slate-600">{d.enableVat}</span>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${vatEnabled ? "bg-violet-600" : "bg-slate-200"}`}
                    onClick={() => setVatEnabled(!vatEnabled)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${vatEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </label>
                {vatEnabled && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>VAT 7%</span>
                    <span className="font-mono tabular-nums">{fmt(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-violet-100 pt-2 font-semibold text-slate-800">
                  <span>{d.total}</span>
                  <span className="font-mono tabular-nums text-violet-700">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-gradient-to-r from-violet-50/40 to-white px-6 py-4">
            <button
              className="flex-1 rounded-xl border border-violet-200 bg-white py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
              onClick={triggerClose}
              type="button"
            >
              {d.cancel}
            </button>
            <button
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/60 transition-all hover:bg-violet-700 disabled:opacity-60"
              disabled={isPending}
              onClick={handleSave}
              type="button"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{d.creating ?? d.create}</>
              ) : (
                <><Plus className="h-4 w-4" />{d.create} — {docTypeLabel}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
