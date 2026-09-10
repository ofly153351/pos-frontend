"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Flame,
  Gift,
  Grid3x3,
  LayoutList,
  Megaphone,
  Package,
  Pause,
  Pencil,
  Percent,
  Play,
  Plus,
  Star,
  Store,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ReportKpiCard } from "@/components/reports/report-kpi-card";
import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import type { Locale } from "@/lib/locale-config";
import { evaluatePromotion } from "./promotion-engine";
import { createPromotion, deletePromotion, listPromotions, updatePromotion } from "@/services/promotions";
import type {
  Campaign,
  CampaignStatus,
  CustomerType,
  CylinderSize,
  LimitType,
  PromotionDictionary,
  PromotionType,
  ScopeType,
} from "./promotion-types";
import { ScopePicker } from "./scope-picker";

// ── Constants ────────────────────────────────────────────────────────────────

// Promotions are persisted server-side (see services/promotions).

const CAMPAIGN_ICONS = [
  "🎉","🔥","⚡","💰","🎁","🛍️","⭐","🏷️","🎯","💎","🚀","✨","🎪","🌟","🎶","🍀",
];

const CAMPAIGN_COLORS: Record<string, { band: string; bg: string; text: string }> = {
  violet:  { band: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700" },
  blue:    { band: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
  emerald: { band: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  amber:   { band: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
  rose:    { band: "bg-rose-500",    bg: "bg-rose-50",    text: "text-rose-700" },
  slate:   { band: "bg-slate-500",   bg: "bg-slate-50",   text: "text-slate-700" },
};

const PROMO_TYPE_ICONS: Record<PromotionType, React.ReactNode> = {
  percentage:       <Percent className="h-4 w-4" />,
  fixed_amount:     <Tag className="h-4 w-4" />,
  fixed_price:      <Star className="h-4 w-4" />,
  buy_x_get_y:      <Gift className="h-4 w-4" />,
  spend_x_discount: <TrendingUp className="h-4 w-4" />,
  spend_x_gift:     <Package className="h-4 w-4" />,
  bundle:           <Megaphone className="h-4 w-4" />,
  member_price:     <Star className="h-4 w-4" />,
  coupon:           <Ticket className="h-4 w-4" />,
  happy_hour:       <Clock className="h-4 w-4" />,
  cylinder_exchange:<Flame className="h-4 w-4" />,
};

const ALL_PROMO_TYPES: PromotionType[] = [
  "percentage","fixed_amount","fixed_price","buy_x_get_y",
  "spend_x_discount","spend_x_gift","bundle","member_price","coupon","happy_hour",
  "cylinder_exchange",
];

const DAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"] as const;

const CYLINDER_SIZES: CylinderSize[] = ["7kg", "15kg", "48kg"];

/** Maps PromotionType to its `*Desc` key in PromotionDictionary.type */
const PROMO_TYPE_DESC_KEYS: Record<PromotionType, keyof PromotionDictionary["type"]> = {
  percentage:       "percentageDesc",
  fixed_amount:     "fixedAmountDesc",
  fixed_price:      "fixedPriceDesc",
  buy_x_get_y:      "buyXGetYDesc",
  spend_x_discount: "spendXDiscountDesc",
  spend_x_gift:     "spendXGiftDesc",
  bundle:           "bundleDesc",
  member_price:     "memberPriceDesc",
  coupon:           "couponDesc",
  happy_hour:       "happyHourDesc",
  cylinder_exchange:"cylinderExchangeDesc",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeDisplayStatus(c: Campaign): CampaignStatus {
  if (c.status === "draft" || c.status === "paused") return c.status;
  const now = new Date();
  if (c.startDate && new Date(c.startDate) > now) return "scheduled";
  if (c.endDate && new Date(c.endDate) < now) return "expired";
  return "active";
}

function defaultForm(): Partial<Campaign> {
  return {
    icon: "🎉",
    color: "violet",
    type: undefined,
    status: "active",
    scopeType: "store",
    scopeIds: [],
    vipOnly: false,
    memberOnly: false,
    customerTypes: [],
    cylinderTypes: [],
    daysOfWeek: [],
    limitType: "unlimited",
    stackable: true,
    conflictRule: "stack",
    priority: 1,
  };
}

function buildCampaign(form: Partial<Campaign>, allCount: number): Campaign {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: form.name ?? "",
    description: form.description ?? "",
    icon: form.icon ?? "🎉",
    color: form.color ?? "violet",
    type: form.type as PromotionType,
    status: form.status ?? "active",
    priority: form.priority ?? allCount + 1,
    percentOff: form.percentOff,
    amountOff: form.amountOff,
    fixedPrice: form.fixedPrice,
    originalPrice: form.originalPrice,
    buyQty: form.buyQty,
    getQty: form.getQty,
    freeProduct: form.freeProduct,
    minSpend: form.minSpend,
    discountAmount: form.discountAmount,
    giftDescription: form.giftDescription,
    bundlePrice: form.bundlePrice,
    memberPrice: form.memberPrice,
    memberLevels: form.memberLevels,
    couponCode: form.couponCode,
    cylinderTypes: form.cylinderTypes,
    exchangeDiscount: form.exchangeDiscount,
    scopeType: form.scopeType ?? "store",
    scopeIds: form.scopeIds ?? [],
    minAmount: form.minAmount,
    minQty: form.minQty,
    vipOnly: form.vipOnly ?? false,
    memberOnly: form.memberOnly ?? false,
    customerTypes: form.customerTypes,
    startDate: form.startDate,
    endDate: form.endDate,
    daysOfWeek: form.daysOfWeek ?? [],
    happyHourStart: form.happyHourStart,
    happyHourEnd: form.happyHourEnd,
    limitType: form.limitType ?? "unlimited",
    totalLimit: form.totalLimit,
    perCustomerLimit: form.perCustomerLimit,
    dailyLimit: form.dailyLimit,
    stackable: form.stackable ?? true,
    conflictRule: form.conflictRule ?? "stack",
    usageCount: 0,
    usageToday: 0,
    revenueGenerated: 0,
    discountGiven: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" });
}

function fmtBaht(n: number) {
  return "฿" + n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function detectConflicts(form: Partial<Campaign>, campaigns: Campaign[], editingId: string | null): Campaign[] {
  if (!form.type) return [];
  return campaigns.filter((c) => {
    if (c.id === editingId) return false;
    const s = computeDisplayStatus(c);
    if (s === "paused" || s === "draft" || s === "expired") return false;
    const fScope = form.scopeType ?? "store";
    if (fScope === "store" || c.scopeType === "store") return true;
    if (fScope === c.scopeType) {
      const fIds = form.scopeIds ?? [];
      const cIds = c.scopeIds ?? []; // legacy rows may omit scopeIds
      return fIds.length === 0 || cIds.length === 0 || fIds.some((id) => cIds.includes(id));
    }
    return false;
  });
}

/** Human-readable discount value for the live preview */
function getDiscountValueText(form: Partial<Campaign>): string | null {
  switch (form.type) {
    case "percentage":
    case "happy_hour":
      return form.percentOff ? `-${form.percentOff}%` : null;
    case "fixed_amount":
      return form.amountOff ? `-฿${form.amountOff.toLocaleString()}` : null;
    case "coupon":
      return form.amountOff
        ? `-฿${form.amountOff.toLocaleString()}${form.couponCode ? ` (${form.couponCode})` : ""}`
        : null;
    case "fixed_price":
      return form.fixedPrice ? `฿${form.fixedPrice.toLocaleString()}` : null;
    case "buy_x_get_y":
      return form.buyQty && form.getQty ? `Buy ${form.buyQty} → Get ${form.getQty} free` : null;
    case "spend_x_discount":
      return form.minSpend && form.discountAmount
        ? `Spend ฿${form.minSpend.toLocaleString()} → -฿${form.discountAmount.toLocaleString()}`
        : null;
    case "spend_x_gift":
      return form.minSpend ? `Spend ฿${form.minSpend.toLocaleString()} → Gift` : null;
    case "bundle":
      return form.bundlePrice ? `Bundle ฿${form.bundlePrice.toLocaleString()}` : null;
    case "member_price":
      return form.memberPrice ? `฿${form.memberPrice.toLocaleString()} member price` : null;
    case "cylinder_exchange":
      return form.exchangeDiscount ? `-฿${form.exchangeDiscount.toLocaleString()} per exchange` : null;
    default:
      return null;
  }
}

// ── Small shared UI ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  expired:   "bg-slate-100 text-slate-500",
  paused:    "bg-amber-100 text-amber-700",
  draft:     "bg-slate-100 text-slate-500",
};

function StatusBadge({ status, dict }: { status: CampaignStatus; dict: PromotionDictionary }) {
  return (
    <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
      {dict.status[status]}
    </span>
  );
}

function TypeBadge({ type, dict }: { type: PromotionType; dict: PromotionDictionary }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      {PROMO_TYPE_ICONS[type]}
      {dict.type[type]}
    </span>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <ReportKpiCard
      label={label}
      value={String(value)}
      icon={icon}
      iconBg="bg-violet-100"
      iconColor="text-violet-600"
    />
  );
}

// ── Form primitives ──────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label ? (
        <label className="text-xs font-medium text-slate-600">
          {label}{required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="text-[11px] leading-normal text-slate-400">{hint}</p> : null}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, min }: { value?: number; onChange: (n?: number) => void; placeholder?: string; min?: number }) {
  return (
    <input
      type="number"
      min={min ?? 0}
      step="any"
      className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      placeholder={placeholder}
    />
  );
}

function TextInput({ value, onChange, placeholder, mono }: { value?: string; onChange: (s: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      className={`h-9 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 ${mono ? "uppercase tracking-wide" : ""}`}
      value={value ?? ""}
      onChange={(e) => onChange(mono ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
    />
  );
}

function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

// ── Type-specific config fields ──────────────────────────────────────────────

function TypeConfigFields({ form, onChange, dict }: { form: Partial<Campaign>; onChange: (p: Partial<Campaign>) => void; dict: PromotionDictionary }) {
  const d = dict.typeConfig;
  switch (form.type) {
    case "percentage":
    case "happy_hour":
      return (
        <Field label={d.percentOff} required>
          <NumInput value={form.percentOff} onChange={(v) => onChange({ percentOff: v })} placeholder="10" />
        </Field>
      );
    case "fixed_amount":
    case "coupon":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label={d.amountOff} required>
            <NumInput value={form.amountOff} onChange={(v) => onChange({ amountOff: v })} placeholder="100" />
          </Field>
          {form.type === "coupon" ? (
            <Field label={d.couponCode} hint={d.couponCodeHelp}>
              <TextInput value={form.couponCode} onChange={(v) => onChange({ couponCode: v })} placeholder={d.couponCodePlaceholder} mono />
            </Field>
          ) : null}
        </div>
      );
    case "fixed_price":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label={d.originalPrice}><NumInput value={form.originalPrice} onChange={(v) => onChange({ originalPrice: v })} placeholder="350" /></Field>
          <Field label={d.fixedPrice} required><NumInput value={form.fixedPrice} onChange={(v) => onChange({ fixedPrice: v })} placeholder="299" /></Field>
        </div>
      );
    case "buy_x_get_y":
      return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label={d.buyQty} required><NumInput value={form.buyQty} onChange={(v) => onChange({ buyQty: v })} placeholder="2" min={1} /></Field>
          <Field label={d.getQty} required><NumInput value={form.getQty} onChange={(v) => onChange({ getQty: v })} placeholder="1" min={1} /></Field>
          <Field label={d.freeProduct}>
            <TextInput value={form.freeProduct} onChange={(v) => onChange({ freeProduct: v })} placeholder={d.freeProductPlaceholder} />
          </Field>
          <div />
        </div>
      );
    case "spend_x_discount":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label={d.minSpend} required><NumInput value={form.minSpend} onChange={(v) => onChange({ minSpend: v })} placeholder="3000" /></Field>
          <Field label={d.discountAmount} required><NumInput value={form.discountAmount} onChange={(v) => onChange({ discountAmount: v })} placeholder="200" /></Field>
        </div>
      );
    case "spend_x_gift":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label={d.minSpend} required><NumInput value={form.minSpend} onChange={(v) => onChange({ minSpend: v })} placeholder="3000" /></Field>
          <Field label={d.giftDescription}><TextInput value={form.giftDescription} onChange={(v) => onChange({ giftDescription: v })} placeholder={d.giftDescPlaceholder} /></Field>
        </div>
      );
    case "bundle":
      return (
        <Field label={d.bundlePrice} required>
          <NumInput value={form.bundlePrice} onChange={(v) => onChange({ bundlePrice: v })} placeholder="499" />
        </Field>
      );
    case "member_price":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Field label={d.memberPrice} required><NumInput value={form.memberPrice} onChange={(v) => onChange({ memberPrice: v })} placeholder="280" /></Field>
          <Field label={d.memberLevels}><TextInput value={form.memberLevels?.join(",") ?? ""} onChange={(v) => onChange({ memberLevels: v ? v.split(",").map(Number).filter(Boolean) : [] })} placeholder="1,2,3" /></Field>
        </div>
      );
    case "cylinder_exchange":
      return (
        <div className="space-y-4">
          {/* Cylinder size selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">{d.cylinderTypes}</label>
            <div className="flex flex-wrap gap-2">
              {CYLINDER_SIZES.map((size) => {
                const active = (form.cylinderTypes ?? []).includes(size);
                const sizeLabel: Record<CylinderSize, string> = {
                  "7kg": d.cylinderType7kg,
                  "15kg": d.cylinderType15kg,
                  "48kg": d.cylinderType48kg,
                };
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      const cur = form.cylinderTypes ?? [];
                      onChange({ cylinderTypes: active ? cur.filter((x) => x !== size) : [...cur, size] });
                    }}
                    className={`flex h-10 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold transition ${
                      active
                        ? "border-violet-400 bg-violet-50 text-violet-700 ring-2 ring-violet-200"
                        : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600"
                    }`}
                  >
                    <Flame className={`h-3.5 w-3.5 ${active ? "text-violet-600" : "text-slate-400"}`} />
                    {sizeLabel[size]}
                  </button>
                );
              })}
            </div>
            {(form.cylinderTypes ?? []).length === 0 && (
              <p className="text-[11px] text-slate-400">Empty = applies to all cylinder sizes</p>
            )}
          </div>
          {/* Exchange discount */}
          <Field label={d.exchangeDiscount} required hint={d.exchangeDiscountHelp}>
            <NumInput value={form.exchangeDiscount} onChange={(v) => onChange({ exchangeDiscount: v })} placeholder="30" />
          </Field>
        </div>
      );
    default:
      return null;
  }
}

