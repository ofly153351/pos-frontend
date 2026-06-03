"use client";

import * as XLSX from "xlsx";
import { useState } from "react";
import { Download, Upload, X, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, ArrowRight } from "lucide-react";
import {
  createProduct,
  createProductBrand,
  createProductType,
  createProductUnit,
  listProductBrands,
  listProductTypes,
  listProductUnits,
} from "@/services/products";
import { toast } from "@/components/ui/toast";

// ─── Template ─────────────────────────────────────────────────────────────────

const TEMPLATE_ROWS = [
  {
    "ชื่อสินค้า (Name)*": "โค้ก 1.25L",
    "SKU": "COKE-125L",
    "Barcode": "8850999226318",
    "ราคาขาย (Price)*": 35,
    "ราคาทุน (Cost Price)": 22,
    "สต็อก (Stock)": 50,
    "สต็อกขั้นต่ำ (Min Stock)": 10,
    "หน่วย (Unit)": "ชิ้น",
    "หมวดหมู่ (Category)": "เครื่องดื่ม",
    "แบรนด์ (Brand)": "โค้ก",
    "คำอธิบาย (Description)": "",
  },
  {
    "ชื่อสินค้า (Name)*": "น้ำเปล่า 600ml",
    "SKU": "WATER-600",
    "Barcode": "",
    "ราคาขาย (Price)*": 10,
    "ราคาทุน (Cost Price)": 5,
    "สต็อก (Stock)": 100,
    "สต็อกขั้นต่ำ (Min Stock)": 20,
    "หน่วย (Unit)": "ชิ้น",
    "หมวดหมู่ (Category)": "เครื่องดื่ม",
    "แบรนด์ (Brand)": "",
    "คำอธิบาย (Description)": "น้ำดื่มบรรจุขวด",
  },
];

const COL_NAME     = "ชื่อสินค้า (Name)*";
const COL_SKU      = "SKU";
const COL_BARCODE  = "Barcode";
const COL_PRICE    = "ราคาขาย (Price)*";
const COL_COST     = "ราคาทุน (Cost Price)";
const COL_STOCK    = "สต็อก (Stock)";
const COL_MIN      = "สต็อกขั้นต่ำ (Min Stock)";
const COL_UNIT     = "หน่วย (Unit)";
const COL_CATEGORY = "หมวดหมู่ (Category)";
const COL_BRAND    = "แบรนด์ (Brand)";
const COL_DESC     = "คำอธิบาย (Description)";

// ─── Preview row ──────────────────────────────────────────────────────────────

type PreviewRow = {
  rowNum: number;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  unit: string;
  category: string;
  brand: string;
  description: string;
  error?: string; // validation error before import
};

function parsePreviewRows(dataRows: Record<string, string>[]): PreviewRow[] {
  return dataRows.map((row, i) => {
    const g = (col: string) => String(row[col] ?? "").trim();
    const name = g(COL_NAME);
    const price = g(COL_PRICE);
    let error: string | undefined;
    if (!name) error = "ชื่อสินค้าจำเป็น";
    else if (!price || isNaN(Number(price))) error = "ราคาขายต้องเป็นตัวเลข";
    return {
      rowNum: i + 2,
      name,
      sku: g(COL_SKU),
      barcode: g(COL_BARCODE),
      price,
      cost: g(COL_COST),
      stock: g(COL_STOCK),
      minStock: g(COL_MIN),
      unit: g(COL_UNIT),
      category: g(COL_CATEGORY),
      brand: g(COL_BRAND),
      description: g(COL_DESC),
      error,
    };
  });
}

// ─── Lookup cache ─────────────────────────────────────────────────────────────

class LookupCache {
  private types  = new Map<string, string>();
  private units  = new Map<string, string>();
  private brands = new Map<string, string>();
  private loaded = false;

  async load() {
    if (this.loaded) return;
    const [typesRes, unitsRes, brandsRes] = await Promise.all([
      listProductTypes(), listProductUnits(), listProductBrands(),
    ]);
    for (const t of typesRes.data ?? []) this.types.set(t.name.trim().toLowerCase(), t.id);
    for (const u of unitsRes.data ?? []) this.units.set(u.name.trim().toLowerCase(), u.id);
    for (const b of brandsRes.data ?? []) this.brands.set(b.name.trim().toLowerCase(), b.id);
    this.loaded = true;
  }

