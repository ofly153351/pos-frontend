"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  Monitor,
  Printer,
  QrCode,
  ReceiptText,
  Save,
  Smartphone,
  Upload,
  Wallet,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { getReceiptSettings, updateReceiptSettings, fetchReceiptPreviewHTML } from "@/services/receipt-settings";
import { getStoreById } from "@/services/stores";
import { getCurrentStoreId } from "@/lib/store-storage";
import type { ReceiptSettingsData, UpdateReceiptSettingsInput, PaymentChannelSetting } from "@/types/receipt-settings";
import type { Store as StoreType } from "@/types/store";

// ── Types ─────────────────────────────────────────────────────────────────────
type TaxMode = "none" | "inclusive" | "exclusive";
type PaperSize = "58mm" | "80mm" | "a4";
type LogoPosition = "top_center" | "top_left" | "top_right";
type TabKey = "receipt" | "payment" | "promptpay" | "printer" | "display";

interface PaymentChannel {
  key: string;
  name: string;
  enabled: boolean;
  color: string;
  icon: React.ReactNode;
}

const CHANNEL_META: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  cash:      { name: "เงินสด (Cash)",            color: "bg-emerald-500", icon: <Wallet     className="h-4 w-4" /> },
  card:      { name: "บัตรเครดิต / เดบิต",        color: "bg-blue-500",    icon: <CreditCard className="h-4 w-4" /> },
  qr:        { name: "โอนเงิน / QR Code",          color: "bg-orange-500",  icon: <QrCode     className="h-4 w-4" /> },
  promptpay: { name: "PromptPay (พร้อมเพย์)",      color: "bg-violet-600",  icon: <Smartphone className="h-4 w-4" /> },
  truemoney: { name: "TrueMoney Wallet",           color: "bg-orange-400",  icon: <Wallet     className="h-4 w-4" /> },
  shopeepay: { name: "ShopeePay",                  color: "bg-rose-500",    icon: <Smartphone className="h-4 w-4" /> },
};