// ── Campaign card (grid list view) ──────────────────────────────────────────

function CampaignCard({ campaign, onEdit, onDelete, onDuplicate, onToggle, dict }: {
  campaign: Campaign; onEdit: () => void; onDelete: () => void;
  onDuplicate: () => void; onToggle: () => void; dict: PromotionDictionary;
}) {
  const status = computeDisplayStatus(campaign);
  const colors = CAMPAIGN_COLORS[campaign.color] ?? CAMPAIGN_COLORS.violet;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className={`h-1.5 w-full ${colors.band}`} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none">{campaign.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-900">{campaign.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <TypeBadge type={campaign.type} dict={dict} />
          <StatusBadge status={status} dict={dict} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-violet-600">#{campaign.priority}</span>
          <span>{campaign.usageCount.toLocaleString()} {dict.list.usageTimes}</span>
          {campaign.discountGiven > 0 ? <span className="text-rose-500">−{fmtBaht(campaign.discountGiven)}</span> : null}
        </div>
        <p className="text-[11px] leading-normal text-slate-400">
          {fmtDate(campaign.startDate) ?? "—"} → {fmtDate(campaign.endDate) ?? dict.list.noEnd}
        </p>
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-3 py-2">
        <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600" title={dict.list.action.edit}><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onDuplicate} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600" title={dict.list.action.duplicate}><Copy className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600" title={status === "paused" || status === "draft" ? dict.list.action.resume : dict.list.action.pause}>
          {status === "paused" || status === "draft" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title={dict.list.action.delete}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Enhanced Live Preview panel ──────────────────────────────────────────────

type PreviewRow = { label: string; value: React.ReactNode; accent?: boolean };

function PreviewSection({ rows }: { rows: PreviewRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.label}</dt>
          <dd className={`min-w-0 text-right text-xs font-medium ${r.accent ? "font-bold text-violet-700" : "text-slate-700"}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LivePreviewPanel({ form, dict }: { form: Partial<Campaign>; dict: PromotionDictionary }) {
  const colors = CAMPAIGN_COLORS[form.color ?? "violet"] ?? CAMPAIGN_COLORS.violet;
  const mockCampaign: Campaign = { ...buildCampaign(form, 0), id: "__preview__" };
  const displayStatus = computeDisplayStatus(mockCampaign);
  const d = dict.previewStep;
  const sd = dict.scheduleStep;
  const cd = dict.conditionsStep;

  // Discount value
  const discountValue = getDiscountValueText(form);

  // Scope text
  const scopeType = form.scopeType ?? "store";
  const scopeIds = form.scopeIds ?? [];
  const scopeText = scopeType === "store"
    ? dict.impact.allStore
    : scopeIds.length === 0
      ? dict.scopeStep.noneSelected
      : `${scopeIds.length} ${dict.impact[scopeType === "category" ? "categories" : scopeType === "brand" ? "brands" : "products"]}`;

  // Conditions
  const conditionParts: string[] = [];
  if (form.minAmount) conditionParts.push(`Min ฿${form.minAmount.toLocaleString()}`);
  if (form.minQty) conditionParts.push(`Min ${form.minQty} pcs`);
  if (form.vipOnly) conditionParts.push(cd.vipOnly.replace(" (level 5)", ""));
  if (form.memberOnly) conditionParts.push(cd.memberOnly);
  if (form.customerTypes && form.customerTypes.length > 0) {
    conditionParts.push(
      form.customerTypes.map((t) => t === "retail" ? cd.customerTypeRetail : cd.customerTypeWholesale).join(" / ")
    );
  }

  // Schedule
  const schedParts: string[] = [];
  if (form.startDate || form.endDate) {
    const s = fmtDate(form.startDate) ?? "—";
    const e = fmtDate(form.endDate) ?? dict.list.noEnd;
    schedParts.push(`${s} → ${e}`);
  }
  if (form.daysOfWeek && form.daysOfWeek.length > 0) {
    const dayLabels = DAY_KEYS.map((k, i) => ({ label: sd.days[k], i }));
    schedParts.push(form.daysOfWeek.map((di) => dayLabels[di].label).join(" · "));
  }
  if (form.happyHourStart && form.happyHourEnd) {
    schedParts.push(`${form.happyHourStart}–${form.happyHourEnd}`);
  }
  const schedText = schedParts.length > 0 ? schedParts.join(" · ") : d.always;

  // Limit
  let limitText: string | null = null;
  if (form.limitType === "total" && form.totalLimit) limitText = `${form.totalLimit.toLocaleString()} total`;
  else if (form.limitType === "per_customer" && form.perCustomerLimit) limitText = `${form.perCustomerLimit}/customer`;
  else if (form.limitType === "daily" && form.dailyLimit) limitText = `${form.dailyLimit}/day`;

  // Cylinder sizes (gas shop)
  const cylText = form.cylinderTypes && form.cylinderTypes.length > 0
    ? form.cylinderTypes.map((s) => s.toUpperCase()).join(", ")
    : null;

  // Sections of the preview
  const identitySection: PreviewRow[] = [];
  if (form.type) identitySection.push({ label: d.summaryType, value: <TypeBadge type={form.type} dict={dict} /> });
  if (discountValue) identitySection.push({ label: d.discountValue, value: discountValue, accent: true });

  const scopeSection: PreviewRow[] = [
    { label: d.summaryScope, value: scopeText },
  ];
  if (cylText) scopeSection.push({ label: dict.typeConfig.cylinderTypes, value: cylText });

  const condSection: PreviewRow[] = conditionParts.length > 0
    ? [{ label: d.conditionsSummary, value: conditionParts.join(" · ") }]
    : [];

  const schedSection: PreviewRow[] = [
    { label: d.scheduleSummary, value: schedText },
  ];

  const limitsSection: PreviewRow[] = [
    { label: d.summaryPriority, value: `#${form.priority ?? 1}`, accent: true },
    ...(limitText ? [{ label: d.limitsSummary, value: limitText }] : []),
    { label: sd.stackable, value: form.stackable ?? true
      ? <span className="text-emerald-600">✓ {sd.stackable}</span>
      : <span className="text-rose-500">✗ {sd.stackable}</span>
    },
  ];

  const allSections = [identitySection, scopeSection, condSection, schedSection, limitsSection]
    .filter((s) => s.length > 0);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className={`h-1.5 ${colors.band}`} />
      <div className="p-4 space-y-4">
        {/* Header label */}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dict.sections.livePreview}</p>

        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-2xl leading-none">{form.icon ?? "🎉"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{form.name || "—"}</p>
            {form.description ? <p className="truncate text-[11px] text-slate-400">{form.description}</p> : null}
          </div>
        </div>

        {/* Status */}
        <StatusBadge status={displayStatus} dict={dict} />

        {/* Sectioned data */}
        {allSections.map((rows, i) => (
          <div key={i} className={i > 0 ? "border-t border-slate-100 pt-3" : ""}>
            <PreviewSection rows={rows} />
          </div>
        ))}

        {/* Stackable note */}
        {form.type ? (
          <div className={`mt-1 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
            form.stackable ?? true
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}>
            {form.stackable ?? true ? dict.stackableNote : dict.exclusiveNote}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Collapsible Promotion Simulator ─────────────────────────────────────────

function SimulatorPanel({ form, dict }: { form: Partial<Campaign>; dict: PromotionDictionary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState(100);
  const [qty, setQty] = useState(1);
  const [level, setLevel] = useState<number | undefined>(undefined);
  const [custType, setCustType] = useState<CustomerType | "">("");
  const [cylType, setCylType] = useState<CylinderSize | "">("");
  const [result, setResult] = useState<{ applies: boolean; discount: number; final: number; reason?: string } | null>(null);
  const d = dict.previewStep;

  function calculate() {
    if (!form.type) return;
    const c = buildCampaign({ ...form, status: "active" }, 0);
    const res = evaluatePromotion(c, {
      unitPrice: price,
      quantity: qty,
      customerLevel: level,
      customerType: custType || undefined,
      cylinderType: cylType || undefined,
      now: new Date(),
    });
    setResult({ applies: res.applies, discount: res.discountTotal, final: res.finalTotal, reason: res.reason });
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dict.simulatorToggle}</p>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Test inputs */}
          <div className="grid grid-cols-2 gap-2">
            <Field label={d.testPrice}>
              <NumInput value={price} onChange={(v) => setPrice(v ?? 0)} />
            </Field>
            <Field label={d.testQty}>
              <NumInput value={qty} onChange={(v) => setQty(v ?? 1)} min={1} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={d.testCustomerLevel}>
              <select
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-violet-400 focus:outline-none"
                value={level ?? ""}
                onChange={(e) => setLevel(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">{d.noLevel}</option>
                {[1,2,3,4,5].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label={d.testCustomerType}>
              <select
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-violet-400 focus:outline-none"
                value={custType}
                onChange={(e) => setCustType(e.target.value as CustomerType | "")}
              >
                <option value="">{d.anyType}</option>
                <option value="retail">{dict.conditionsStep.customerTypeRetail}</option>
                <option value="wholesale">{dict.conditionsStep.customerTypeWholesale}</option>
              </select>
            </Field>
          </div>
          {/* Cylinder type (gas shop) */}
          {form.type === "cylinder_exchange" ? (
            <Field label={d.testCylinderSize}>
              <select
                className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-violet-400 focus:outline-none"
                value={cylType}
                onChange={(e) => setCylType(e.target.value as CylinderSize | "")}
              >
                <option value="">{d.anySize}</option>
                {CYLINDER_SIZES.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </Field>
          ) : null}

          {/* Calculate button */}
          <button
            type="button"
            onClick={calculate}
            disabled={!form.type}
            className="h-9 w-full rounded-xl bg-violet-700 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40"
          >
            {d.calculate}
          </button>
          {!form.type ? <p className="text-center text-[11px] text-slate-400">{dict.noTypeHint}</p> : null}

          {/* Result */}
          {result ? (
            <div className={`rounded-xl border p-3 ${result.applies ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <p className={`mb-2 text-xs font-bold ${result.applies ? "text-emerald-700" : "text-rose-700"}`}>
                {result.applies ? d.promotionApplies : d.promotionNotApplies}
              </p>
              {result.applies ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600"><span>{d.originalTotal}</span><span className="nums">{fmtBaht(price * qty)}</span></div>
                  <div className="flex justify-between text-rose-600"><span>{d.discount}</span><span className="nums">−{fmtBaht(result.discount)}</span></div>
                  <div className="flex justify-between text-sm font-bold"><span>{d.finalTotal}</span><span className="nums text-violet-700">{fmtBaht(result.final)}</span></div>
                </div>
              ) : (
                <p className="text-xs text-rose-600">{d.reason}: {result.reason}</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Conflict warning ─────────────────────────────────────────────────────────

function ConflictPanel({ conflicts, dict }: { conflicts: Campaign[]; dict: PromotionDictionary }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs font-bold text-amber-800">{dict.conflictTitle}</p>
      </div>
      <p className="mb-2 text-[11px] text-amber-700">{dict.conflictBody}</p>
      <ul className="space-y-1">
        {conflicts.slice(0, 4).map((c) => (
          <li key={c.id} className="flex items-center gap-1.5 text-[11px] text-amber-800">
            <span>{c.icon}</span>
            <span className="font-medium">{c.name}</span>
            <span className="text-amber-500">#{c.priority}</span>
          </li>
        ))}
        {conflicts.length > 4 ? <li className="text-[11px] text-amber-600">+{conflicts.length - 4} more</li> : null}
      </ul>
    </div>
  );
}

// ── Promotion Impact Summary ─────────────────────────────────────────────────

function ImpactSummaryPanel({ form, dict, scopeNames }: { form: Partial<Campaign>; dict: PromotionDictionary; scopeNames?: Record<string, string> }) {
  const scopeType = form.scopeType ?? "store";
  const ids = form.scopeIds ?? [];

  const scopeIcons: Record<ScopeType, React.ReactNode> = {
    store:    <Store className="h-3.5 w-3.5 text-violet-500" />,
    category: <LayoutList className="h-3.5 w-3.5 text-blue-500" />,
    brand:    <Tag className="h-3.5 w-3.5 text-emerald-500" />,
    products: <Package className="h-3.5 w-3.5 text-amber-500" />,
  };

  const countLabel: Partial<Record<ScopeType, string>> = {
    category: dict.impact.categories,
    brand:    dict.impact.brands,
    products: dict.impact.products,
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-violet-400">{dict.sections.impact}</p>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100">
          {scopeIcons[scopeType]}
        </div>
        <div className="min-w-0 flex-1">
          {scopeType === "store" ? (
            <p className="text-xs font-medium text-slate-700">{dict.impact.allStore}</p>
          ) : ids.length === 0 ? (
            <p className="text-xs italic text-slate-400">{dict.impact.none}</p>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-700">
                <span className="text-sm font-bold text-violet-700">{ids.length}</span>{" "}
                {countLabel[scopeType]}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ids.slice(0, 6).map((id) => (
                  <span key={id} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">{scopeNames?.[id] ?? id}</span>
                ))}
                {ids.length > 6 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">+{ids.length - 6}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single-page Promotion Editor ─────────────────────────────────────────────

type EditorProps = {
  form: Partial<Campaign>;
  onChange: (patch: Partial<Campaign>) => void;
  onSave: () => void;
  onCancel: () => void;
  campaigns: Campaign[];
  editingId: string | null;
  dict: PromotionDictionary;
  isPending: boolean;
};

function PromotionEditor({ form, onChange, onSave, onCancel, campaigns, editingId, dict, isPending }: EditorProps) {
  const conflicts = useMemo(() => detectConflicts(form, campaigns, editingId), [form, campaigns, editingId]);
  const [scopeNames, setScopeNames] = useState<Record<string, string>>({});
  const days = DAY_KEYS.map((k, i) => ({ key: k, label: dict.scheduleStep.days[k], value: i }));
  const limitTypes: { key: LimitType; label: string }[] = [
    { key: "unlimited",    label: dict.scheduleStep.unlimited },
    { key: "total",        label: dict.scheduleStep.totalLimit },
    { key: "per_customer", label: dict.scheduleStep.perCustomerLimit },
    { key: "daily",        label: dict.scheduleStep.dailyLimit },
  ];
  const canSave = !!(form.name?.trim()) && !!form.type && !isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900">{editingId ? dict.editCampaign : dict.newCampaign}</h1>
        </div>
        <button type="button" onClick={onCancel} className="h-9 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
          {dict.wizard.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="h-9 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40"
        >
          {isPending ? dict.wizard.creating : editingId ? dict.wizard.update : dict.wizard.create}
        </button>
      </div>

      {/* ── Main 2+1 grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Form sections */}
        <div className="space-y-5 lg:col-span-2">

          {/* 1 — Basic info */}
          <FormSection title={dict.sections.basicInfo}>
            <div className="space-y-4">
              {/* Name + Status */}
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">{dict.info.name}<span className="ml-0.5 text-rose-500">*</span></label>
                  <input
                    autoFocus
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={form.name ?? ""}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder={dict.info.namePlaceholder}
                    maxLength={80}
                  />
                </div>
                {/* Status toggle */}
                <div className="shrink-0 space-y-1">
                  <label className="text-xs font-medium text-slate-600">{dict.statusLabel}</label>
                  <div className="flex rounded-xl border border-slate-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => onChange({ status: "active" })}
                      className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${(form.status ?? "active") === "active" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Check className="mr-1 inline h-3 w-3" />{dict.activateLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ status: "draft" })}
                      className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${(form.status ?? "active") === "draft" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {dict.draftLabel}
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <Field label={dict.info.description}>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  value={form.description ?? ""}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder={dict.info.descriptionPlaceholder}
                  maxLength={200}
                />
              </Field>

              {/* Priority + Icon + Color */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label={dict.scheduleStep.priority}
                  hint={dict.scheduleStep.priorityHint}
                >
                  <NumInput value={form.priority} onChange={(v) => onChange({ priority: v ?? 1 })} placeholder="1" min={1} />
                </Field>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{dict.info.icon}</label>
                  <div className="flex flex-wrap gap-1">
                    {CAMPAIGN_ICONS.map((ic) => (
                      <button key={ic} type="button" onClick={() => onChange({ icon: ic })}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition ${form.icon === ic ? "bg-violet-100 ring-2 ring-violet-400" : "bg-slate-50 hover:bg-slate-100"}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{dict.info.color}</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(CAMPAIGN_COLORS).map(([key, val]) => (
                      <button key={key} type="button" onClick={() => onChange({ color: key })}
                        className={`h-7 w-7 rounded-full ${val.band} transition ${form.color === key ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : "hover:scale-105"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* 2 — Promotion type */}
          <FormSection title={dict.sections.promoType} subtitle={dict.typeConfig.subtitle}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {ALL_PROMO_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ type: t })}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition ${
                    form.type === t
                      ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50"
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${form.type === t ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {PROMO_TYPE_ICONS[t]}
                  </span>
                  <div>
                    <p className="text-xs font-semibold leading-tight text-slate-900">{dict.type[t]}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{dict.type[PROMO_TYPE_DESC_KEYS[t]]}</p>
                  </div>
                </button>
              ))}
            </div>
          </FormSection>

          {/* 3 — Config (dynamic) */}
          {form.type ? (
            <FormSection title={dict.sections.config}>
              <TypeConfigFields form={form} onChange={onChange} dict={dict} />
            </FormSection>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
              {dict.noTypeHint}
            </div>
          )}

          {/* 4 — Scope */}
          <FormSection title={dict.sections.scope} subtitle={dict.scopeStep.subtitle}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["store","category","brand","products"] as ScopeType[]).map((s) => {
                  const labels: Record<ScopeType, { label: string; desc: string; emoji: string }> = {
                    store:    { label: dict.scopeStep.store,    desc: dict.scopeStep.storeDesc,    emoji: "🏪" },
                    category: { label: dict.scopeStep.category, desc: dict.scopeStep.categoryDesc, emoji: "📂" },
                    brand:    { label: dict.scopeStep.brand,    desc: dict.scopeStep.brandDesc,    emoji: "🏷️" },
                    products: { label: dict.scopeStep.products, desc: dict.scopeStep.productsDesc, emoji: "📦" },
                  };
                  const info = labels[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange({ scopeType: s, scopeIds: [] })}
                      className={`flex flex-col gap-1 rounded-2xl border p-3 text-left transition ${
                        (form.scopeType ?? "store") === s
                          ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                          : "border-slate-200 bg-white hover:border-violet-200"
                      }`}
                    >
                      <span className="text-lg">{info.emoji}</span>
                      <span className="text-xs font-semibold text-slate-900">{info.label}</span>
                      <span className="text-[10px] text-slate-400">{info.desc}</span>
                    </button>
                  );
                })}
              </div>
              {(form.scopeType ?? "store") !== "store" ? (
                <ScopePicker
                  scopeType={form.scopeType as "category" | "brand" | "products"}
                  selectedIds={form.scopeIds ?? []}
                  onChange={(v) => onChange({ scopeIds: v })}
                  onNamesChange={setScopeNames}
                  dict={dict}
                />
              ) : null}
            </div>
          </FormSection>

          {/* 5 — Conditions */}
          <FormSection title={dict.sections.conditions} subtitle={dict.conditionsStep.optional}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={dict.conditionsStep.minAmount}>
                  <NumInput value={form.minAmount} onChange={(v) => onChange({ minAmount: v })} placeholder={dict.conditionsStep.minAmountPlaceholder} />
                </Field>
                <Field label={dict.conditionsStep.minQty}>
                  <NumInput value={form.minQty} onChange={(v) => onChange({ minQty: v })} placeholder={dict.conditionsStep.minQtyPlaceholder} min={1} />
                </Field>
              </div>

              {/* Customer type (gas shop) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">{dict.conditionsStep.customerTypes}</label>
                <div className="flex flex-wrap gap-2">
                  {(["retail","wholesale"] as CustomerType[]).map((ct) => {
                    const active = (form.customerTypes ?? []).includes(ct);
                    return (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => {
                          const cur = form.customerTypes ?? [];
                          onChange({ customerTypes: active ? cur.filter((x) => x !== ct) : [...cur, ct] });
                        }}
                        className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                          active
                            ? "border-violet-400 bg-violet-50 text-violet-700 ring-2 ring-violet-200"
                            : "border-slate-200 text-slate-500 hover:border-violet-200 hover:text-violet-600"
                        }`}
                      >
                        {ct === "retail" ? dict.conditionsStep.customerTypeRetail : dict.conditionsStep.customerTypeWholesale}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">{dict.conditionsStep.customerTypesHelp}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                    checked={form.vipOnly ?? false} onChange={(e) => onChange({ vipOnly: e.target.checked })} />
                  <div><p className="text-xs font-medium text-slate-700">{dict.conditionsStep.vipOnly}</p><p className="text-[10px] text-slate-400">{dict.conditionsStep.vipOnlyHelp}</p></div>
                </label>
                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                    checked={form.memberOnly ?? false} onChange={(e) => onChange({ memberOnly: e.target.checked })} />
                  <div><p className="text-xs font-medium text-slate-700">{dict.conditionsStep.memberOnly}</p><p className="text-[10px] text-slate-400">{dict.conditionsStep.memberOnlyHelp}</p></div>
                </label>
              </div>
            </div>
          </FormSection>

          {/* 6 — Schedule */}
          <FormSection title={dict.sections.schedule} subtitle={dict.scheduleStep.subtitle}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={dict.scheduleStep.startDate}>
                  <input type="datetime-local"
                    className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={form.startDate ? form.startDate.slice(0, 16) : ""}
                    onChange={(e) => onChange({ startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                </Field>
                <Field label={dict.scheduleStep.endDate} hint={dict.scheduleStep.noEndDate}>
                  <input type="datetime-local"
                    className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    value={form.endDate ? form.endDate.slice(0, 16) : ""}
                    onChange={(e) => onChange({ endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                </Field>
              </div>
              {/* Days of week */}
              <Field label={dict.scheduleStep.daysOfWeek}>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {days.map(({ key, label, value }) => {
                    const active = (form.daysOfWeek ?? []).includes(value);
                    return (
                      <button key={key} type="button"
                        onClick={() => { const cur = form.daysOfWeek ?? []; onChange({ daysOfWeek: active ? cur.filter((d) => d !== value) : [...cur, value] }); }}
                        className={`min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-700"}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {(form.daysOfWeek ?? []).length === 0 ? <p className="mt-1 text-[11px] text-slate-400">{dict.scheduleStep.allDays}</p> : null}
              </Field>
              {/* Happy Hour */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{dict.scheduleStep.happyHour}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{dict.scheduleStep.happyHourFrom}</span>
                  <input type="time" className="h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none"
                    value={form.happyHourStart ?? ""} onChange={(e) => onChange({ happyHourStart: e.target.value || undefined })} />
                  <span className="text-xs text-slate-500">{dict.scheduleStep.happyHourTo}</span>
                  <input type="time" className="h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none"
                    value={form.happyHourEnd ?? ""} onChange={(e) => onChange({ happyHourEnd: e.target.value || undefined })} />
                </div>
              </div>
            </div>
          </FormSection>

          {/* 7 — Limits */}
          <FormSection title={dict.sections.limits}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {limitTypes.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => onChange({ limitType: key })}
                    className={`rounded-xl border py-2.5 text-xs font-medium transition ${(form.limitType ?? "unlimited") === key ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500 hover:border-violet-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {form.limitType && form.limitType !== "unlimited" ? (
                <Field label={dict.scheduleStep.limitValue}>
                  <NumInput
                    value={form.limitType === "total" ? form.totalLimit : form.limitType === "per_customer" ? form.perCustomerLimit : form.dailyLimit}
                    onChange={(v) => onChange(form.limitType === "total" ? { totalLimit: v } : form.limitType === "per_customer" ? { perCustomerLimit: v } : { dailyLimit: v })}
                    placeholder="100" min={1}
                  />
                </Field>
              ) : null}

              {/* Stackable toggle + informative note */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                    checked={form.stackable ?? true} onChange={(e) => onChange({ stackable: e.target.checked })} />
                  <div>
                    <p className="text-xs font-medium text-slate-700">{dict.scheduleStep.stackable}</p>
                    <p className="text-[10px] text-slate-400">{dict.scheduleStep.stackableHelp}</p>
                  </div>
                </label>
                {/* Stacking behavior note */}
                <div className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
                  form.stackable ?? true
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  {form.stackable ?? true ? dict.stackableNote : dict.exclusiveNote}
                </div>
              </div>
            </div>
          </FormSection>

          {/* Bottom save */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button type="button" onClick={onCancel} className="h-10 rounded-xl px-5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              {dict.wizard.cancel}
            </button>
            <button type="button" onClick={onSave} disabled={!canSave}
              className="h-10 rounded-xl bg-violet-700 px-6 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40">
              {isPending ? dict.wizard.creating : editingId ? dict.wizard.update : dict.wizard.create}
            </button>
          </div>
        </div>

        {/* RIGHT: Sticky panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <LivePreviewPanel form={form} dict={dict} />
            <SimulatorPanel form={form} dict={dict} />
            <ImpactSummaryPanel form={form} dict={dict} scopeNames={scopeNames} />
            <ConflictPanel conflicts={conflicts} dict={dict} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

type PromotionManagerProps = {
  dictionary: PromotionDictionary;
  locale: Locale;
};

export function PromotionManager({ dictionary: dict, locale }: PromotionManagerProps) {
  const queryClient = useQueryClient();
  const campaignsQuery = useQuery({ queryKey: ["promotions"], queryFn: async () => (await listPromotions()).data });
  const campaigns = useMemo<Campaign[]>(() => campaignsQuery.data ?? [], [campaignsQuery.data]);
  const [view, setView] = useState<"list" | "editor">("list");
  const [listView, setListView] = useState<"grid" | "table">("table");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Campaign>>(defaultForm);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<PromotionType | "">("");
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "">("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function refetchCampaigns() {
    return queryClient.invalidateQueries({ queryKey: ["promotions"] });
  }

  // KPI
  const kpi = useMemo(() => {
    let active = 0, scheduled = 0, expired = 0, totalUses = 0, revenue = 0, discount = 0, usagesToday = 0;
    campaigns.forEach((c) => {
      const s = computeDisplayStatus(c);
      if (s === "active") active++;
      else if (s === "scheduled") scheduled++;
      else if (s === "expired") expired++;
      totalUses += c.usageCount;
      revenue += c.revenueGenerated;
      discount += c.discountGiven;
      usagesToday += c.usageToday;
    });
    return { active, scheduled, expired, totalUses, revenue, discount, usagesToday };
  }, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const s = computeDisplayStatus(c);
      return (
        (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
        (!filterType || c.type === filterType) &&
        (!filterStatus || s === filterStatus)
      );
    });
  }, [campaigns, search, filterType, filterStatus]);

  const patchForm = useCallback((patch: Partial<Campaign>) => setForm((f) => ({ ...f, ...patch })), []);

  function openNew() {
    setForm(defaultForm());
    setEditingId(null);
    setView("editor");
  }

  function openEdit(id: string) {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setForm({ ...c });
    setEditingId(id);
    setView("editor");
  }

  function closeEditor() {
    setView("list");
    setEditingId(null);
    setForm(defaultForm());
  }

  async function saveForm() {
    if (!form.name?.trim() || !form.type || isPending) return;
    setIsPending(true);
    try {
      if (editingId) {
        const existing = campaigns.find((c) => c.id === editingId) ?? ({} as Campaign);
        const updated = { ...existing, ...form, id: editingId, updatedAt: new Date().toISOString() } as Campaign;
        await updatePromotion(editingId, updated);
        toast.success(dict.updated);
      } else {
        await createPromotion(buildCampaign(form, campaigns.length));
        toast.success(dict.created);
      }
      await refetchCampaigns();
      closeEditor();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.updated);
    } finally {
      setIsPending(false);
    }
  }

  async function deleteCampaign(id: string) {
    try {
      await deletePromotion(id);
      await refetchCampaigns();
      toast.success(dict.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.deleted);
    }
    setDeleteId(null);
  }

  async function duplicateCampaign(id: string) {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    const now = new Date().toISOString();
    try {
      await createPromotion({
        ...c, id: crypto.randomUUID(), name: `${c.name} (copy)`,
        status: "draft", usageCount: 0, usageToday: 0,
        revenueGenerated: 0, discountGiven: 0, createdAt: now, updatedAt: now,
      });
      await refetchCampaigns();
      toast.success(dict.duplicated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.duplicated);
    }
  }

  async function toggleActive(id: string) {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    const s = computeDisplayStatus(c);
    const next: CampaignStatus = s === "paused" || s === "draft" ? "active" : "paused";
    try {
      await updatePromotion(id, { ...c, status: next, updatedAt: new Date().toISOString() });
      await refetchCampaigns();
      toast.success(next === "paused" ? dict.paused : dict.resumed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.paused);
    }
  }

  // ── Loading / error gates ───────────────────────────────────────────────────

  if (campaignsQuery.isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{dict.title}</p>
      </div>
    );
  }

  if (campaignsQuery.isError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <QueryErrorState locale={locale} onRetry={() => void refetchCampaigns()} className="max-w-md" />
      </div>
    );
  }

  // ── Editor view ────────────────────────────────────────────────────────────

  if (view === "editor") {
    return (
      <PromotionEditor
        form={form}
        onChange={patchForm}
        onSave={saveForm}
        onCancel={closeEditor}
        campaigns={campaigns}
        editingId={editingId}
        dict={dict}
        isPending={isPending}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dict.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{dict.subtitle}</p>
        </div>
        <button type="button" onClick={openNew}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
          <Plus className="h-4 w-4" />{dict.newCampaign}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label={dict.kpi.active}           value={kpi.active}                       icon={<Zap className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.scheduled}        value={kpi.scheduled}                    icon={<Clock className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.expired}          value={kpi.expired}                      icon={<X className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.totalUses}        value={kpi.totalUses.toLocaleString()}    icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.revenueGenerated} value={fmtBaht(kpi.revenue)}             icon={<Tag className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.discountGiven}    value={fmtBaht(kpi.discount)}            icon={<Percent className="h-5 w-5" />} />
        <KpiCard label={dict.kpi.usagesToday}      value={kpi.usagesToday.toLocaleString()}  icon={<Star className="h-5 w-5" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="h-9 w-56 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.list.search}
        />
        <select className="h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none"
          value={filterType} onChange={(e) => setFilterType(e.target.value as PromotionType | "")}>
          <option value="">{dict.list.allTypes}</option>
          {ALL_PROMO_TYPES.map((t) => <option key={t} value={t}>{dict.type[t]}</option>)}
        </select>
        <select className="h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none"
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as CampaignStatus | "")}>
          <option value="">{dict.list.allStatuses}</option>
          {(["active","scheduled","paused","draft","expired"] as CampaignStatus[]).map((s) => (
            <option key={s} value={s}>{dict.status[s]}</option>
          ))}
        </select>
        <div className="ml-auto flex rounded-xl border border-slate-200 p-0.5">
          <button type="button" onClick={() => setListView("table")}
            className={`flex h-7 w-8 items-center justify-center rounded-lg transition ${listView === "table" ? "bg-violet-100 text-violet-700" : "text-slate-400 hover:text-slate-600"}`}>
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setListView("grid")}
            className={`flex h-7 w-8 items-center justify-center rounded-lg transition ${listView === "grid" ? "bg-violet-100 text-violet-700" : "text-slate-400 hover:text-slate-600"}`}>
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Megaphone className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{dict.list.empty}</p>
          <button type="button" onClick={openNew}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
            <Plus className="h-4 w-4" />{dict.newCampaign}
          </button>
        </div>
      ) : listView === "grid" ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c}
              onEdit={() => openEdit(c.id)} onDelete={() => setDeleteId(c.id)}
              onDuplicate={() => duplicateCampaign(c.id)} onToggle={() => toggleActive(c.id)} dict={dict} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {[dict.list.col.name, dict.list.col.type, dict.list.col.scope, dict.list.col.status].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left">{h}</th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 text-right">{dict.list.col.priority}</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">{dict.list.col.usage}</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">{dict.list.col.start}</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">{dict.list.col.end}</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">{dict.list.col.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => {
                  const status = computeDisplayStatus(c);
                  const scopeLabel = { store: dict.scopeStep.store, category: dict.scopeStep.category, brand: dict.scopeStep.brand, products: dict.scopeStep.products }[c.scopeType];
                  return (
                    <tr key={c.id} className="group hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.icon}</span>
                          <div>
                            <p className="max-w-[18ch] truncate font-semibold text-slate-900" title={c.name}>{c.name}</p>
                            {c.description ? <p className="max-w-[20ch] truncate text-xs leading-normal text-slate-400">{c.description}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={c.type} dict={dict} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{scopeLabel}{((c.scopeIds ?? []).length > 0 ? ` (${(c.scopeIds ?? []).length})` : "")}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} dict={dict} /></td>
                      <td className="px-4 py-3 text-right font-bold text-violet-600">#{c.priority}</td>
                      <td className="px-4 py-3 text-right nums text-slate-700">{c.usageCount.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(c.startDate) ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(c.endDate) ?? dict.list.noEnd}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => openEdit(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600" title={dict.list.action.edit}><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => duplicateCampaign(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600" title={dict.list.action.duplicate}><Copy className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => toggleActive(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600" title={status === "paused" || status === "draft" ? dict.list.action.resume : dict.list.action.pause}>
                            {status === "paused" || status === "draft" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" onClick={() => setDeleteId(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title={dict.list.action.delete}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title={dict.list.action.delete}
        cancelLabel={dict.wizard.cancel}
        confirmLabel={dict.list.action.delete}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteCampaign(deleteId)}
      >
        <p className="text-sm text-slate-600">{dict.list.action.deleteConfirm}</p>
      </ConfirmDialog>
    </div>
  );
}
