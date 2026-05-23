"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Pencil,
  Ruler,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { ProductBrandModal } from "@/components/stock/product-brand-modal";
import { ProductTypeModal } from "@/components/stock/product-type-modal";
import { ProductUnitModal } from "@/components/stock/product-unit-modal";
import {
  createProductBrand,
  createProductType,
  createProductUnit,
  deleteProductBrand,
  deleteProductType,
  deleteProductUnit,
  listProductBrands,
  listProductTypes,
  listProductUnits,
  updateProductBrand,
  updateProductType,
  updateProductUnit,
} from "@/services/products";
import type { CategoriesDictionary, ManagementDictionary, UnitsDictionary } from "@/components/stock/types";
import type { ProductBrand, ProductType, ProductUnit } from "@/types/product";

type Tab = "types" | "units" | "brands";
type StatusFilter = "all" | "active" | "inactive";
type PageSize = 10 | 25 | 50 | 100;

type BaseItem = {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  updated_at?: string;
  product_count: number;
};

export type CatalogSetupSectionProps = {
  activeLabel: string;
  cancelLabel: string;
  categoriesDictionary: CategoriesDictionary;
  managementDictionary: ManagementDictionary;
  totalProducts: number;
  unitsDictionary: UnitsDictionary;
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

function avatarColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

export function CatalogSetupSection({
  activeLabel,
  cancelLabel,
  categoriesDictionary: d,
  managementDictionary,
  totalProducts,
  unitsDictionary,
}: CatalogSetupSectionProps) {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("types");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  // Type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeActive, setTypeActive] = useState(true);
  const [typeErr, setTypeErr] = useState("");
  const [typePending, startTypeT] = useTransition();

  // Unit modal
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState("");
  const [unitDesc, setUnitDesc] = useState("");
  const [unitActive, setUnitActive] = useState(true);
  const [unitErr, setUnitErr] = useState("");
  const [unitPending, startUnitT] = useTransition();

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [brandActive, setBrandActive] = useState(true);
  const [brandErr, setBrandErr] = useState("");
  const [brandPending, startBrandT] = useTransition();

  // Delete dialog
  const [delTarget, setDelTarget] = useState<{ id: string; name: string; count: number } | null>(null);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ name: string; description: string; is_active: boolean }[]>([]);
  const [importErr, setImportErr] = useState("");
  const [importing, startImportT] = useTransition();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setPage(1); }, [tab, search, statusFilter]);

  const { data: types = [] } = useQuery<ProductType[]>({
    enabled: mounted,
    queryFn: async () => (await listProductTypes()).data ?? [],
    queryKey: ["stock", "product-types"],
  });
  const { data: units = [] } = useQuery<ProductUnit[]>({
    enabled: mounted,
    queryFn: async () => (await listProductUnits()).data ?? [],
    queryKey: ["stock", "product-units"],
  });
  const { data: brands = [] } = useQuery<ProductBrand[]>({
    enabled: mounted,
    queryFn: async () => (await listProductBrands()).data ?? [],
    queryKey: ["stock", "product-brands"],
  });

  function toBase<T extends { id: string; name: string; description?: string | null; is_active: boolean; product_count?: number; updated_at?: string }>(items: T[]): BaseItem[] {
    return items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      is_active: i.is_active,
      updated_at: i.updated_at,
      product_count: i.product_count ?? 0,
    }));
  }

  const allFiltered = (() => {
    const kw = search.trim().toLowerCase();
    let base: BaseItem[] =
      tab === "types" ? toBase(types) :
      tab === "units" ? toBase(units) :
      toBase(brands);
    if (statusFilter === "active") base = base.filter(i => i.is_active);
    else if (statusFilter === "inactive") base = base.filter(i => !i.is_active);
    if (kw) base = base.filter(i => i.name.toLowerCase().includes(kw));
    return base;
  })();

  const totalItems = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = allFiltered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  const statsSource = tab === "types" ? types : tab === "units" ? units : brands;
  const statsTotal = statsSource.length;
  const statsActive = statsSource.filter(i => i.is_active).length;
  const statsInactive = statsTotal - statsActive;
  const popularTypes = [...types].sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0)).slice(0, 3);
  const tabLabel = tab === "types" ? d.tabTypes : tab === "units" ? d.tabUnits : d.tabBrands;
  const tabColName = tab === "types" ? d.colNameType : tab === "units" ? d.colNameUnit : d.colNameBrand;

  // Type CRUD
  function openCreateType() { setEditTypeId(null); setTypeName(""); setTypeDesc(""); setTypeActive(true); setTypeErr(""); setTypeModalOpen(true); }
  function openEditType(t: ProductType) { setEditTypeId(t.id); setTypeName(t.name); setTypeDesc(t.description ?? ""); setTypeActive(t.is_active); setTypeErr(""); setTypeModalOpen(true); }
  function closeTypeModal() { setTypeModalOpen(false); setEditTypeId(null); setTypeName(""); setTypeDesc(""); setTypeActive(true); setTypeErr(""); }
  function saveType() {
    if (!typeName.trim()) { setTypeErr(managementDictionary.typeRequiredError); return; }
    startTypeT(async () => {
      try {
        const p = { name: typeName.trim(), description: typeDesc.trim() || undefined, is_active: typeActive };
        if (editTypeId) await updateProductType(editTypeId, p); else await createProductType(p);
        await qc.invalidateQueries({ queryKey: ["stock", "product-types"] });
        closeTypeModal();
      } catch (e) { setTypeErr(e instanceof Error ? e.message : "Request failed"); }
    });
  }

  // Unit CRUD
  function openCreateUnit() { setEditUnitId(null); setUnitName(""); setUnitDesc(""); setUnitActive(true); setUnitErr(""); setUnitModalOpen(true); }
  function openEditUnit(u: ProductUnit) { setEditUnitId(u.id); setUnitName(u.name); setUnitDesc(u.description ?? ""); setUnitActive(u.is_active); setUnitErr(""); setUnitModalOpen(true); }
  function closeUnitModal() { setUnitModalOpen(false); setEditUnitId(null); setUnitName(""); setUnitDesc(""); setUnitActive(true); setUnitErr(""); }
  function saveUnit() {
    if (!unitName.trim()) { setUnitErr(unitsDictionary.requiredError); return; }
    startUnitT(async () => {
      try {
        const p = { name: unitName.trim(), description: unitDesc.trim() || undefined, is_active: unitActive };
        if (editUnitId) await updateProductUnit(editUnitId, p); else await createProductUnit(p);
        await qc.invalidateQueries({ queryKey: ["stock", "product-units"] });
        closeUnitModal();
      } catch (e) { setUnitErr(e instanceof Error ? e.message : "Request failed"); }
    });
  }

  // Brand CRUD
  function openCreateBrand() { setEditBrandId(null); setBrandName(""); setBrandDesc(""); setBrandActive(true); setBrandErr(""); setBrandModalOpen(true); }
  function openEditBrand(b: ProductBrand) { setEditBrandId(b.id); setBrandName(b.name); setBrandDesc(b.description ?? ""); setBrandActive(b.is_active); setBrandErr(""); setBrandModalOpen(true); }
  function closeBrandModal() { setBrandModalOpen(false); setEditBrandId(null); setBrandName(""); setBrandDesc(""); setBrandActive(true); setBrandErr(""); }
  function saveBrand() {
    if (!brandName.trim()) { setBrandErr(unitsDictionary.requiredError); return; }
    startBrandT(async () => {
      try {
        const p = { name: brandName.trim(), description: brandDesc.trim() || undefined, is_active: brandActive };
        if (editBrandId) await updateProductBrand(editBrandId, p); else await createProductBrand(p);
        await qc.invalidateQueries({ queryKey: ["stock", "product-brands"] });
        closeBrandModal();
      } catch (e) { setBrandErr(e instanceof Error ? e.message : "Request failed"); }
    });
  }

  async function execDelete() {
    if (!delTarget) return;
    try {
      if (tab === "types") { await deleteProductType(delTarget.id); await qc.invalidateQueries({ queryKey: ["stock", "product-types"] }); }
      else if (tab === "units") { await deleteProductUnit(delTarget.id); await qc.invalidateQueries({ queryKey: ["stock", "product-units"] }); }
      else { await deleteProductBrand(delTarget.id); await qc.invalidateQueries({ queryKey: ["stock", "product-brands"] }); }
    } finally { setDelTarget(null); }
  }

  function openEdit(item: BaseItem) {
    if (tab === "types") { const t = types.find(x => x.id === item.id); if (t) openEditType(t); }
    else if (tab === "units") { const u = units.find(x => x.id === item.id); if (u) openEditUnit(u); }
    else { const b = brands.find(x => x.id === item.id); if (b) openEditBrand(b); }
  }

  function openAdd() {
    if (tab === "types") openCreateType();
    else if (tab === "units") openCreateUnit();
    else openCreateBrand();
  }

  function exportCSV() {
    const rows: string[][] = [["name", "description", "status"]];
    const src = tab === "types" ? types : tab === "units" ? units : brands;
    src.forEach(i => rows.push([i.name, (i as any).description ?? "", i.is_active ? "active" : "inactive"]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? "";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setImportErr("Invalid CSV — no data rows found"); return; }
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
        return { name: cols[0] ?? "", description: cols[1] ?? "", is_active: (cols[2] ?? "").toLowerCase() !== "inactive" };
      }).filter(r => r.name.length > 0);
      setImportRows(parsed);
      setImportErr("");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirmImport() {
    if (importRows.length === 0) return;
    startImportT(async () => {
      try {
        const createFn = tab === "types" ? createProductType : tab === "units" ? createProductUnit : createProductBrand;
        for (const row of importRows) {
          await (createFn as (p: { name: string; description?: string; is_active: boolean }) => Promise<unknown>)({
            name: row.name, description: row.description || undefined, is_active: row.is_active,
          });
        }
        const qk = tab === "types" ? ["stock", "product-types"] : tab === "units" ? ["stock", "product-units"] : ["stock", "product-brands"];
        await qc.invalidateQueries({ queryKey: qk });
        setImportOpen(false);
        setImportRows([]);
      } catch (e) { setImportErr(e instanceof Error ? e.message : "Import failed"); }
    });
  }

  function pageNums(): (number | "…")[] {
    const out: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) out.push(i);
      else if (out[out.length - 1] !== "…") out.push("…");
    }
    return out;
  }

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-violet-50" />
        <div className="flex gap-6">
          <div className="h-96 flex-1 rounded-2xl bg-violet-50" />
          <div className="h-96 w-80 shrink-0 rounded-2xl bg-violet-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 px-4 py-3">
          {([
            { key: "types" as Tab, label: d.tabTypes, count: types.length, Icon: LayoutGrid },
            { key: "units" as Tab, label: d.tabUnits, count: units.length, Icon: Ruler },
            { key: "brands" as Tab, label: d.tabBrands, count: brands.length, Icon: Tag },
          ] as const).map(({ key, label, count, Icon }) => (
            <button
              key={key}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-base font-medium transition-all ${
                tab === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
              }`}
              onClick={() => setTab(key)}
              type="button"
            >
              <Icon className="h-5 w-5" />
              {label}
              <span className={`rounded-full px-2 py-0.5 text-sm font-bold leading-none ${
                tab === key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="flex items-start gap-6">

        {/* ── Left: main table card ─────────────────────── */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-violet-50 bg-violet-50/40 px-6 py-5">
            <div className="relative min-w-0 flex-1" style={{ maxWidth: 320 }}>
              <svg className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === "types" ? d.searchTypes : tab === "units" ? d.searchUnits : d.searchBrands}
                value={search}
              />
            </div>
            <select
              className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="all">{d.statusAll}</option>
              <option value="active">{d.statusActive}</option>
              <option value="inactive">{d.statusInactive}</option>
            </select>
            <button
              className="ml-auto rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-pink-600 active:scale-95"
              onClick={openAdd}
              type="button"
            >
              {tab === "types" ? d.addType : tab === "units" ? d.addUnit : d.addBrand}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-50">
                  <th className="w-14 px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">{d.colOrder}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{tabColName}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{d.colProductCount}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{d.colStatus}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{d.colLastModified}</th>
                  <th className="w-28 px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">{d.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
                          <LayoutGrid className="h-8 w-8 text-violet-300" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-500">{d.emptyTitle}</p>
                          <p className="mt-1 text-sm text-slate-400">{d.emptyAdd}</p>
                        </div>
                        <button
                          className="mt-1 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:from-violet-700 hover:to-pink-600"
                          onClick={openAdd}
                          type="button"
                        >
                          {tab === "types" ? d.addType : tab === "units" ? d.addUnit : d.addBrand}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((item, idx) => {
                    const n = (safePage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        className="group border-b border-violet-50/70 transition-colors last:border-0 hover:bg-violet-50/30"
                      >
                        {/* Order */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-500">{n}</span>
                        </td>
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${avatarColor(n - 1)}`}>
                              {item.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-800">{item.name}</p>
                              {item.description && (
                                <p className="truncate text-sm text-slate-400">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Product count */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                            item.product_count > 0 ? "bg-violet-50 text-violet-600" : "bg-slate-50 text-slate-400"
                          }`}>
                            {item.product_count} {d.countItems}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              {d.legendActive}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              {d.legendInactive}
                            </span>
                          )}
                        </td>
                        {/* Last modified */}
                        <td className="px-6 py-4 text-sm text-slate-400">{fmtDate(item.updated_at)}</td>
                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-100 hover:text-violet-700"
                              onClick={() => openEdit(item)}
                              title={d.legendEdit}
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
                              onClick={() => setDelTarget({ id: item.id, name: item.name, count: item.product_count })}
                              title={d.legendDelete}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-50 bg-violet-50/20 px-6 py-4">
              <p className="text-sm text-slate-400">
                {d.showing} <span className="font-medium text-slate-600">{from}–{to}</span> {d.of} <span className="font-medium text-slate-600">{totalItems}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-100 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => p - 1)}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNums().map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition ${
                        safePage === p
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-violet-100 hover:text-violet-700"
                      }`}
                      onClick={() => setPage(p as number)}
                      type="button"
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-100 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <select
                className="rounded-lg border border-violet-100 bg-white px-3 py-1.5 text-sm text-slate-600 outline-none focus:border-violet-400"
                onChange={e => { setPageSize(Number(e.target.value) as PageSize); setPage(1); }}
                value={pageSize}
              >
                {([10, 25, 50, 100] as PageSize[]).map(n => (
                  <option key={n} value={n}>{n} {d.perPage}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────── */}
        <div className="w-80 shrink-0 space-y-4">

          {/* Stats overview */}
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{d.overviewTitle}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: d.overviewTotal, value: statsTotal, bg: "bg-violet-50", text: "text-violet-700", icon: LayoutGrid },
                { label: d.overviewActive, value: statsActive, bg: "bg-emerald-50", text: "text-emerald-700", icon: Box },
                { label: d.overviewInactive, value: statsInactive, bg: "bg-slate-50", text: "text-slate-500", icon: Box },
                { label: d.overviewTotalProducts, value: totalProducts, bg: "bg-violet-50", text: "text-violet-700", icon: Tag },
              ].map(({ label, value, bg, text }) => (
                <div key={label} className={`flex flex-col gap-1.5 rounded-xl ${bg} p-3.5`}>
                  <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
                  <p className="text-sm leading-tight text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Popular categories */}
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{d.popularTitle}</p>
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
            {popularTypes.length === 0 ? (
              <p className="text-sm text-slate-400">{d.emptyTitle}</p>
            ) : (
              <div className="space-y-2.5">
                {popularTypes.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-slate-100 text-slate-500" :
                      "bg-orange-50 text-orange-600"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base text-slate-700">{t.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-violet-500">{t.product_count ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tools */}
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{d.toolsTitle}</p>
            <div className="space-y-2">
              <button
                className="flex w-full items-center gap-3.5 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-left transition hover:bg-sky-50 active:scale-[0.98]"
                onClick={() => { setImportOpen(true); setImportRows([]); setImportErr(""); }}
                type="button"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{d.toolsImport}</p>
                  <p className="text-xs text-slate-400">{d.toolsImportDesc}</p>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-left transition hover:bg-emerald-50 active:scale-[0.98]"
                onClick={exportCSV}
                type="button"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{d.toolsExport}</p>
                  <p className="text-xs text-slate-400">{d.toolsExportDesc}</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <ProductTypeModal
        cancelLabel={cancelLabel}
        description={typeDesc}
        error={typeErr}
        isActive={typeActive}
        isEditing={Boolean(editTypeId)}
        isOpen={typeModalOpen}
        isPending={typePending}
        managementDictionary={managementDictionary}
        name={typeName}
        onActiveChange={setTypeActive}
        onClose={closeTypeModal}
        onDescriptionChange={setTypeDesc}
        onNameChange={setTypeName}
        onSubmit={saveType}
      />
      <ProductUnitModal
        activeLabel={activeLabel}
        cancelLabel={cancelLabel}
        description={unitDesc}
        error={unitErr}
        isActive={unitActive}
        isEditing={Boolean(editUnitId)}
        isOpen={unitModalOpen}
        isPending={unitPending}
        name={unitName}
        onActiveChange={setUnitActive}
        onClose={closeUnitModal}
        onDescriptionChange={setUnitDesc}
        onNameChange={setUnitName}
        onSubmit={saveUnit}
        submitLabel={editUnitId ? managementDictionary.saveUnitButton : managementDictionary.createUnitButton}
        title={editUnitId ? managementDictionary.editUnitTitle : managementDictionary.createUnitTitle}
        unitsDictionary={unitsDictionary}
      />
      <ProductBrandModal
        activeLabel={activeLabel}
        cancelLabel={cancelLabel}
        description={brandDesc}
        error={brandErr}
        isActive={brandActive}
        isOpen={brandModalOpen}
        isPending={brandPending}
        name={brandName}
        onActiveChange={setBrandActive}
        onClose={closeBrandModal}
        onDescriptionChange={setBrandDesc}
        onNameChange={setBrandName}
        onSubmit={saveBrand}
        submitLabel={editBrandId ? managementDictionary.saveBrandButton : managementDictionary.createBrandButton}
        title={editBrandId ? managementDictionary.editBrandTitle : managementDictionary.createBrandTitle}
        unitsDictionary={unitsDictionary}
      />

      {/* Delete confirmation */}
      {delTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setDelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{d.deleteTitle}</h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  {d.deleteMessage} <span className="font-semibold text-slate-700">"{delTarget.name}"</span>?
                </p>
              </div>
            </div>
            {delTarget.count > 0 && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{d.deleteWarning.replace("{count}", String(delTarget.count))}</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                onClick={() => setDelTarget(null)}
                type="button"
              >
                {d.deleteCancel}
              </button>
              <button
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-95"
                onClick={execDelete}
                type="button"
              >
                {d.deleteConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Import modal */}
      {importOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">{d.importTitle}</h3>
            <div className="mt-5">
              {importRows.length === 0 ? (
                <label className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-12 transition hover:border-violet-400 hover:bg-violet-50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                    <Upload className="h-7 w-7 text-violet-500" />
                  </div>
                  <p className="text-base text-slate-500">
                    {d.importDropText}{" "}
                    <span className="font-semibold text-violet-600">{d.importBrowse}</span>
                  </p>
                  <input accept=".csv" className="hidden" onChange={onFileChange} type="file" />
                </label>
              ) : (
                <div>
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">{d.importPreviewTitle} ({importRows.length})</p>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-violet-100">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-violet-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">{d.importColName}</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">{d.importColDesc}</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">{d.importColStatus}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t border-violet-50">
                            <td className="px-4 py-2.5 text-slate-700">{r.name}</td>
                            <td className="px-4 py-2.5 text-slate-400">{r.description || "—"}</td>
                            <td className="px-4 py-2.5">
                              <span className={r.is_active ? "font-medium text-emerald-600" : "text-slate-400"}>
                                {r.is_active ? d.legendActive : d.legendInactive}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {importRows.length > 5 && (
                          <tr>
                            <td className="px-4 py-2.5 text-center text-slate-400" colSpan={3}>
                              +{importRows.length - 5} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importErr ? (
                <p className="mt-3 text-sm text-rose-600">{importErr}</p>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-between">
              {importRows.length > 0 ? (
                <button
                  className="text-sm text-slate-400 transition hover:text-slate-600"
                  onClick={() => setImportRows([])}
                  type="button"
                >
                  ← {d.importBrowse}
                </button>
              ) : <span />}
              <div className="flex gap-2.5">
                <button
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setImportOpen(false)}
                  type="button"
                >
                  {d.importCancel}
                </button>
                {importRows.length > 0 && (
                  <button
                    className="rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-pink-600 disabled:opacity-50"
                    disabled={importing}
                    onClick={confirmImport}
                    type="button"
                  >
                    {importing ? "…" : `${d.importConfirm} (${importRows.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