function toChannels(raw: PaymentChannelSetting[]): PaymentChannel[] {
  return raw.map((ch) => ({
    key: ch.key,
    enabled: ch.enabled,
    ...(CHANNEL_META[ch.key] ?? { name: ch.key, color: "bg-slate-500", icon: <Wallet className="h-4 w-4" /> }),
  }));
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "receipt",   label: "ใบเสร็จ",       icon: <ReceiptText className="h-4 w-4" /> },
  { key: "payment",   label: "การชำระเงิน",    icon: <CreditCard  className="h-4 w-4" /> },
  { key: "promptpay", label: "PromptPay",      icon: <QrCode      className="h-4 w-4" /> },
  { key: "printer",   label: "เครื่องพิมพ์",   icon: <Printer     className="h-4 w-4" /> },
  { key: "display",   label: "การแสดงผล",      icon: <Monitor     className="h-4 w-4" /> },
];

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-base font-bold text-slate-800">{children}</h3>;
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-slate-700">{children}</span>
      {hint && <span className="ml-1.5 text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const selectCls = "w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

// ── Tab panels ────────────────────────────────────────────────────────────────
function ReceiptTab({ settings, onChange }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>เทมเพลตใบเสร็จ</SectionTitle>
        <FieldLabel>รูปแบบใบเสร็จ</FieldLabel>
        <select className={selectCls} value={settings.template_key} onChange={(e) => onChange({ template_key: e.target.value })}>
          <option value="modern_classic">Modern Classic</option>
          <option value="minimal">Minimal</option>
          <option value="classic">Classic</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>กระดาษใบเสร็จ</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>ขนาดกระดาษ</FieldLabel>
            <select className={selectCls} value={settings.paper_size} onChange={(e) => onChange({ paper_size: e.target.value as PaperSize })}>
              <option value="58mm">58mm (Thermal)</option>
              <option value="80mm">80mm (Thermal)</option>
              <option value="a4">A4</option>
            </select>
          </div>
          <div>
            <FieldLabel>ความยาวใบเสร็จ</FieldLabel>
            <select className={selectCls} value={settings.paper_length} onChange={(e) => onChange({ paper_length: e.target.value })}>
              <option value="auto">Auto (แบบน้ำ)</option>
              <option value="150mm">Fixed 150mm</option>
              <option value="200mm">Fixed 200mm</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>การแสดงภาษี</SectionTitle>
        <div className="mb-4 flex gap-2">
          {(["none", "inclusive", "exclusive"] as TaxMode[]).map((mode) => {
            const labels: Record<TaxMode, string> = { none: "ไม่แสดงภาษี", inclusive: "รวมภาษีแล้ว", exclusive: "แยกภาษี (VAT)" };
            const active = settings.tax_mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ tax_mode: mode })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200 bg-white text-slate-600 hover:border-violet-400"}`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
        <div className={`grid grid-cols-2 gap-3 ${settings.tax_mode === "none" ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <FieldLabel>อัตรา VAT</FieldLabel>
            <select className={selectCls} value={settings.vat_rate} onChange={(e) => onChange({ vat_rate: Number(e.target.value) })}>
              <option value={7}>7% (มาตรฐาน)</option>
              <option value={0}>0%</option>
            </select>
          </div>
          <div>
            <FieldLabel>ระบุภาษี</FieldLabel>
            <input className={inputCls} value={settings.tax_label} onChange={(e) => onChange({ tax_label: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>การแสดงโลโก้</SectionTitle>
          <Toggle checked={settings.show_logo} onChange={(v) => onChange({ show_logo: v })} />
        </div>
        <div className={`space-y-3 ${!settings.show_logo ? "pointer-events-none opacity-40" : ""}`}>
          <button type="button" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">
            <Upload className="h-4 w-4" /> เปลี่ยนโลโก้
          </button>
          <div>
            <FieldLabel>ตำแหน่งโลโก้</FieldLabel>
            <select className={selectCls} value={settings.logo_position} onChange={(e) => onChange({ logo_position: e.target.value as LogoPosition })}>
              <option value="top_center">ด้านบน (กึ่งกลาง)</option>
              <option value="top_left">ด้านบน (ซ้าย)</option>
              <option value="top_right">ด้านบน (ขวา)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>ข้อมูลร้านในใบเสร็จ</SectionTitle>
        <div className="space-y-3">
          {([
            ["show_store_name", "ชื่อร้าน"],
            ["show_address",    "ที่อยู่"],
            ["show_phone",      "เบอร์โทรศัพท์"],
            ["show_tax_id",     "เลขประจำตัวผู้เสียภาษี"],
          ] as [keyof ReceiptSettingsData, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <Toggle checked={settings[key] as boolean} onChange={(v) => onChange({ [key]: v })} />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>ข้อความท้ายใบเสร็จ (Footer)</SectionTitle>
        <textarea
          className={`${inputCls} resize-none`}
          rows={5}
          maxLength={300}
          value={settings.footer_text}
          onChange={(e) => onChange({ footer_text: e.target.value })}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{settings.footer_text.length} / 300</p>
      </div>
    </div>
  );
}

function PaymentTab({ channels, onChange }: { channels: PaymentChannel[]; onChange: (key: string, enabled: boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>ช่องทางการชำระเงิน</SectionTitle>
        <p className="mb-4 text-xs text-slate-500">เปิดใช้งานช่องทางการชำระเงินที่ต้องการรับ</p>
        <div className="space-y-1">
          {channels.map((ch) => (
            <div
              key={ch.key}
              className={`flex items-center gap-3 rounded-xl px-4 py-4 transition ${ch.enabled ? "bg-violet-50/60" : "bg-slate-50"}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${ch.color}`}>
                {ch.icon}
              </span>
              <span className={`flex-1 text-sm font-medium ${ch.enabled ? "text-slate-800" : "text-slate-400"}`}>{ch.name}</span>
              <Toggle checked={ch.enabled} onChange={(v) => onChange(ch.key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromptPayTab({ settings, store, onChange }: { settings: ReceiptSettingsData; store: StoreType | null; onChange: (p: Partial<ReceiptSettingsData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>ข้อมูล PromptPay</SectionTitle>
        <div className="space-y-4">
          <div>
            <FieldLabel>หมายเลขพร้อมเพย์</FieldLabel>
            <input
              className={inputCls}
              value={store?.promptpay_id ?? ""}
              readOnly
              placeholder="ยังไม่ได้ตั้งค่า — กรุณาแก้ไขที่หน้าข้อมูลร้าน"
            />
            <p className="mt-1 text-xs text-slate-400">แก้ไขได้ที่ <Link href="../" className="text-violet-600 hover:underline">ตั้งค่าร้านค้า</Link></p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>QR Code บนใบเสร็จ</SectionTitle>
          <Toggle checked={settings.show_qr} onChange={(v) => onChange({ show_qr: v })} />
        </div>
        <div className={`space-y-3 ${!settings.show_qr ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <FieldLabel>ขนาด QR</FieldLabel>
            <select className={selectCls} value={settings.qr_size} onChange={(e) => onChange({ qr_size: e.target.value as ReceiptSettingsData["qr_size"] })}>
              <option value="small">เล็ก (Small)</option>
              <option value="medium">กลาง (Medium)</option>
              <option value="large">ใหญ่ (Large)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrinterTab({ settings, onChange }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>การตั้งค่าเครื่องพิมพ์</SectionTitle>
        <div className="space-y-4">
          <div>
            <FieldLabel>ประเภทเครื่องพิมพ์</FieldLabel>
            <select className={selectCls} value={settings.printer_type} onChange={(e) => onChange({ printer_type: e.target.value as ReceiptSettingsData["printer_type"] })}>
              <option value="thermal">Thermal</option>
              <option value="inkjet">Inkjet</option>
              <option value="pdf">PDF Export</option>
            </select>
          </div>
          <div>
            <FieldLabel>ชื่อเครื่องพิมพ์</FieldLabel>
            <input className={inputCls} value={settings.printer_name} onChange={(e) => onChange({ printer_name: e.target.value })} placeholder="ระบุชื่อเครื่องพิมพ์..." />
          </div>
          <div className="flex items-center justify-between">
            <FieldLabel>พิมพ์อัตโนมัติหลังชำระเงิน</FieldLabel>
            <Toggle checked={settings.auto_print} onChange={(v) => onChange({ auto_print: v })} />
          </div>
          <div>
            <FieldLabel>จำนวนสำเนา</FieldLabel>
            <input type="number" min={1} max={5} className={inputCls} value={settings.copies} onChange={(e) => onChange({ copies: Math.min(5, Math.max(1, Number(e.target.value))) })} />
          </div>
        </div>
      </div>
      <button type="button" className="w-full rounded-xl border border-violet-200 bg-white py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50">
        <Printer className="mr-2 inline h-4 w-4" />พิมพ์หน้าทดสอบ
      </button>
    </div>
  );
}

function DisplayTab({ settings, onChange }: { settings: ReceiptSettingsData; onChange: (p: Partial<ReceiptSettingsData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <SectionTitle>การแสดงผล</SectionTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FieldLabel>หน้าจอลูกค้า (Customer Display)</FieldLabel>
            <Toggle checked={settings.show_customer_display} onChange={(v) => onChange({ show_customer_display: v })} />
          </div>
          <div className="flex items-center justify-between">
            <FieldLabel>แสดงรูปสินค้าบนใบเสร็จ</FieldLabel>
            <Toggle checked={settings.show_product_images} onChange={(v) => onChange({ show_product_images: v })} />
          </div>
          <div>
            <FieldLabel>รูปแบบวันที่</FieldLabel>
            <select className={selectCls} value={settings.date_format} onChange={(e) => onChange({ date_format: e.target.value })}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <FieldLabel>รูปแบบเวลา</FieldLabel>
            <select className={selectCls} value={settings.time_format} onChange={(e) => onChange({ time_format: e.target.value as ReceiptSettingsData["time_format"] })}>
              <option value="24h">24 ชั่วโมง</option>
              <option value="12h">12 ชั่วโมง (AM/PM)</option>
            </select>
          </div>
          <div>
            <FieldLabel>ตำแหน่งสกุลเงิน</FieldLabel>
            <select className={selectCls} value={settings.currency_position} onChange={(e) => onChange({ currency_position: e.target.value as ReceiptSettingsData["currency_position"] })}>
              <option value="before">ก่อน (฿100)</option>
              <option value="after">หลัง (100฿)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ReceiptPaymentSettings() {
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    setStoreId(getCurrentStoreId() ?? "");
  }, []);

  // ── Server state ──────────────────────────────────────────────────────────
  const { data: remoteSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["receipt-settings", storeId],
    queryFn: async () => {
      const res = await getReceiptSettings();
      return res.data;
    },
    enabled: !!storeId,
  });

  const { data: storeData } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const res = await getStoreById(storeId);
      return res.data;
    },
    enabled: !!storeId,
  });

  const saveMutation = useMutation({
    mutationFn: (input: UpdateReceiptSettingsInput) => updateReceiptSettings(input),
    onSuccess: (res) => {
      queryClient.setQueryData(["receipt-settings", storeId], res.data);
      setLocalSettings(res.data);
      setIsDirty(false);
      toast.success("บันทึกการเปลี่ยนแปลงเรียบร้อย");
    },
    onError: () => {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    },
  });

  // ── Local (draft) state ───────────────────────────────────────────────────
  const [localSettings, setLocalSettings] = useState<ReceiptSettingsData | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Live preview (iframe srcdoc) ─────────────────────────────────────────
  const [previewSrcdoc, setPreviewSrcdoc] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshPreview(settings: ReceiptSettingsData) {
    if (!storeId) return;
    setPreviewLoading(true);
    try {
      const { id, store_id, created_at, updated_at, ...input } = settings;
      const html = await fetchReceiptPreviewHTML(input);
      if (typeof html === "string") setPreviewSrcdoc(html);
    } catch {
      // silently ignore preview errors
    } finally {
      setPreviewLoading(false);
    }
  }

  // Hydrate local state once remote data arrives
  useEffect(() => {
    if (remoteSettings && !isDirty) {
      setLocalSettings(remoteSettings);
      refreshPreview(remoteSettings);
    }
  }, [remoteSettings, isDirty]);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("receipt");
  const [prevTab, setPrevTab]     = useState<TabKey | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  const tabIndex = (k: TabKey) => TABS.findIndex((t) => t.key === k);

  function switchTab(next: TabKey) {
    if (next === activeTab || animating) return;
    setDirection(tabIndex(next) > tabIndex(activeTab) ? "right" : "left");
    setPrevTab(activeTab);
    setAnimating(true);
    setActiveTab(next);
    setTimeout(() => { setPrevTab(null); setAnimating(false); }, 300);
  }

  function schedulePreview(next: ReceiptSettingsData) {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => refreshPreview(next), 500);
  }

  function update(patch: Partial<ReceiptSettingsData>) {
    setLocalSettings((s) => {
      const next = s ? { ...s, ...patch } : s;
      if (next) schedulePreview(next);
      return next;
    });
    setIsDirty(true);
  }

  function updateChannel(key: string, enabled: boolean) {
    setLocalSettings((s) => {
      if (!s) return s;
      const next = {
        ...s,
        payment_channels: s.payment_channels.map((ch) =>
          ch.key === key ? { ...ch, enabled } : ch,
        ),
      };
      schedulePreview(next);
      return next;
    });
    setIsDirty(true);
  }

  async function handleSave() {
    if (!localSettings) return;
    const { id, store_id, created_at, updated_at, ...input } = localSettings;
    saveMutation.mutate(input);
  }

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function panelClass(key: TabKey): string {
    const isActive = key === activeTab;
    const isExiting = key === prevTab;
    if (isActive && animating) {
      return direction === "right"
        ? "translate-x-full opacity-0 transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        : "-translate-x-full opacity-0 transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]";
    }
    if (isActive) return "translate-x-0 opacity-100";
    if (isExiting) {
      return direction === "right"
        ? "-translate-x-[40%] opacity-0 transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        : "translate-x-[40%] opacity-0 transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]";
    }
    return "hidden";
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (settingsLoading || !localSettings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const channels = toChannels(localSettings.payment_channels);

  const panelContent: Record<TabKey, React.ReactNode> = {
    receipt:   <ReceiptTab   settings={localSettings} onChange={update} />,
    payment:   <PaymentTab   channels={channels}       onChange={updateChannel} />,
    promptpay: <PromptPayTab settings={localSettings} store={storeData ?? null} onChange={update} />,
    printer:   <PrinterTab   settings={localSettings} onChange={update} />,
    display:   <DisplayTab   settings={localSettings} onChange={update} />,
  };

  const isSaving = saveMutation.isPending;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 shrink-0 rounded-2xl border border-violet-100 bg-white px-6 py-5 shadow-sm">
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="../" className="hover:text-violet-600">ตั้งค่าระบบ</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">ใบเสร็จและการชำระเงิน</span>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 shadow-sm">
              <ReceiptText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">ใบเสร็จและการชำระเงิน</h1>
              <p className="mt-0.5 text-sm text-slate-500">ตั้งค่ารูปแบบใบเสร็จ ช่องทางการชำระเงิน และเครื่องพิมพ์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">

        {/* ── Left: Preview (iframe — identical to real receipt) ─────────── */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
            <span className="text-sm font-bold text-slate-800">ตัวอย่างใบเสร็จ</span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
              {previewLoading
                ? <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              {previewLoading ? "กำลังอัปเดต..." : "Layout จริง"}
            </span>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {previewSrcdoc ? (
              <iframe
                srcDoc={previewSrcdoc}
                title="receipt-preview"
                className="h-full w-full border-0"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Tabs + Content ───────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-violet-100 bg-gradient-to-r from-violet-50/70 to-white px-4 py-2">
            {TABS.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchTab(tab.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {TABS.map((tab) => {
              const cls = panelClass(tab.key);
              if (cls === "hidden") return null;
              return (
                <div
                  key={tab.key}
                  className={`pretty-scroll absolute inset-0 overflow-y-auto p-6 ${cls}`}
                >
                  {panelContent[tab.key]}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
