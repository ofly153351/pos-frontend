"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Settings2, X } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { ProductCard, type ProductCardItem } from "@/components/sales/product-card";
import {
  CARD_SIZE_MIN,
  DEFAULT_CARD_SETTINGS,
  loadCardSettings,
  saveCardSettings,
  type CardSettings,
} from "@/lib/card-settings";
import { updateCardSettings } from "@/services/card-settings";

export type CardSettingsDictionary = {
  title: string;
  subtitle: string;
  namePos: string;
  nameBottom: string;
  nameTop: string;
  imageFit: string;
  imageFitHint: string;
  fitCover: string;
  fitContain: string;
  aspect: string;
  nameLines: string;
  nameLinesHint: string;
  line1: string;
  line2: string;
  line3: string;
  cardSize: string;
  sizeSm: string;
  sizeMd: string;
  sizeLg: string;
  stockBadge: string;
  show: string;
  hide: string;
  previewTitle: string;
  livePreview: string;
  reset: string;
  save: string;
  saved: string;
  resetDone: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  dictionary: CardSettingsDictionary;
};

const SAMPLE: (ProductCardItem & { qty: number })[] = [
  { id: "1", name: "โค้ก 1.25L", price: 35, stock: 23, qty: 0 },
  { id: "2", name: "เลย์ บาร์บีคิว รสเข้มข้นพิเศษ สูตรดั้งเดิม ถุงจัมโบ้ 75 กรัม", price: 25, stock: 48, qty: 2 },
  { id: "3", name: "น้ำดื่ม 600ml", price: 10, stock: 89, qty: 0 },
  { id: "4", name: "สบู่ก้อน", price: 29, stock: 0, qty: 0 },
  { id: "5", name: "แชมพูสูตรอ่อนโยน 200ml", price: 89, stock: 10, qty: 0 },
  { id: "6", name: "มาม่า ต้มยำกุ้ง", price: 8, stock: 78, qty: 0 },
];

function SegControl<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { val: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[13.5px] font-bold text-slate-700">{label}</span>
        {hint ? <span className="text-[11.5px] font-normal text-slate-400">{hint}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value === opt.val;
          return (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => onChange(opt.val)}
              className={`min-w-[54px] flex-1 whitespace-nowrap rounded-[10px] border-[1.5px] px-2.5 py-2 text-[13px] font-semibold transition ${
                on
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-violet-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CardSettingsModal({ open, onClose, dictionary: d }: Props) {
  const [cfg, setCfg] = useState<CardSettings>(DEFAULT_CARD_SETTINGS);

  useEffect(() => {
    if (open) setCfg(loadCardSettings());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set<K extends keyof CardSettings>(key: K, val: CardSettings[K]) {
    setCfg((c) => ({ ...c, [key]: val }));
  }

  function handleSave() {
    // Local cache first → instant apply to the grid, then persist per-user on the server.
    saveCardSettings(cfg);
    toast.success(d.saved);
    onClose();
    updateCardSettings(cfg).catch(() => {
      toast.error("บันทึกบนเซิร์ฟเวอร์ไม่สำเร็จ (เก็บไว้ในเครื่องแล้ว)");
    });
  }

  function handleReset() {
    setCfg(DEFAULT_CARD_SETTINGS);
    toast.info(d.resetDone);
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-indigo-950/50 backdrop-blur-sm smooth-fade" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="smooth-fade-up flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3.5 border-b border-violet-100 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-bold text-slate-900">{d.title}</h3>
              <p className="truncate text-[12.5px] text-slate-500">{d.subtitle}</p>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body: settings + preview */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
            {/* Settings */}
            <div className="flex flex-col overflow-y-auto border-b border-violet-100 lg:border-b-0 lg:border-r">
              <div className="space-y-5 p-6">
                <SegControl
                  label={d.namePos}
                  value={cfg.namePos}
                  options={[{ val: "bottom", label: d.nameBottom }, { val: "top", label: d.nameTop }]}
                  onChange={(v) => set("namePos", v)}
                />
                <SegControl
                  label={d.imageFit}
                  hint={d.imageFitHint}
                  value={cfg.fit}
                  options={[{ val: "cover", label: d.fitCover }, { val: "contain", label: d.fitContain }]}
                  onChange={(v) => set("fit", v)}
                />
                <SegControl
                  label={d.aspect}
                  value={cfg.aspect}
                  options={[{ val: "1/1", label: "1:1" }, { val: "4/3", label: "4:3" }, { val: "3/4", label: "3:4" }]}
                  onChange={(v) => set("aspect", v)}
                />
                <SegControl
                  label={d.nameLines}
                  hint={d.nameLinesHint}
                  value={cfg.lines}
                  options={[{ val: 1, label: d.line1 }, { val: 2, label: d.line2 }, { val: 3, label: d.line3 }]}
                  onChange={(v) => set("lines", v)}
                />
                <SegControl
                  label={d.cardSize}
                  value={cfg.size}
                  options={[{ val: "sm", label: d.sizeSm }, { val: "md", label: d.sizeMd }, { val: "lg", label: d.sizeLg }]}
                  onChange={(v) => set("size", v)}
                />
                <SegControl
                  label={d.stockBadge}
                  value={cfg.showStock ? "on" : "off"}
                  options={[{ val: "on", label: d.show }, { val: "off", label: d.hide }]}
                  onChange={(v) => set("showStock", v === "on")}
                />
              </div>
              <div className="mt-auto flex gap-2.5 border-t border-violet-100 p-5">
                <button
                  onClick={handleReset}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-200 px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {d.reset}
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.5)] transition hover:bg-violet-700"
                >
                  <Check className="h-[17px] w-[17px]" />
                  {d.save}
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-violet-100 px-5 py-3.5">
                <span className="text-sm font-bold text-slate-800">{d.previewTitle}</span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {d.livePreview}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[linear-gradient(160deg,#f5f3ff_0%,#faf5ff_45%,#f8fafc_100%)] p-5">
                <div
                  className="grid content-start auto-rows-max gap-3"
                  style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_SIZE_MIN[cfg.size]}, 1fr))` }}
                >
                  {SAMPLE.map((p) => (
                    <ProductCard
                      key={p.id}
                      item={p}
                      config={cfg}
                      qtyInCart={p.qty}
                      onAdd={() => {}}
                      labels={{ stock: "สต็อก", outOfStock: "หมด", add: "เพิ่ม" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
