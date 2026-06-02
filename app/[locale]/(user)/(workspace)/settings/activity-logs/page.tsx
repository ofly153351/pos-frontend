"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Warehouse,
  Settings,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Activity,
} from "lucide-react";
import { getActivityLogs, type ActivityLogEntry } from "@/services/activity-logs";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── display maps ─────────────────────────────────────────────────────────────

const MODULE_CFG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  product:       { label: "สินค้า",       Icon: Package,      color: "bg-blue-50 text-blue-700 border-blue-200" },
  sale:          { label: "ขาย",          Icon: ShoppingCart, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  document:      { label: "เอกสาร",       Icon: FileText,     color: "bg-violet-50 text-violet-700 border-violet-200" },
  customer:      { label: "ลูกค้า",       Icon: Users,        color: "bg-orange-50 text-orange-700 border-orange-200" },
  warehouse:     { label: "คลังสินค้า",   Icon: Warehouse,    color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  stock:         { label: "สต็อก",        Icon: Package,      color: "bg-amber-50 text-amber-700 border-amber-200" },
  purchasing:    { label: "จัดซื้อ",      Icon: Truck,        color: "bg-pink-50 text-pink-700 border-pink-200" },
  location:      { label: "ที่เก็บ",      Icon: Warehouse,    color: "bg-teal-50 text-teal-700 border-teal-200" },
  invoice:       { label: "ใบแจ้งหนี้",   Icon: FileText,     color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  "parked-bill": { label: "พักบิล",       Icon: FileText,     color: "bg-slate-50 text-slate-700 border-slate-200" },
  settings:      { label: "ตั้งค่า",      Icon: Settings,     color: "bg-slate-50 text-slate-600 border-slate-200" },
};

const ACTION_CFG: Record<string, { label: string; color: string }> = {
  create:               { label: "สร้าง",        color: "bg-emerald-100 text-emerald-800" },
  update:               { label: "แก้ไข",        color: "bg-blue-100 text-blue-800" },
  delete:               { label: "ลบ",           color: "bg-red-100 text-red-800" },
  pay:                  { label: "ชำระเงิน",     color: "bg-green-100 text-green-800" },
  cancel:               { label: "ยกเลิก",       color: "bg-orange-100 text-orange-800" },
  convert:              { label: "แปลงเอกสาร",   color: "bg-purple-100 text-purple-800" },
  adjust:               { label: "ปรับสต็อก",    color: "bg-amber-100 text-amber-800" },
  transfer:             { label: "โอนย้าย",      color: "bg-cyan-100 text-cyan-800" },
  receive:              { label: "รับสินค้า",    color: "bg-teal-100 text-teal-800" },
  void:                 { label: "ยกเลิก",       color: "bg-red-100 text-red-800" },
  "manage-members":     { label: "จัดการสมาชิก", color: "bg-slate-100 text-slate-800" },
  "manage-bank-accounts":{ label: "จัดการบัญชี",color: "bg-slate-100 text-slate-800" },
  print:                { label: "พิมพ์",        color: "bg-slate-100 text-slate-700" },
};

const MODULES = [
  { value: "", label: "ทุก module" },
  { value: "product",    label: "สินค้า" },
  { value: "sale",       label: "ขาย" },
  { value: "document",   label: "เอกสาร" },
  { value: "customer",   label: "ลูกค้า" },
  { value: "warehouse",  label: "คลังสินค้า" },
  { value: "stock",      label: "สต็อก" },
  { value: "purchasing", label: "จัดซื้อ" },
  { value: "invoice",    label: "ใบแจ้งหนี้" },
  { value: "settings",   label: "ตั้งค่า" },
];

const ACTIONS = [
  { value: "", label: "ทุก action" },
  { value: "create",   label: "สร้าง" },
  { value: "update",   label: "แก้ไข" },
  { value: "delete",   label: "ลบ" },
  { value: "pay",      label: "ชำระเงิน" },
  { value: "cancel",   label: "ยกเลิก" },
  { value: "adjust",   label: "ปรับสต็อก" },
  { value: "convert",  label: "แปลงเอกสาร" },
  { value: "transfer", label: "โอนย้าย" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

function ModuleBadge({ module }: { module: string }) {
  const cfg = MODULE_CFG[module];
  const Icon = cfg?.Icon ?? Activity;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      cfg?.color ?? "bg-slate-50 text-slate-600 border-slate-200"
    )}>
      <Icon className="h-3 w-3" />
      {cfg?.label ?? module}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CFG[action];
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
      cfg?.color ?? "bg-slate-100 text-slate-700"
    )}>
      {cfg?.label ?? action}
    </span>
  );
}

function LogRow({ log }: { log: ActivityLogEntry }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-slate-100 px-5 py-3 text-sm hover:bg-violet-50/30 transition-colors">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{log.user_name || "—"}</p>
        <p className="truncate text-xs text-slate-400">{log.ip_address}</p>
      </div>
      <ModuleBadge module={log.module} />
      <ActionBadge action={log.action} />
      <p className="whitespace-nowrap text-xs text-slate-400 tabular-nums">{formatTime(log.created_at)}</p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const LIMIT = 50;

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["activity-logs", page, filterModule, filterAction, dateFrom, dateTo],
    queryFn: () =>
      getActivityLogs({
        page,
        limit: LIMIT,
        module: filterModule || undefined,
        action: filterAction || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo ? `${dateTo}T23:59:59Z` : undefined,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const hasFilter = !!(filterModule || filterAction || dateFrom || dateTo);

  return (
    <div className="rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-violet-50 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
            <ScrollText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Activity Logs</h1>
            <p className="text-xs text-slate-500">บันทึกกิจกรรมทุก module ในระบบ แยกตามร้านค้า</p>
          </div>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          รีเฟรช
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          กรอง
        </div>
        <select
          value={filterModule}
          onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          {MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setFilterModule(""); setFilterAction(""); setDateFrom(""); setDateTo(""); setPage(1); }}
            className="text-xs font-medium text-violet-600 underline hover:text-violet-800"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-slate-100 bg-violet-50/40 px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span>ผู้ใช้งาน / IP</span>
        <span>Module</span>
        <span>Action</span>
        <span>เวลา</span>
      </div>

      {/* Rows */}
      <div className="min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            กำลังโหลด…
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Activity className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
          </div>
        ) : (
          data.items.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-xs text-slate-500">
            แสดง {((page - 1) * LIMIT + 1).toLocaleString()}–{Math.min(page * LIMIT, data.total).toLocaleString()} จาก {data.total.toLocaleString()} รายการ
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium text-slate-700 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
