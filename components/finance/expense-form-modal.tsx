"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Receipt, X } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { EntityCombobox } from "@/components/ui/entity-combobox";
import { ApiError } from "@/services/api";
import { createExpense, createExpenseCategory, updateExpense } from "@/services/expenses";
import type { Expense, ExpenseCategory } from "@/types/expense";
import type { ExpenseDictionary } from "@/components/finance/finance-types";

type Props = {
  dictionary: ExpenseDictionary;
  categories: ExpenseCategory[];
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  /** Called after a new category is created so the parent can refetch its list. */
  onCategoryCreated?: () => void;
};

const PAYMENT_METHODS = ["cash", "bank_transfer", "promptpay", "credit_card", "debit_card", "cheque"] as const;
const CREATE_CATEGORY_VALUE = "__create__";
type FormErrors = Partial<Record<"expense_date" | "category_id" | "description" | "amount", string>>;

export function ExpenseFormModal({ dictionary: t, categories, editing, onClose, onSaved, onCategoryCreated }: Props) {
  const isEdit = editing !== null;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});

  const [date, setDate] = useState(() => (editing ? editing.expense_date.slice(0, 10) : new Date().toISOString().slice(0, 10)));
  const [categoryId, setCategoryId] = useState(() => editing?.category_id ?? "");
  const [description, setDescription] = useState(() => editing?.description ?? "");
  const [amount, setAmount] = useState(() => (editing ? String(editing.amount) : ""));
  const [method, setMethod] = useState(() => editing?.payment_method ?? "cash");
  const [note, setNote] = useState(() => editing?.note ?? "");

  // Inline "create category" — locally appended cats survive until the parent refetches.
  const [localCats, setLocalCats] = useState<ExpenseCategory[]>([]);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const allCategories = useMemo(() => {
    const seen = new Set(categories.map((c) => c.id));
    return [...categories, ...localCats.filter((c) => !seen.has(c.id))];
  }, [categories, localCats]);

  function onCategorySelect(value: string) {
    if (value === CREATE_CATEGORY_VALUE) {
      setCreatingCat(true);
      setCatError("");
      return;
    }
    setCategoryId(value);
  }

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) {
      setCatError(t.form.errCategoryName);
      return;
    }
    setCatSaving(true);
    setCatError("");
    try {
      const created = (await createExpenseCategory({ name })).data;
      setLocalCats((prev) => [...prev, created]);
      setCategoryId(created.id);
      setCreatingCat(false);
      setNewCatName("");
      setErrors((e) => ({ ...e, category_id: undefined }));
      onCategoryCreated?.();
    } catch (err) {
      setCatError(err instanceof ApiError ? err.message : t.form.errCategoryName);
    } finally {
      setCatSaving(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!date) e.expense_date = t.form.errDate;
    if (!categoryId) e.category_id = t.form.errCategory;
    if (!description.trim()) e.description = t.form.errDescription;
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) e.amount = t.form.errAmount;
    return e;
  }

  function handleSave() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      expense_date: date,
      category_id: categoryId,
      description: description.trim(),
      amount: Number(amount),
      payment_method: method,
      note: note.trim() || undefined,
    };

    startTransition(async () => {
      try {
        if (isEdit && editing) {
          await updateExpense(editing.id, payload);
          toast.success(t.toast.updated);
        } else {
          await createExpense(payload);
          toast.success(t.toast.created);
        }
        onSaved();
        onClose();
      } catch (err) {
        if (err instanceof ApiError && err.fields?.length) {
          setErrors(err.fieldMap() as FormErrors);
        } else {
          toast.error(err instanceof ApiError ? err.message : t.toast.error);
        }
      }
    });
  }

  const inputBase = "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-100";
  const inputNormal = `${inputBase} border-violet-200 focus:border-violet-400`;
  const inputError = `${inputBase} border-red-300 focus:border-red-400 focus:ring-red-100`;
  const labelCls = "mb-1 block text-xs font-semibold text-slate-600";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(124,58,237,0.18)]" style={{ maxHeight: "92vh" }}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-violet-600 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white"><Receipt className="h-4 w-4" /></span>
              <div>
                <h4 className="text-base font-bold text-white">{isEdit ? t.form.editTitle : t.form.addTitle}</h4>
                <p className="text-xs text-violet-100">{t.form.subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-violet-100 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t.form.date} <span className="text-red-500">*</span></label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={errors.expense_date ? inputError : inputNormal} />
                {errors.expense_date ? <p className="mt-1 text-xs text-red-500">{errors.expense_date}</p> : null}
              </div>
              <div>
                <label className={labelCls}>{t.form.category} <span className="text-red-500">*</span></label>
                {creatingCat ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        maxLength={60}
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateCategory(); } }}
                        placeholder={t.form.newCategoryPlaceholder}
                        className={catError ? inputError : inputNormal}
                      />
                      <button type="button" onClick={() => void handleCreateCategory()} disabled={catSaving} title={t.form.addCategory}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-60">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => { setCreatingCat(false); setNewCatName(""); setCatError(""); }} title={t.form.cancelCategory}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {catError ? <p className="text-xs text-red-500">{catError}</p> : null}
                  </div>
                ) : (
                  <div className={errors.category_id ? inputError : inputNormal}>
                    <EntityCombobox
                      items={allCategories.map((c) => ({ id: c.id, label: c.name }))}
                      value={categoryId}
                      onChange={onCategorySelect}
                      clearable
                      labels={{
                        placeholder: t.form.categoryPlaceholder,
                        noResults: t.form.noCategoryMatch ?? t.form.categoryPlaceholder,
                      }}
                      footerOption={{
                        id: CREATE_CATEGORY_VALUE,
                        label: `+ ${t.form.createCategory}`,
                        onPick: () => onCategorySelect(CREATE_CATEGORY_VALUE),
                      }}
                    />
                  </div>
                )}
                {!creatingCat && errors.category_id ? <p className="mt-1 text-xs text-red-500">{errors.category_id}</p> : null}
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>{t.form.description} <span className="text-red-500">*</span></label>
              <input type="text" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.form.descriptionPlaceholder} className={errors.description ? inputError : inputNormal} />
              {errors.description ? <p className="mt-1 text-xs text-red-500">{errors.description}</p> : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t.form.amount} <span className="text-red-500">*</span></label>
                <input type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.form.amountPlaceholder} className={errors.amount ? inputError : inputNormal} />
                {errors.amount ? <p className="mt-1 text-xs text-red-500">{errors.amount}</p> : null}
              </div>
              <div>
                <label className={labelCls}>{t.form.method}</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputNormal} appearance-none`}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{t.method[m]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>{t.form.note}</label>
              <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.form.notePlaceholder} className={`${inputNormal} resize-none`} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {t.form.cancel}
            </button>
            <button type="button" onClick={handleSave} disabled={isPending} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {isPending ? t.form.saving : t.form.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