  async resolveType(name: string) {
    const key = name.trim().toLowerCase();
    if (!key) return "";
    if (this.types.has(key)) return this.types.get(key)!;
    const res = await createProductType({ name: name.trim(), slug: key.replace(/\s+/g, "-") });
    this.types.set(key, res.data.id);
    return res.data.id;
  }

  async resolveUnit(name: string) {
    const key = name.trim().toLowerCase();
    if (!key) return "";
    if (this.units.has(key)) return this.units.get(key)!;
    const res = await createProductUnit({ name: name.trim(), code: key.slice(0, 10) });
    this.units.set(key, res.data.id);
    return res.data.id;
  }

  async resolveBrand(name: string) {
    const key = name.trim().toLowerCase();
    if (!key) return "";
    if (this.brands.has(key)) return this.brands.get(key)!;
    const res = await createProductBrand({ name: name.trim() });
    this.brands.set(key, res.data.id);
    return res.data.id;
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────

type RowResult = { row: number; name: string; status: "ok" | "error"; error?: string };

// ─── Steps ───────────────────────────────────────────────────────────────────

type Step = "idle" | "preview" | "importing" | "done";

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { onClose: () => void; onSuccess: () => void; importFileRef: React.RefObject<HTMLInputElement | null> };

export function ImportProductModal({ onClose, onSuccess, importFileRef }: Props) {
  const [step, setStep]           = useState<Step>("idle");
  const [preview, setPreview]     = useState<PreviewRow[]>([]);
  const [rawRows, setRawRows]     = useState<Record<string, string>[]>([]);
  const [results, setResults]     = useState<RowResult[]>([]);
  const [progress, setProgress]   = useState({ done: 0, total: 0 });

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
    ws["!cols"] = [
      { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product-import-template.xlsx");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const dataRows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!dataRows.length) { toast.error("ไฟล์ไม่มีข้อมูล"); return; }

    setRawRows(dataRows);
    setPreview(parsePreviewRows(dataRows));
    setStep("preview");
  }

  async function startImport() {
    setStep("importing");
    setProgress({ done: 0, total: rawRows.length });

    const cache = new LookupCache();
    await cache.load();

    const rowResults: RowResult[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const g = (col: string) => String(row[col] ?? "").trim();
      const name = g(COL_NAME);

      if (!name) {
        rowResults.push({ row: i + 2, name: "(ไม่มีชื่อ)", status: "error", error: "ชื่อสินค้าจำเป็น" });
        setProgress({ done: i + 1, total: rawRows.length });
        continue;
      }

      try {
        const [typeId, unitId, brandId] = await Promise.all([
          cache.resolveType(g(COL_CATEGORY)),
          cache.resolveUnit(g(COL_UNIT)),
          cache.resolveBrand(g(COL_BRAND)),
        ]);

        await createProduct({
          name,
          sku:             g(COL_SKU)      || undefined,
          barcode:         g(COL_BARCODE)  || undefined,
          base_price:      g(COL_PRICE)    || "0",
          cost_price:      g(COL_COST)     || undefined,
          min_stock:       g(COL_MIN)      || "0",
          description:     g(COL_DESC)     || undefined,
          product_type_id: typeId          || undefined,
          unit_id:         unitId          || undefined,
          brand_id:        brandId         || undefined,
        });

        rowResults.push({ row: i + 2, name, status: "ok" });
      } catch (err) {
        rowResults.push({ row: i + 2, name, status: "error", error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" });
      }

      setProgress({ done: i + 1, total: rawRows.length });
    }

    setResults(rowResults);
    setStep("done");

    const ok   = rowResults.filter((r) => r.status === "ok").length;
    const fail = rowResults.filter((r) => r.status === "error").length;
    if (fail === 0) toast.success(`นำเข้าสำเร็จ ${ok} รายการ`);
    else toast.warning(`สำเร็จ ${ok} / ล้มเหลว ${fail} รายการ`);
  }

  const validRows   = preview.filter((r) => !r.error);
  const invalidRows = preview.filter((r) => r.error);
  const okCount     = results.filter((r) => r.status === "ok").length;
  const failCount   = results.filter((r) => r.status === "error").length;

  const canClose = step !== "importing";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onClick={canClose ? onClose : undefined}
    >
      <div
        className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ width: "100%", maxWidth: step === "preview" ? "900px" : "540px", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
              <FileSpreadsheet className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">นำเข้าสินค้าจาก Excel</h3>
              <p className="text-xs text-slate-500">
                {step === "idle"     && "ดาวน์โหลด Template กรอกข้อมูล แล้วอัปโหลด"}
                {step === "preview"  && `พบ ${preview.length} รายการ — ตรวจสอบก่อนนำเข้า`}
                {step === "importing"&& `กำลังนำเข้า ${progress.done}/${progress.total} รายการ…`}
                {step === "done"     && `เสร็จสิ้น — สำเร็จ ${okCount} / ล้มเหลว ${failCount}`}
              </p>
            </div>
          </div>
          {canClose && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── idle ─────────────────────────────────────────────── */}
          {step === "idle" && (
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">ขั้นตอนที่ 1 — ดาวน์โหลด Template</p>
                <p className="mb-3 text-xs text-slate-400">
                  มีคอลัมน์: ชื่อสินค้า, SKU, Barcode, ราคาขาย, ราคาทุน, สต็อก, สต็อกขั้นต่ำ, หน่วย, หมวดหมู่, แบรนด์, คำอธิบาย
                </p>
                <button onClick={downloadTemplate} type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">
                  <Download className="h-4 w-4" />
                  ดาวน์โหลด Template (.xlsx)
                </button>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">ขั้นตอนที่ 2 — อัปโหลดไฟล์</p>
                <p className="mb-3 text-xs text-slate-400">ระบบจะสร้างหมวดหมู่ หน่วย และแบรนด์ที่ยังไม่มีให้อัตโนมัติ</p>
                <button onClick={() => importFileRef.current?.click()} type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                  <Upload className="h-4 w-4" />
                  เลือกไฟล์ Excel
                </button>
              </div>

              <input ref={importFileRef} accept=".xlsx,.xls" className="hidden" onChange={handleFile} type="file" />
            </div>
          )}

          {/* ── preview ──────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="flex flex-col">
              {/* summary bar */}
              <div className="flex shrink-0 items-center gap-4 border-b border-slate-100 bg-violet-50/60 px-5 py-3">
                <span className="text-xs font-semibold text-slate-600">
                  ทั้งหมด <span className="text-violet-700">{preview.length}</span> แถว
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  พร้อมนำเข้า <span>{validRows.length}</span>
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-xs font-semibold text-red-500">
                    มีปัญหา <span>{invalidRows.length}</span>
                  </span>
                )}
              </div>

              {/* table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-violet-50/40 text-left">
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">#</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">ชื่อสินค้า</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">SKU</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Barcode</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap text-right">ราคาขาย</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap text-right">ราคาทุน</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap text-right">สต็อก</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">หน่วย</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">หมวดหมู่</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">แบรนด์</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr
                        key={row.rowNum}
                        className={`border-b border-slate-50 ${row.error ? "bg-red-50" : "hover:bg-violet-50/20"}`}
                      >
                        <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate">
                          {row.name || <span className="italic text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.sku || "—"}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.barcode || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.price || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{row.cost || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{row.stock || "0"}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.unit || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.category
                            ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{row.category}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.brand
                            ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">{row.brand}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.error
                            ? <span className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />{row.error}</span>
                            : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3 w-3" />พร้อม</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── importing ────────────────────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
              <p className="text-sm font-medium text-slate-700">
                กำลังนำเข้า {progress.done}/{progress.total} รายการ…
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-2 rounded-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── done ─────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="space-y-4 p-6">
              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-xs text-emerald-600">สำเร็จ</p>
                    <p className="text-2xl font-bold text-emerald-700">{okCount}</p>
                  </div>
                </div>
                {failCount > 0 && (
                  <div className="flex flex-1 items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                    <div>
                      <p className="text-xs text-red-500">ล้มเหลว</p>
                      <p className="text-2xl font-bold text-red-600">{failCount}</p>
                    </div>
                  </div>
                )}
              </div>

              {failCount > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-600">รายการที่ล้มเหลว:</p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {results.filter((r) => r.status === "error").map((r) => (
                      <div key={r.row} className="text-xs text-red-600">
                        <span className="font-semibold">แถว {r.row} — {r.name}:</span> {r.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          {step === "idle" && (
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              ยกเลิก
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("idle"); setPreview([]); setRawRows([]); }}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                เลือกไฟล์ใหม่
              </button>
              <button
                onClick={startImport}
                disabled={validRows.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                ยืนยันนำเข้า {validRows.length} รายการ
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === "done" && (
            <button onClick={onSuccess} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
              เสร็จสิ้น — ดูรายการสินค้า
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
