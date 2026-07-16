"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  EyeOff,
  FileText,
  MapPin,
  Plus,
  ScanLine,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { ConfirmDialog } from "@/components/stock/confirm-dialog";
import { ScanButton } from "@/components/shared/scan-button";
import { PageSizeDropdown } from "@/components/ui/page-size-dropdown";
import { toast } from "@/components/ui/toast";
import type { CountDictionary } from "@/components/stock/inventory-types";
import { listProducts, listProductTypes } from "@/services/products";
import { listWarehouses } from "@/services/warehouses";
import { listLocations, listLocationProducts } from "@/services/locations";
import { applyCountSession, deleteCountSession, listCountSessions, saveCountSession } from "@/services/stock-count";
import type {
  CountAuditEntry,
  CountItem,
  CountSession,
  CountStatus,
  CountType,
  VarianceReason,
} from "@/types/stock-count";

// Stock-count worksheet types (CountStatus/CountType/VarianceReason) live in
// @/types/stock-count (imported above) and are shared with the service layer.
type CountRowStatus = "match" | "short" | "over" | "notCounted" | "skipped";
type CountMode = "table" | "quick";
type ReviewDisplayMode = "variance" | "all";
type StockFilter = "all" | "ready" | "low" | "out" | "unassigned";
type CountFilterTab = "all" | "notCounted" | "counted" | "variance";
type VarianceSeverity = "low" | "medium" | "high" | "critical";

type QuickScanEntry = {
  productId: string;
  name: string;
  qty: number;
  time: string;
  status: CountRowStatus;
};

// CountAuditEntry, CountItem and CountSession are imported from @/types/stock-count.

type Props = { dictionary: CountDictionary; locale: string; autoStart?: boolean; initialStatus?: string };
type View = "list" | "wizard";
// "pending" is a meta-filter spanning draft + counting (unfinished sessions),
// used by the notification deep-link ?status=pending.
type ListStatusFilter = CountStatus | "all" | "pending";

function mapInitialListStatus(status?: string): ListStatusFilter {
  if (status === "pending") return "pending";
  if (status === "review") return "review";
  return "all";
}

const REASON_OPTIONS: VarianceReason[] = [
  "counting_error",
  "misplaced_product",
  "damaged_product",
  "missing_product",
  "receiving_not_recorded",
  "sale_not_recorded",
  "previous_adjustment_error",
  "other",
];

const STATUS_BADGE: Record<CountRowStatus, string> = {
  match: "bg-emerald-100 text-emerald-700",
  short: "bg-rose-100 text-rose-700",
  over: "bg-indigo-100 text-indigo-700",
  notCounted: "bg-slate-100 text-slate-500",
  skipped: "bg-amber-100 text-amber-700",
};

const COUNT_TYPE_BADGE: Record<CountType, string> = {
  full: "bg-violet-100 text-violet-700",
  zone: "bg-indigo-100 text-indigo-700",
  category: "bg-fuchsia-100 text-fuchsia-700",
  cycle: "bg-amber-100 text-amber-700",
};

const HEALTH_BADGE: Record<"ready" | "low" | "out", string> = {
  ready: "bg-emerald-100 text-emerald-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-rose-100 text-rose-700",
};

const SEVERITY_BADGE: Record<VarianceSeverity, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700",
};

const ROW_STATUS_BG: Record<CountRowStatus, string> = {
  match: "bg-emerald-50/60",
  short: "bg-rose-50/60",
  over: "bg-amber-50/60",
  notCounted: "bg-white",
  skipped: "bg-slate-50/60",
};

function getVarianceSeverity(item: CountItem): VarianceSeverity {
  const diff = Math.abs(variance(item));
  if (diff === 0) return "low";
  const value = diff * (item.costBasis || 0);
  if (diff <= 2 && value <= 500) return "low";
  if (diff <= 5 && value <= 2000) return "medium";
  if (diff <= 10 || value <= 5000) return "high";
  return "critical";
}

function parseWarehouse(s?: string | null): { warehouse: string | null; zone: string | null } {
  const raw = s?.trim();
  if (!raw) return { warehouse: null, zone: null };
  const parts = raw.split(/[·>/]/).map((x) => x.trim()).filter(Boolean);
  return { warehouse: parts[0] ?? null, zone: parts[1] ?? null };
}

function variance(it: CountItem): number {
  return it.counted == null ? 0 : it.counted - it.systemQty;
}

function hasVariance(it: CountItem): boolean {
  return !it.skipped && it.counted != null && it.counted !== it.systemQty;
}

function rowStatus(it: CountItem): CountRowStatus {
  if (it.skipped) return "skipped";
  if (it.counted == null) return "notCounted";
  const diff = it.counted - it.systemQty;
  return diff === 0 ? "match" : diff < 0 ? "short" : "over";
}

function itemHealth(systemQty: number, minStock: number): "ready" | "low" | "out" {
  if (systemQty <= 0) return "out";
  if (minStock > 0 && systemQty <= minStock) return "low";
  return "ready";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeSession(s: Partial<CountSession> & { id: string; name: string; createdAt: string }): CountSession {
  return {
    id: s.id,
    name: s.name,
    locationId: s.locationId ?? null,
    locationName: s.locationName ?? null,
    warehouseName: s.warehouseName ?? null,
    zone: s.zone ?? null,
    categoryId: s.categoryId ?? null,
    categoryName: s.categoryName ?? null,
    staff: s.staff ?? "",
    note: s.note ?? "",
    status: (s.status as CountStatus) ?? "draft",
    createdAt: s.createdAt,
    createdBy: s.createdBy ?? "",
    countType: (s.countType as CountType) ?? "full",
    cycleRule: s.cycleRule ?? "",
    blindCount: Boolean(s.blindCount),
    completedAt: s.completedAt ?? null,
    completedBy: s.completedBy ?? "",
    auditTrail: (s.auditTrail ?? []).map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.productName,
      systemQty: entry.systemQty ?? 0,
      countedQty: entry.countedQty ?? 0,
      difference: entry.difference ?? 0,
      reason: entry.reason ?? "",
      user: entry.user ?? "",
      timestamp: entry.timestamp ?? "",
    })),
    items: (s.items ?? []).map((it) => ({
      productId: it.productId,
      name: it.name,
      sku: it.sku ?? "",
      barcode: it.barcode ?? "",
      systemQty: it.systemQty ?? 0,
      minStock: it.minStock ?? 0,
      location: it.location ?? "",
      counted: typeof it.counted === "number" ? it.counted : null,
      note: it.note ?? "",
      skipped: Boolean(it.skipped),
      varianceReason: (it.varianceReason as VarianceReason) ?? "",
      varianceReasonOther: it.varianceReasonOther ?? "",
      countUser: it.countUser ?? "",
      countedAt: it.countedAt ?? null,
      costBasis: it.costBasis ?? 0,
      adjusted: Boolean(it.adjusted),
      adjustedAt: it.adjustedAt ?? null,
      adjustedBy: it.adjustedBy ?? "",
    })),
  };
}

export function StockCountManager({ dictionary, locale, autoStart = false, initialStatus }: Props) {
  const t = dictionary;
  const [sessions, setSessions] = useState<CountSession[]>([]);
  // Mirrors `sessions` so persist() can diff against the latest committed value
  // synchronously. The server is the source of truth — localStorage is gone.
  const sessionsRef = useRef<CountSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // ?new=1 (from inventory "Start Count") opens the new-session wizard directly;
  // all wizard form fields already default to the same empty values openNewWizard() sets.
  const [view, setView] = useState<View>(autoStart ? "wizard" : "list");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const counterRef = useRef(0);
  const quickBarcodeRef = useRef<HTMLInputElement | null>(null);
  const quickQtyRef = useRef<HTMLInputElement | null>(null);

  const [fName, setFName] = useState("");
  const [fWarehouse, setFWarehouse] = useState("");
  const [fLocation, setFLocation] = useState(""); // session location id (required to start)
  const [fZone, setFZone] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fStaff, setFStaff] = useState("");
  const [fNote, setFNote] = useState("");
  const [fCountType, setFCountType] = useState<CountType>("full");
  const [fCycleRule, setFCycleRule] = useState("");
  const [fBlindCount, setFBlindCount] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectSearch, setSelectSearch] = useState("");
  const [selectCategory, setSelectCategory] = useState("");
  const [selectStockFilter, setSelectStockFilter] = useState<StockFilter>("all");

  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<ListStatusFilter>(mapInitialListStatus(initialStatus));
  const [listWarehouse, setListWarehouse] = useState("all");
  const [listDateFrom, setListDateFrom] = useState("");
  const [listDateTo, setListDateTo] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);

  const [scan, setScan] = useState("");
  const [countMode, setCountMode] = useState<CountMode>("table");
  const [quickCode, setQuickCode] = useState("");
  const [quickQty, setQuickQty] = useState("");
  const [quickFoundId, setQuickFoundId] = useState<string | null>(null);
  const [lastQuickSaved, setLastQuickSaved] = useState<string>("");
  const [reviewDisplayMode, setReviewDisplayMode] = useState<ReviewDisplayMode>("variance");

  const [excludeApply, setExcludeApply] = useState<Set<string>>(new Set());
  const [countFilter, setCountFilter] = useState<CountFilterTab>("all");
  const [quickScanHistory, setQuickScanHistory] = useState<QuickScanEntry[]>([]);

  const dtf = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const sessionsQuery = useQuery({
    queryKey: ["count", "sessions"],
    queryFn: async () => (await listCountSessions()).data,
  });
  const queryClient = useQueryClient();
  const seededRef = useRef(false);
  // Seed local state once from the server, then treat it as the working copy that
  // persist() keeps in sync. Every terminal loads the same server-side sessions.
  useEffect(() => {
    if (seededRef.current || !sessionsQuery.data) return;
    seededRef.current = true;
    const loaded = sessionsQuery.data.map(normalizeSession);
    sessionsRef.current = loaded;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(loaded);
  }, [sessionsQuery.data]);

  // Sync the list filter when the ?status= deep-link changes (notification click
  // while already on the count page). Adjusted during render via the prev-prop
  // pattern (no effect → no cascading re-render / flaky set-state-in-effect lint).
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus);
  if (initialStatus !== prevInitialStatus) {
    setPrevInitialStatus(initialStatus);
    setListStatus(mapInitialListStatus(initialStatus));
    // A count deep-link (?status=pending|review) should reveal the filtered list
    // even if the user was mid-wizard on the same route (session stays persisted).
    if (initialStatus === "pending" || initialStatus === "review") setView("list");
  }

  // Optimistically update local state, then sync the delta to the server so every
  // terminal converges on the same worksheet data. Replaces localStorage entirely.
  function persist(next: CountSession[]) {
    const prev = sessionsRef.current;
    sessionsRef.current = next;
    setSessions(next);

    const prevById = new Map(prev.map((s) => [s.id, s]));
    const nextIds = new Set(next.map((s) => s.id));
    for (const session of next) {
      const before = prevById.get(session.id);
      if (!before || JSON.stringify(before) !== JSON.stringify(session)) {
        void saveCountSession(session).catch(() => {});
      }
    }
    for (const session of prev) {
      if (!nextIds.has(session.id)) {
        void deleteCountSession(session.id).catch(() => {});
      }
    }
  }

  const productsQuery = useQuery({
    queryKey: ["count", "products"],
    queryFn: async () => (await listProducts({ limit: 9999, page: 1 })).data,
  });
  const warehousesQuery = useQuery({
    queryKey: ["count", "warehouses"],
    queryFn: async () => (await listWarehouses()).data,
  });
  const categoriesQuery = useQuery({
    queryKey: ["count", "categories"],
    queryFn: async () => (await listProductTypes()).data,
  });
  // Active storage locations (a count session targets exactly one). Scoped to the chosen
  // warehouse by name when one is selected.
  const locationsQuery = useQuery({
    queryKey: ["count", "locations"],
    queryFn: async () => (await listLocations({ limit: 500 })).data.items,
  });
  const activeLocations = useMemo(
    () => (locationsQuery.data ?? []).filter((l) => l.is_active && (!fWarehouse || (l.warehouse_name ?? "") === fWarehouse)),
    [locationsQuery.data, fWarehouse],
  );
  const selectedLocation = useMemo(
    () => (locationsQuery.data ?? []).find((l) => l.id === fLocation) ?? null,
    [locationsQuery.data, fLocation],
  );
  // Per-location on-hand for THIS session's location → the authoritative system quantity for
  // each counted product (NOT the store-wide aggregate).
  const locationQtyQuery = useQuery({
    enabled: Boolean(fLocation),
    queryKey: ["count", "location-qty", fLocation],
    queryFn: async () => {
      const items = (await listLocationProducts(fLocation, { limit: 5000 })).data.items;
      const map = new Map<string, number>();
      for (const it of items) map.set(it.product_id, it.quantity);
      return map;
    },
  });

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const activeUser = active?.staff.trim() || active?.createdBy.trim() || "System";

  useEffect(() => {
    if (view === "wizard" && step >= 3 && (!activeId || !sessions.some((s) => s.id === activeId))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("list");
      setStep(1);
      setActiveId(null);
    }
  }, [view, step, activeId, sessions]);

  useEffect(() => {
    if (step !== 3 || countMode !== "quick") return;
    quickBarcodeRef.current?.focus();
  }, [step, countMode]);

  function newId(prefix = "cs") {
    counterRef.current += 1;
    let candidate = `${prefix}-${counterRef.current.toString(36)}`;
    while (sessions.some((session) => session.id === candidate || session.auditTrail.some((entry) => entry.id === candidate))) {
      counterRef.current += 1;
      candidate = `${prefix}-${counterRef.current.toString(36)}`;
    }
    return candidate;
  }

  function backToList() {
    setView("list");
    setStep(1);
    setActiveId(null);
    setCountMode("table");
    setQuickCode("");
    setQuickQty("");
    setQuickFoundId(null);
    setLastQuickSaved("");
  }

  function updateActive(mut: (session: CountSession) => CountSession) {
    if (!active) return;
    persist(sessions.map((session) => (session.id === active.id ? mut(session) : session)));
  }

  function findCountItemByCode(session: CountSession, code: string) {
    const needle = code.trim().toLowerCase();
    if (!needle) return null;
    return session.items.find((item) => item.barcode.toLowerCase() === needle || item.sku.toLowerCase() === needle) ?? null;
  }

  const candidates = useMemo(() => {
    const all = productsQuery.data?.items ?? [];
    return all.filter((product) => {
      if (fCategory && product.product_type_id !== fCategory) return false;
      if (fWarehouse) {
        const parsed = parseWarehouse(product.storage_location);
        if (parsed.warehouse !== fWarehouse) return false;
        if (fZone && parsed.zone !== fZone) return false;
      }
      return true;
    });
  }, [productsQuery.data, fCategory, fWarehouse, fZone]);

  const filteredCandidates = useMemo(() => {
    const q = selectSearch.trim().toLowerCase();
    return candidates.filter((product) => {
      if (selectCategory && product.product_type_id !== selectCategory) return false;
      const health = itemHealth(product.total_stock ?? 0, product.min_stock ?? 0);
      const hasLocation = Boolean(product.storage_location?.trim());
      if (selectStockFilter === "ready" && health !== "ready") return false;
      if (selectStockFilter === "low" && health !== "low") return false;
      if (selectStockFilter === "out" && health !== "out") return false;
      if (selectStockFilter === "unassigned" && hasLocation) return false;
      if (!q) return true;
      return product.name.toLowerCase().includes(q)
        || (product.sku ?? "").toLowerCase().includes(q)
        || (product.barcode ?? "").toLowerCase().includes(q);
    });
  }, [candidates, selectSearch, selectCategory, selectStockFilter]);

  const sessionCards = useMemo(() => {
    const total = sessions.length;
    const draft = sessions.filter((s) => s.status === "draft").length;
    const counting = sessions.filter((s) => s.status === "counting").length;
    const review = sessions.filter((s) => s.status === "review").length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    const cancelled = sessions.filter((s) => s.status === "cancelled").length;
    return { total, draft, counting, review, completed, cancelled };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return sessions.filter((session) => {
      if (listStatus === "pending") {
        if (session.status !== "draft" && session.status !== "counting") return false;
      } else if (listStatus !== "all" && session.status !== listStatus) {
        return false;
      }
      if (listWarehouse !== "all" && (session.warehouseName || "") !== listWarehouse) return false;
      if (listDateFrom) {
        const from = new Date(`${listDateFrom}T00:00:00`).getTime();
        if (new Date(session.createdAt).getTime() < from) return false;
      }
      if (listDateTo) {
        const to = new Date(`${listDateTo}T23:59:59`).getTime();
        if (new Date(session.createdAt).getTime() > to) return false;
      }
      if (!q) return true;
      return session.name.toLowerCase().includes(q);
    });
  }, [sessions, listSearch, listStatus, listWarehouse, listDateFrom, listDateTo]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setListPage(1);
  }, [listSearch, listStatus, listWarehouse, listDateFrom, listDateTo]);

  const listTotalPages = Math.max(1, Math.ceil(filteredSessions.length / listPageSize));
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedSessions = useMemo(() => {
    const start = (safeListPage - 1) * listPageSize;
    return filteredSessions.slice(start, start + listPageSize);
  }, [filteredSessions, safeListPage, listPageSize]);

  const countTypeOptions = [
    { value: "full" as const, label: t.create.countTypeOptions.full },
    { value: "zone" as const, label: t.create.countTypeOptions.zone },
    { value: "category" as const, label: t.create.countTypeOptions.category },
    { value: "cycle" as const, label: t.create.countTypeOptions.cycle },
  ];

  function openNewWizard() {
    setFName("");
    setFWarehouse("");
    setFLocation("");
    setFZone("");
    setFCategory("");
    setFStaff("");
    setFNote("");
    setFCountType("full");
    setFCycleRule("");
    setFBlindCount(false);
    setSelectedIds(new Set());
    setSelectSearch("");
    setSelectCategory("");
    setSelectStockFilter("all");
    setActiveId(null);
    setStep(1);
    setView("wizard");
    setCountMode("table");
    setReviewDisplayMode("variance");
    setExcludeApply(new Set());
  }

  function goToSelect() {
    setSelectedIds(new Set(candidates.map((product) => product.id)));
    setSelectSearch("");
    setSelectCategory("");
    setSelectStockFilter("all");
    setStep(2);
  }

  function startCounting() {
    const chosen = candidates.filter((product) => selectedIds.has(product.id));
    if (chosen.length === 0 || !fLocation || !selectedLocation) return;
    // Authoritative system quantity is this session LOCATION's on-hand per product (0 if the
    // product has no stock row there) — never the store-wide aggregate.
    const locQty = locationQtyQuery.data ?? new Map<string, number>();
    const items: CountItem[] = chosen.map((product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      systemQty: locQty.get(product.id) ?? 0,
      minStock: product.min_stock ?? 0,
      location: product.storage_location?.trim() ?? "",
      counted: null,
      note: "",
      skipped: false,
      varianceReason: "",
      varianceReasonOther: "",
      countUser: "",
      countedAt: null,
      costBasis: product.cost_price ?? product.base_price ?? 0,
      adjusted: false,
      adjustedAt: null,
      adjustedBy: "",
    }));
    const categoryName = fCategory ? (categoriesQuery.data ?? []).find((category) => category.id === fCategory)?.name ?? null : null;
    const locName = `${selectedLocation.warehouse_name ? `${selectedLocation.warehouse_name} › ` : ""}${selectedLocation.zone_name ? `${selectedLocation.zone_name} › ` : ""}${selectedLocation.name}`;
    const session: CountSession = {
      id: newId(),
      name: fName.trim() || t.create.title,
      locationId: fLocation,
      locationName: locName,
      warehouseName: fWarehouse || selectedLocation.warehouse_name || null,
      zone: fZone || null,
      categoryId: fCategory || null,
      categoryName,
      staff: fStaff.trim(),
      note: fNote.trim(),
      status: "counting",
      createdAt: new Date().toISOString(),
      createdBy: fStaff.trim(),
      items,
      countType: fCountType,
      cycleRule: fCycleRule.trim(),
      blindCount: fBlindCount,
      completedAt: null,
      completedBy: "",
      auditTrail: [],
    };
    persist([session, ...sessions]);
    setActiveId(session.id);
    setScan("");
    setCountMode("table");
    setQuickCode("");
    setQuickQty("");
    setQuickFoundId(null);
    setLastQuickSaved("");
    setCountFilter("all");
    setQuickScanHistory([]);
    setStep(3);
  }

  function setCounted(productId: string, value: number | null) {
    const now = new Date().toISOString();
    updateActive((session) => ({
      ...session,
      items: session.items.map((item) => (
        item.productId === productId
          ? {
            ...item,
            counted: value,
            skipped: false,
            countUser: activeUser,
            countedAt: value == null ? item.countedAt : now,
            varianceReason: value == null || value === item.systemQty ? "" : item.varianceReason,
            varianceReasonOther: value == null || value === item.systemQty ? "" : item.varianceReasonOther,
          }
          : item
      )),
    }));
  }

  function toggleSkipped(productId: string) {
    const now = new Date().toISOString();
    updateActive((session) => ({
      ...session,
      items: session.items.map((item) => (
        item.productId === productId
          ? {
            ...item,
            skipped: !item.skipped,
            counted: !item.skipped ? null : item.counted,
            countUser: activeUser,
            countedAt: now,
            varianceReason: "",
            varianceReasonOther: "",
          }
          : item
      )),
    }));
  }

  function setItemNote(productId: string, note: string) {
    updateActive((session) => ({
      ...session,
      items: session.items.map((item) => (item.productId === productId ? { ...item, note } : item)),
    }));
  }

  function setVarianceReason(productId: string, reason: VarianceReason) {
    updateActive((session) => ({
      ...session,
      items: session.items.map((item) => (
        item.productId === productId
          ? { ...item, varianceReason: reason, varianceReasonOther: reason === "other" ? item.varianceReasonOther : "" }
          : item
      )),
    }));
  }

  function setVarianceReasonOther(productId: string, text: string) {
    updateActive((session) => ({
      ...session,
      items: session.items.map((item) => (item.productId === productId ? { ...item, varianceReasonOther: text } : item)),
    }));
  }

  function saveDraft() {
    updateActive((session) => ({ ...session, status: "draft" }));
    toast.success(t.draftSaved);
    backToList();
  }

  function gotoReview() {
    updateActive((session) => ({ ...session, status: session.status === "completed" ? session.status : "review" }));
    setExcludeApply(new Set());
    setStep(4);
  }

  function backToCounting() {
    if (active && active.status !== "completed") updateActive((session) => ({ ...session, status: "counting" }));
    setStep(3);
  }

  function openContinue(session: CountSession) {
    setActiveId(session.id);
    setScan("");
    setCountMode("table");
    setQuickCode("");
    setQuickQty("");
    setQuickFoundId(null);
    setLastQuickSaved("");
    setReviewDisplayMode("variance");
    setStep(3);
    setView("wizard");
  }

  function openReview(session: CountSession) {
    setActiveId(session.id);
    setExcludeApply(new Set());
    setReviewDisplayMode("variance");
    setStep(4);
    setView("wizard");
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!active) return;
    const item = findCountItemByCode(active, scan);
    if (!item) {
      toast.error(t.scanNotFound);
      setScan("");
      return;
    }
    setCounted(item.productId, (item.counted ?? 0) + 1);
    setScan("");
  }

  // Camera scan (mobile): same as the quick-scan bar's Enter path — a matched
  // code bumps that item's counted qty by one; an unknown code shows the same
  // "not found" toast.
  function handleCameraScan(code: string) {
    if (!active) return;
    const item = findCountItemByCode(active, code);
    if (!item) {
      toast.error(t.scanNotFound);
      return;
    }
    setCounted(item.productId, (item.counted ?? 0) + 1);
  }

  function openQuickFound() {
    if (!active) return;
    const item = findCountItemByCode(active, quickCode);
    if (!item) {
      toast.error(t.quickScan.notFound);
      setQuickFoundId(null);
      setQuickQty("");
      return;
    }
    setQuickFoundId(item.productId);
    setQuickQty(item.counted == null ? "" : String(item.counted));
    window.setTimeout(() => quickQtyRef.current?.focus(), 0);
  }

  function handleQuickBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    openQuickFound();
  }

  function clearQuickSelection() {
    setQuickCode("");
    setQuickQty("");
    setQuickFoundId(null);
    window.setTimeout(() => quickBarcodeRef.current?.focus(), 0);
  }

  function saveQuickCount() {
    if (!active || !quickFound) return;
    const parsed = quickQty.trim() === "" ? null : Math.max(0, Number.parseInt(quickQty, 10) || 0);
    if (parsed == null) return;
    setCounted(quickFound.productId, parsed);
    setLastQuickSaved(quickFound.name);
    const status = rowStatus({ ...quickFound, counted: parsed, skipped: false });
    setQuickScanHistory((prev) => [
      { productId: quickFound.productId, name: quickFound.name, qty: parsed, time: new Date().toISOString(), status },
      ...prev.slice(0, 19),
    ]);
    clearQuickSelection();
  }

  function skipQuickItem() {
    if (!quickFound) return;
    toggleSkipped(quickFound.productId);
    setLastQuickSaved(t.quickScan.skipped.replace("{name}", quickFound.name));
    clearQuickSelection();
  }

  function nextQuickItem() {
    clearQuickSelection();
  }

  function handleQuickQtyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    saveQuickCount();
  }

  function reasonText(item: CountItem) {
    if (!item.varianceReason) return "";
    if (item.varianceReason === "other") return item.varianceReasonOther.trim();
    return t.review.reasonOptions[item.varianceReason];
  }

  function exportSheet() {
    if (!active) return;
    const rows = active.items.map((item) => ({
      [t.col.product]: item.name,
      [t.col.sku]: item.sku,
      [t.col.barcode]: item.barcode,
      [t.col.location]: item.location,
      [t.col.systemQty]: item.systemQty,
      [t.col.countedQty]: item.counted ?? "",
      [t.col.variance]: item.skipped || item.counted == null ? "" : variance(item),
      [t.col.status]: item.skipped ? t.variance.skipped : rowStatus(item) === "match"
        ? t.variance.match
        : rowStatus(item) === "short"
          ? t.variance.short
          : rowStatus(item) === "over"
            ? t.variance.over
            : t.variance.notCounted,
      [t.review.reason]: reasonText(item),
      [t.col.note]: item.note,
      [t.review.adjusted]: item.adjusted ? t.review.adjustedYes : t.review.adjustedNo,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Count");
    XLSX.writeFile(wb, `count-${active.name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    if (!active) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=1080,height=900");
    if (!win) {
      toast.error(t.review.pdfOpenError);
      return;
    }
    const varianceRows = active.items.filter((item) => hasVariance(item));
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${active.name}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
    h1,h2 { margin: 0 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin: 18px 0; }
    .card { border: 1px solid #e9d5ff; border-radius: 16px; padding: 14px; }
    .muted { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .val { margin-top: 4px; font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${active.name}</h1>
  <div class="grid">
    <div class="card"><div class="muted">${t.review.sessionSummary}</div><div class="val">${active.status}</div></div>
    <div class="card"><div class="muted">${t.summary.totalItems}</div><div class="val">${active.items.length}</div></div>
    <div class="card"><div class="muted">${t.review.netImpact}</div><div class="val">${formatCurrency(impactSummary.netValue)}</div></div>
  </div>
  <h2>${t.review.varianceTable}</h2>
  <table>
    <thead>
      <tr>
        <th>${t.col.product}</th>
        <th>${t.col.systemQty}</th>
        <th>${t.col.countedQty}</th>
        <th>${t.col.variance}</th>
        <th>${t.review.reason}</th>
        <th>${t.review.adjusted}</th>
      </tr>
    </thead>
    <tbody>
      ${varianceRows.map((item) => `<tr>
        <td>${item.name}</td>
        <td>${item.systemQty}</td>
        <td>${item.counted ?? ""}</td>
        <td>${variance(item) > 0 ? "+" : ""}${variance(item)}</td>
        <td>${reasonText(item) || "-"}</td>
        <td>${item.adjusted ? t.review.adjustedYes : t.review.adjustedNo}</td>
      </tr>`).join("") || `<tr><td colspan="6">${t.review.noVariance}</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const summary = (() => {
    const items = active?.items ?? [];
    let counted = 0;
    let matched = 0;
    let short = 0;
    let over = 0;
    let skipped = 0;
    for (const item of items) {
      const status = rowStatus(item);
      if (item.counted != null && !item.skipped) counted += 1;
      if (status === "match") matched += 1;
      if (status === "short") short += 1;
      if (status === "over") over += 1;
      if (status === "skipped") skipped += 1;
    }
    const remaining = Math.max(items.length - counted - skipped, 0);
    const progress = items.length === 0 ? 0 : Math.round(((counted + skipped) / items.length) * 100);
    const countedPercent = items.length === 0 ? 0 : Math.round((counted / items.length) * 100);
    return {
      total: items.length,
      counted,
      matched,
      short,
      over,
      skipped,
      remaining,
      notCounted: remaining,
      progress,
      countedPercent,
    };
  })();

  const filteredCountItems = (() => {
    const items = active?.items ?? [];
    switch (countFilter) {
      case "notCounted": return items.filter((item) => item.counted == null && !item.skipped);
      case "counted": return items.filter((item) => item.counted != null && !item.skipped);
      case "variance": return items.filter((item) => hasVariance(item));
      default: return items;
    }
  })();

  const filterCounts = (() => {
    const items = active?.items ?? [];
    return {
      all: items.length,
      notCounted: items.filter((item) => item.counted == null && !item.skipped).length,
      counted: items.filter((item) => item.counted != null && !item.skipped).length,
      variance: items.filter((item) => hasVariance(item)).length,
    };
  })();

  const hasCriticalVariance = (active?.items ?? []).some((item) => hasVariance(item) && getVarianceSeverity(item) === "critical");

  const hasHighVariance = (active?.items ?? []).some((item) => hasVariance(item) && (getVarianceSeverity(item) === "high" || getVarianceSeverity(item) === "critical"));

  const varianceItems = (active?.items ?? []).filter((item) => hasVariance(item));
  const reviewItems = (active?.items ?? []).filter((item) => (
    reviewDisplayMode === "all"
      ? true
      : hasVariance(item) || item.skipped || item.counted == null
  ));

  const impactSummary = (() => {
    let itemsIncreased = 0;
    let itemsDecreased = 0;
    let qtyIncrease = 0;
    let qtyDecrease = 0;
    let valueIncrease = 0;
    let valueDecrease = 0;
    let missingCostItems = 0;
    for (const item of varianceItems) {
      const diff = variance(item);
      const basis = item.costBasis ?? 0;
      if (!basis) missingCostItems += 1;
      if (diff > 0) {
        itemsIncreased += 1;
        qtyIncrease += diff;
        valueIncrease += diff * basis;
      } else if (diff < 0) {
        itemsDecreased += 1;
        qtyDecrease += Math.abs(diff);
        valueDecrease += Math.abs(diff) * basis;
      }
    }
    return {
      itemsIncreased,
      itemsDecreased,
      qtyIncrease,
      qtyDecrease,
      netChange: qtyIncrease - qtyDecrease,
      valueIncrease,
      valueDecrease,
      netValue: valueIncrease - valueDecrease,
      missingCostItems,
    };
  })();

  const applyTargets = reviewItems.filter((item) => !excludeApply.has(item.productId) && hasVariance(item) && item.counted != null);
  const missingReasons = applyTargets.filter((item) => !item.varianceReason || (item.varianceReason === "other" && !item.varianceReasonOther.trim())).length;
  const reviewBlocked = !active || active.items.length === 0 || active.status === "completed";
  const applyImpactSummary = (() => {
    let qtyIncrease = 0;
    let qtyDecrease = 0;
    for (const item of applyTargets) {
      const diff = variance(item);
      if (diff > 0) qtyIncrease += diff;
      if (diff < 0) qtyDecrease += Math.abs(diff);
    }
    return {
      itemsToUpdate: applyTargets.length,
      qtyIncrease,
      qtyDecrease,
      netChange: qtyIncrease - qtyDecrease,
    };
  })();
  const quickFound = active?.items.find((item) => item.productId === quickFoundId) ?? null;

  async function applyCorrection() {
    if (!active || isPending || applyTargets.length === 0 || missingReasons > 0 || reviewBlocked) return;
    // Legacy containment: a session without a storage location cannot be applied safely (its
    // system quantities are aggregates). Surface the localized reason instead of attempting it
    // (the backend also rejects this — this just avoids a round-trip and is clearer).
    if (!active.locationId) {
      toast.error(t.review.legacyNoLocation);
      return;
    }
    setConfirmApply(false);
    startTransition(async () => {
      const now = new Date().toISOString();
      const items = applyTargets.map((item) => ({
        productId: item.productId,
        countedQty: item.counted!,
        note: `${t.review.applyNote} · ${active.name} · ${reasonText(item) || "-"} · ${item.sku || item.productId}`,
      }));
      try {
        // ONE atomic backend transaction: every correction commits together or none
        // does. No partial application, and the session completes only on success.
        await applyCountSession(active.id, items);
      } catch (e) {
        // Surface the backend's specific domain message when present — in particular the
        // location-aware stale-count conflict (a counted total that cannot be written to a
        // single location, or stock that moved after counting). Falls back to the generic
        // apply error. Session stays in review; nothing was applied.
        toast.error(e instanceof Error && e.message ? e.message : t.review.applyError);
        return;
      }
      // A successful apply mutated real stock at the session location → refresh every inventory
      // surface (Inventory page, Warehouse page, per-location cache, Inventory Value report) so
      // no stale KPI lingers, without refetching unrelated app data.
      for (const key of [["inventory"], ["wh-inv"], ["stock-adjust", "by-location"], ["reports", "inventory-value"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      const auditTrail: CountAuditEntry[] = applyTargets.map((item) => ({
        id: newId("audit"),
        productId: item.productId,
        productName: item.name,
        systemQty: item.systemQty,
        countedQty: item.counted ?? 0,
        difference: variance(item),
        reason: reasonText(item),
        user: activeUser,
        timestamp: now,
      }));
      updateActive((session) => ({
        ...session,
        status: "completed",
        completedAt: now,
        completedBy: activeUser,
        auditTrail: [...session.auditTrail, ...auditTrail],
        items: session.items.map((item) => {
          const target = applyTargets.find((x) => x.productId === item.productId);
          if (!target) return item;
          return {
            ...item,
            adjusted: true,
            adjustedAt: now,
            adjustedBy: activeUser,
          };
        }),
      }));
      toast.success(t.review.applied.replace("{n}", String(applyTargets.length)));
      backToList();
    });
  }

  const statusBadge = (status: CountStatus) => {
    const map: Record<CountStatus, { label: string; cls: string }> = {
      draft: { label: t.status.draft, cls: "bg-slate-100 text-slate-600" },
      counting: { label: t.status.counting, cls: "bg-violet-100 text-violet-700" },
      review: { label: t.status.review, cls: "bg-amber-100 text-amber-700" },
      completed: { label: t.status.completed, cls: "bg-emerald-100 text-emerald-700" },
      cancelled: { label: t.status.cancelled, cls: "bg-rose-100 text-rose-700" },
    };
    return map[status];
  };

  function varianceCount(session: CountSession) {
    return session.items.filter((item) => hasVariance(item)).length;
  }

  function countTypeLabel(countType: CountType) {
    return t.create.countTypeOptions[countType];
  }

  if (view === "list") {
    const dashboardCards = [
      { label: t.list.dashboard.totalSessions, value: sessionCards.total, tone: "bg-violet-100 text-violet-700" },
      { label: t.list.dashboard.draft, value: sessionCards.draft, tone: "bg-slate-100 text-slate-600" },
      { label: t.list.dashboard.counting, value: sessionCards.counting, tone: "bg-indigo-100 text-indigo-700" },
      { label: t.list.dashboard.review, value: sessionCards.review, tone: "bg-amber-100 text-amber-700" },
      { label: t.list.dashboard.completed, value: sessionCards.completed, tone: "bg-emerald-100 text-emerald-700" },
      { label: t.list.dashboard.cancelled, value: sessionCards.cancelled, tone: "bg-rose-100 text-rose-700" },
    ];

    return (
      <div className="w-full xl:px-2 2xl:px-4">
        <div className="my-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
            <p className="text-sm text-slate-500">{t.subtitle}</p>
          </div>
          <button type="button" onClick={openNewWizard} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700">
            <Plus className="h-4 w-4" />
            {t.newSession}
          </button>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {dashboardCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
              <div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${card.tone}`}>{card.label}</div>
              <p className="mt-2 text-xl font-black text-slate-900 tabular-nums sm:text-2xl">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="mb-3 rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
              <input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder={t.list.searchPlaceholder} className="h-10 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>
            <select value={listStatus} onChange={(e) => setListStatus(e.target.value as ListStatusFilter)} className={inputCls}>
              <option value="all">{t.list.allStatuses}</option>
              <option value="pending">{t.list.pending}</option>
              <option value="draft">{t.status.draft}</option>
              <option value="counting">{t.status.counting}</option>
              <option value="review">{t.status.review}</option>
              <option value="completed">{t.status.completed}</option>
              <option value="cancelled">{t.status.cancelled}</option>
            </select>
            <select value={listWarehouse} onChange={(e) => setListWarehouse(e.target.value)} className={inputCls}>
              <option value="all">{t.list.allWarehouses}</option>
              {(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2 xl:col-span-1">
              <input type="date" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)} className={inputCls} />
              <input type="date" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)} className={inputCls} />
            </div>
          </div>
        </section>

        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-violet-300" />
            <p className="mt-3 text-sm text-slate-500">{sessions.length === 0 ? t.noSessions : t.list.noFilteredSessions}</p>
          </div>
        ) : (
          <section className="rounded-xl bg-white shadow-sm">
            <div className="overflow-auto pretty-scroll rounded-xl">
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5 font-bold">{t.list.session}</th>
                    <th className="hidden px-3 py-2.5 font-bold lg:table-cell">{t.list.warehouse}</th>
                    <th className="hidden px-3 py-2.5 font-bold xl:table-cell">{t.list.zone}</th>
                    <th className="hidden px-3 py-2.5 font-bold xl:table-cell">{t.list.category}</th>
                    <th className="px-3 py-2.5 font-bold">{t.list.status}</th>
                    <th className="hidden px-3 py-2.5 font-bold lg:table-cell">{t.list.type}</th>
                    <th className="px-3 py-2.5 font-bold">{t.list.progress}</th>
                    <th className="px-3 py-2.5 text-right font-bold">{t.list.varianceItems}</th>
                    <th className="hidden px-3 py-2.5 font-bold xl:table-cell">{t.list.lastActivity}</th>
                    <th className="hidden px-3 py-2.5 font-bold lg:table-cell">{t.list.createdBy}</th>
                    <th className="px-3 py-2.5 text-right font-bold">{t.list.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSessions.map((session) => {
                    const sBadge = statusBadge(session.status);
                    const typeLabel = countTypeLabel(session.countType);
                    const countedItems = session.items.filter((item) => item.counted != null && !item.skipped).length;
                    const progressPct = session.items.length === 0 ? 0 : Math.round((countedItems / session.items.length) * 100);
                    const canDelete = session.status === "draft";
                    const canContinue = session.status !== "completed" && session.status !== "cancelled";
                    const lastAct = session.items.reduce((latest, item) => {
                      const ts = item.countedAt || item.adjustedAt;
                      return ts && ts > latest ? ts : latest;
                    }, session.createdAt);
                    return (
                      <tr key={session.id} className="bg-white align-middle hover:bg-violet-50/40">
                        <td className="px-3 py-2.5">
                          <p className="truncate text-sm font-bold text-slate-900" title={session.name}>{session.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            {session.staff ? <span>{session.staff}</span> : null}
                            {session.blindCount ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{t.create.blindCount}</span> : null}
                            {session.cycleRule ? <span>{session.cycleRule}</span> : null}
                          </div>
                        </td>
                        <td className="hidden px-3 py-2.5 text-sm text-slate-600 lg:table-cell">{session.warehouseName || t.list.allWarehouses}</td>
                        <td className="hidden px-3 py-2.5 text-sm text-slate-600 xl:table-cell">{session.zone || "—"}</td>
                        <td className="hidden px-3 py-2.5 text-sm text-slate-600 xl:table-cell">{session.categoryName || t.list.allCategories}</td>
                        <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${sBadge.cls}`}>{sBadge.label}</span></td>
                        <td className="hidden px-3 py-2.5 lg:table-cell"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${COUNT_TYPE_BADGE[session.countType]}`}>{typeLabel}</span></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full transition-all ${progressPct === 100 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-600 tabular-nums">{progressPct}%</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">{countedItems}/{session.items.length}</p>
                        </td>
                        <td className={`px-3 py-2.5 text-right text-sm font-bold tabular-nums ${varianceCount(session) > 0 ? "text-rose-600" : "text-slate-400"}`}>{varianceCount(session)}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 xl:table-cell">{dtf.format(new Date(lastAct))}</td>
                        <td className="hidden px-3 py-2.5 text-sm text-slate-600 lg:table-cell">{session.createdBy || t.list.unknownUser}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {canContinue ? (
                              <button type="button" onClick={() => openContinue(session)} className="inline-flex h-9 items-center rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50">{t.list.continue}</button>
                            ) : (
                              <button type="button" onClick={() => openReview(session)} className="inline-flex h-9 items-center rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50">{t.list.viewResult}</button>
                            )}
                            {canContinue ? (
                              <button type="button" onClick={() => setConfirmCancelId(session.id)} className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">{t.list.cancel}</button>
                            ) : null}
                            {canDelete ? (
                              <button type="button" aria-label={t.list.delete} title={t.list.delete} onClick={() => setConfirmDeleteId(session.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination footer */}
            {filteredSessions.length > 0 && (
              <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">
                    {(safeListPage - 1) * listPageSize + 1}–{Math.min(safeListPage * listPageSize, filteredSessions.length)} / {filteredSessions.length}
                  </span>
                  <div className="flex items-center gap-3">
                    <PageSizeDropdown
                      value={listPageSize}
                      options={[10, 25, 50, 100]}
                      perPageLabel={locale === "th" ? "หน้าละ" : "per page"}
                      onChange={(v: number) => { setListPageSize(v); setListPage(1); }}
                    />
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setListPage(p => Math.max(1, p - 1))}
                        disabled={safeListPage <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: listTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === listTotalPages || Math.abs(p - safeListPage) <= 1)
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-1 text-slate-300">…</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setListPage(p)}
                              className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors ${
                                p === safeListPage
                                  ? "bg-violet-600 text-white shadow-sm"
                                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                              }`}
                            >
                              {p}
                            </button>
                          </span>
                        ))}
                      <button
                        type="button"
                        onClick={() => setListPage(p => Math.min(listTotalPages, p + 1))}
                        disabled={safeListPage >= listTotalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <ConfirmDialog
          cancelLabel={t.action.back}
          confirmLabel={t.action.cancel}
          danger
          icon={<Trash2 className="h-5 w-5 text-rose-600" />}
          isOpen={confirmCancelId !== null}
          onCancel={() => setConfirmCancelId(null)}
          onConfirm={() => {
            persist(sessions.map((session) => (session.id === confirmCancelId ? { ...session, status: "cancelled" } : session)));
            setConfirmCancelId(null);
          }}
          title={t.action.cancel}
        >
          <p className="text-sm text-slate-600">{t.cancelSessionConfirm}</p>
        </ConfirmDialog>
        <ConfirmDialog
          cancelLabel={t.action.back}
          confirmLabel={t.list.delete}
          danger
          icon={<Trash2 className="h-5 w-5 text-rose-600" />}
          isOpen={confirmDeleteId !== null}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            persist(sessions.filter((session) => session.id !== confirmDeleteId));
            setConfirmDeleteId(null);
          }}
          title={t.deleteSession}
        >
          <p className="text-sm text-slate-600">{t.deleteConfirm}</p>
        </ConfirmDialog>
      </div>
    );
  }

  const stepLabels = [t.wizard.setup, t.wizard.selectItems, t.wizard.counting, t.wizard.review];
  const estimate = candidates.length;
  const categoryName = fCategory ? (categoriesQuery.data ?? []).find((category) => category.id === fCategory)?.name ?? null : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-2 py-4">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={backToList} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{active ? active.name : t.create.title}</h2>
          <p className="text-sm text-slate-500">{t.wizard.stepOf.replace("{n}", String(step))}</p>
        </div>
      </div>

      <Stepper step={step} labels={stepLabels} />

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <Field label={t.create.name} required>
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder={t.create.namePlaceholder} className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t.create.countType} required>
                <select value={fCountType} onChange={(e) => setFCountType(e.target.value as CountType)} className={inputCls}>
                  {countTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label={t.create.category}>
                <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={inputCls}>
                  <option value="">{t.create.allCategories}</option>
                  {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t.create.warehouse}>
                <select value={fWarehouse} onChange={(e) => { setFWarehouse(e.target.value); setFLocation(""); }} className={inputCls}>
                  <option value="">{t.create.allWarehouses}</option>
                  {(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>)}
                </select>
              </Field>
              <Field label={t.create.location}>
                <select value={fLocation} onChange={(e) => setFLocation(e.target.value)} className={inputCls}>
                  <option value="">{t.create.selectLocation}</option>
                  {activeLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.warehouse_name ? `${l.warehouse_name} › ` : ""}{l.zone_name ? `${l.zone_name} › ` : ""}{l.name}{l.is_sale_point ? ` · ${t.create.salePoint}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">{t.create.locationHelp}</p>
              </Field>
            </div>

            <Field label={t.create.zone}>
              <input value={fZone} onChange={(e) => setFZone(e.target.value)} placeholder={t.create.zonePlaceholder} className={inputCls} />
            </Field>

            {fCountType === "cycle" ? (
              <Field label={t.create.cycleRule}>
                <input value={fCycleRule} onChange={(e) => setFCycleRule(e.target.value)} placeholder={t.create.cycleRulePlaceholder} className={inputCls} />
              </Field>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t.create.staff}>
                <input value={fStaff} onChange={(e) => setFStaff(e.target.value)} placeholder={t.create.staffPlaceholder} className={inputCls} />
              </Field>
              <Field label={t.create.blindCount}>
                <label className="flex h-11 items-center justify-between rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-700">
                  <span>
                    <span className="block font-semibold text-slate-800">{t.create.blindCount}</span>
                    <span className="block text-[11px] text-slate-400">{t.create.blindCountHelp}</span>
                  </span>
                  <input type="checkbox" checked={fBlindCount} onChange={(e) => setFBlindCount(e.target.checked)} className="h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-400" />
                </label>
              </Field>
            </div>

            <Field label={t.create.note}>
              <textarea rows={2} value={fNote} onChange={(e) => setFNote(e.target.value)} className={`${inputCls} resize-none py-2.5`} />
            </Field>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={backToList} className="h-11 flex-1 rounded-xl border border-violet-200 text-sm font-semibold text-slate-600 transition hover:bg-violet-50">{t.create.cancel}</button>
              <button type="button" disabled={!fName.trim() || !fLocation || productsQuery.isPending} onClick={goToSelect} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">
                {t.create.continueToItems}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">{t.preview.title}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <PreviewRow label={t.preview.type} value={countTypeLabel(fCountType)} />
              <PreviewRow label={t.preview.warehouse} value={fWarehouse || t.create.allWarehouses} />
              <PreviewRow label={t.preview.zone} value={fZone || t.create.allZones} />
              <PreviewRow label={t.preview.category} value={categoryName || t.create.allCategories} />
              <PreviewRow label={t.preview.mode} value={fWarehouse || fZone || fCategory ? t.preview.modePartial : t.preview.modeFull} />
              <PreviewRow label={t.preview.blindCount} value={fBlindCount ? t.preview.enabled : t.preview.disabled} />
              {fCountType === "cycle" && fCycleRule ? <PreviewRow label={t.preview.cycleRule} value={fCycleRule} /> : null}
            </dl>
            <div className="mt-4 rounded-xl border border-violet-100 bg-white p-4 text-center">
              <p className="text-3xl font-black text-violet-700 tabular-nums">{productsQuery.isPending ? "—" : estimate}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.preview.products} · {t.preview.estimateUnit}</p>
            </div>
          </aside>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
              <input value={selectSearch} onChange={(e) => setSelectSearch(e.target.value)} placeholder={t.select.searchPlaceholder} className="h-11 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>
            <select value={selectCategory} onChange={(e) => setSelectCategory(e.target.value)} className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 outline-none focus:border-violet-400">
              <option value="">{t.create.allCategories}</option>
              {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={selectStockFilter} onChange={(e) => setSelectStockFilter(e.target.value as StockFilter)} className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 outline-none focus:border-violet-400">
              <option value="all">{t.select.allStockStatuses}</option>
              <option value="ready">{t.select.statusReady}</option>
              <option value="low">{t.select.statusLow}</option>
              <option value="out">{t.select.statusOut}</option>
              <option value="unassigned">{t.select.statusUnassigned}</option>
            </select>
            <button type="button" onClick={() => setSelectedIds((prev) => {
              const next = new Set(prev);
              const allOn = filteredCandidates.every((product) => next.has(product.id));
              filteredCandidates.forEach((product) => (allOn ? next.delete(product.id) : next.add(product.id)));
              return next;
            })} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.select.selectAll}</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-50">{t.select.clear}</button>
          </div>

          <section className="rounded-2xl bg-white shadow-sm">
            <div className="overflow-auto rounded-2xl" style={{ maxHeight: "54vh" }}>
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "44px" }} />
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">
                      <input type="checkbox" aria-label={t.select.selectAll} checked={filteredCandidates.length > 0 && filteredCandidates.every((product) => selectedIds.has(product.id))} onChange={() => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        const allOn = filteredCandidates.every((product) => next.has(product.id));
                        filteredCandidates.forEach((product) => (allOn ? next.delete(product.id) : next.add(product.id)));
                        return next;
                      })} className="h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-400" />
                    </th>
                    <th className="px-3 py-3 font-bold">{t.col.product}</th>
                    <th className="px-3 py-3 font-bold">{t.col.barcode}</th>
                    <th className="px-3 py-3 text-right font-bold">{t.col.currentStock}</th>
                    <th className="px-3 py-3 font-bold">{t.col.location}</th>
                    <th className="px-3 py-3 font-bold">{t.col.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">{t.select.noProducts}</td></tr>
                  ) : filteredCandidates.map((product) => {
                    const checked = selectedIds.has(product.id);
                    const health = itemHealth(product.total_stock ?? 0, product.min_stock ?? 0);
                    const label = health === "out" ? t.select.statusOut : health === "low" ? t.select.statusLow : t.select.statusReady;
                    return (
                      <tr key={product.id} onClick={() => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(product.id)) next.delete(product.id); else next.add(product.id);
                        return next;
                      })} className={`cursor-pointer ${checked ? "bg-violet-50/60" : "bg-white hover:bg-slate-50"}`}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={checked} onChange={() => setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.id)) next.delete(product.id); else next.add(product.id);
                            return next;
                          })} className="h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-400" />
                        </td>
                        <td className="px-3 py-2.5"><p className="truncate text-sm font-semibold text-slate-800" title={product.name}>{product.name}</p><p className="truncate text-[11px] text-slate-400">{product.sku || "-"}</p></td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{product.barcode || "—"}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{product.total_stock ?? 0}</td>
                        <td className="px-3 py-2.5"><span className="flex items-center gap-1 truncate text-xs leading-normal text-slate-500"><MapPin className="h-3 w-3 shrink-0 text-slate-400" />{product.storage_location?.trim() || t.select.unassigned}</span></td>
                        <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_BADGE[health]}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-lg">
            <p className="text-sm text-slate-600"><span className="font-bold text-violet-700">{selectedIds.size}</span> {t.select.selectedItems}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStep(1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><ArrowLeft className="h-4 w-4" />{t.select.back}</button>
              <button type="button" disabled={selectedIds.size === 0} onClick={startCounting} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"><ScanLine className="h-4 w-4" />{t.select.startCounting}</button>
            </div>
          </div>
        </div>
      ) : null}

      {(step === 3 || step === 4) && active ? (() => {
        const done = active.status === "completed";
        const badge = statusBadge(active.status);
        const hideSystemDuringCount = active.blindCount && step === 3 && !done;

        if (step === 3) {
          const progressCards = hideSystemDuringCount
            ? [
              { label: t.summary.counted, value: summary.counted, tone: "text-violet-700" },
              { label: t.summary.skipped, value: summary.skipped, tone: "text-amber-700" },
              { label: t.summary.notCounted, value: summary.remaining, tone: "text-slate-500" },
            ]
            : [
              { label: t.summary.matched, value: summary.matched, tone: "text-emerald-600" },
              { label: t.summary.short, value: summary.short, tone: "text-rose-600" },
              { label: t.summary.over, value: summary.over, tone: "text-indigo-600" },
              { label: t.summary.skipped, value: summary.skipped, tone: "text-amber-700" },
              { label: t.summary.notCounted, value: summary.remaining, tone: "text-slate-500" },
            ];

          const filterTabs: { key: CountFilterTab; label: string; count: number }[] = [
            { key: "all", label: t.countFilter.all, count: filterCounts.all },
            { key: "notCounted", label: t.countFilter.notCounted, count: filterCounts.notCounted },
            { key: "counted", label: t.countFilter.counted, count: filterCounts.counted },
            { key: "variance", label: t.countFilter.variance, count: filterCounts.variance },
          ];

          return (
            <div className="space-y-4">
              {/* ── Session header card ───────────────────────────────── */}
              <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COUNT_TYPE_BADGE[active.countType]}`}>{countTypeLabel(active.countType)}</span>
                    {active.blindCount ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><EyeOff className="h-3.5 w-3.5" />{t.create.blindCount}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={exportSheet} className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><Download className="h-4 w-4" />{t.action.export}</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0 text-violet-400" />
                    <span className="truncate font-medium text-slate-700">{active.locationName || active.warehouseName || t.create.allWarehouses}{active.zone && !active.locationName ? ` · ${active.zone}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="h-4 w-4 shrink-0 text-violet-400" />
                    <span className="truncate">{active.staff || active.createdBy || t.list.unknownUser}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="h-4 w-4 shrink-0 text-violet-400" />
                    <span className="truncate">{dtf.format(new Date(active.createdAt))}</span>
                  </div>
                  {active.categoryName ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="h-4 w-4 shrink-0 text-violet-400" />
                      <span className="truncate">{active.categoryName}</span>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* ── Progress area ────────────────────────────────────── */}
              <section className="sticky top-3 z-30 rounded-2xl border border-violet-100 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.summary.progress}</p>
                    <div className="mt-1 flex flex-wrap items-end gap-2">
                      <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.counted} / {summary.total}</p>
                      <p className="pb-1 text-sm font-semibold text-violet-700">{summary.countedPercent}%</p>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${summary.progress}%` }} />
                    </div>
                  </div>
                  <div className={`grid gap-2 ${hideSystemDuringCount ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-5"}`}>
                    {progressCards.map((card) => (
                      <div key={card.label} className="min-w-[88px] rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className={`mt-0.5 text-lg font-black tabular-nums ${card.tone}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Mode toggle + filter tabs ────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setCountMode("table")} className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${countMode === "table" ? "bg-violet-600 text-white shadow" : "bg-white text-violet-700 hover:bg-violet-50"}`}>{t.countMode.table}</button>
                    <button type="button" onClick={() => setCountMode("quick")} className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${countMode === "quick" ? "bg-violet-600 text-white shadow" : "bg-white text-violet-700 hover:bg-violet-50"}`}>{t.countMode.quick}</button>
                  </div>
                </div>
                {countMode === "table" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {filterTabs.map((tab) => (
                      <button key={tab.key} type="button" onClick={() => setCountFilter(tab.key)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${countFilter === tab.key ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-violet-50"}`}>
                        {tab.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${countFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {countMode === "table" ? (
                <>
                  {/* ── Full-width quick scan bar ─────────────────────── */}
                  {!done ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-400" />
                        <input value={scan} autoFocus onChange={(e) => setScan(e.target.value)} onKeyDown={handleScan} placeholder={t.scanPlaceholder} aria-label={t.scanPlaceholder} className="h-14 w-full rounded-2xl border-2 border-violet-200 bg-white pl-12 pr-4 text-base font-semibold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                      </div>
                      <ScanButton
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-violet-200 bg-white text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
                        onScan={handleCameraScan}
                        title={t.scanWithCamera}
                      />
                    </div>
                  ) : null}

                  {/* ── Counting table ────────────────────────────────── */}
                  <section className="rounded-2xl bg-white shadow-sm">
                    <div className="overflow-auto rounded-2xl" style={{ maxHeight: "54vh" }}>
                      <table className="w-full min-w-[1320px] table-fixed border-collapse text-left">
                        <colgroup>
                          <col style={{ width: "280px", minWidth: "280px" }} />
                          <col style={{ width: "120px", minWidth: "120px" }} />
                          <col style={{ width: "160px", minWidth: "160px" }} />
                          <col style={{ width: "140px", minWidth: "140px" }} />
                          <col style={{ width: "100px", minWidth: "100px" }} />
                          <col style={{ width: "130px", minWidth: "130px" }} />
                          <col style={{ width: "100px", minWidth: "100px" }} />
                          <col style={{ width: "100px", minWidth: "100px" }} />
                          <col style={{ width: "160px", minWidth: "160px" }} />
                          <col style={{ width: "90px", minWidth: "90px" }} />
                        </colgroup>
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3 font-bold">{t.col.product}</th>
                            <th className="px-3 py-3 font-bold">{t.col.sku}</th>
                            <th className="px-3 py-3 font-bold">{t.col.barcode}</th>
                            <th className="px-3 py-3 font-bold">{t.col.location}</th>
                            <th className="px-3 py-3 text-right font-bold">{t.col.systemQty}</th>
                            <th className="px-3 py-3 font-bold">{t.col.countedQty}</th>
                            <th className="px-3 py-3 font-bold">{t.col.variance}</th>
                            <th className="px-3 py-3 font-bold">{t.col.status}</th>
                            <th className="px-3 py-3 font-bold">{t.col.note}</th>
                            <th className="px-3 py-3 text-right font-bold">{t.action.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCountItems.length === 0 ? (
                            <tr><td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">{t.empty}</td></tr>
                          ) : filteredCountItems.map((item) => {
                            const diff = variance(item);
                            const status = rowStatus(item);
                            const statusLabel = status === "match"
                              ? t.variance.match
                              : status === "short"
                                ? t.variance.short
                                : status === "over"
                                  ? t.variance.over
                                  : status === "skipped"
                                    ? t.variance.skipped
                                    : t.variance.notCounted;
                            const hiddenStatusLabel = item.skipped ? t.variance.skipped : item.counted == null ? t.variance.notCounted : t.summary.counted;
                            const rowBg = hideSystemDuringCount ? (item.skipped ? ROW_STATUS_BG.skipped : item.counted == null ? ROW_STATUS_BG.notCounted : ROW_STATUS_BG.match) : ROW_STATUS_BG[status];
                            return (
                              <tr key={item.productId} className={`${rowBg} transition-colors`}>
                                <td className="px-4 py-2.5">
                                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800" title={item.name}>{item.name}</p>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{item.sku || "—"}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{item.barcode || "—"}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{item.location || t.select.unassigned}</td>
                                <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{hideSystemDuringCount ? t.counting.hidden : item.systemQty}</td>
                                <td className="px-3 py-2.5">
                                  <input type="number" min={0} disabled={done || item.skipped} value={item.counted ?? ""} placeholder="—" aria-label={`${t.col.countedQty} · ${item.name}`} onChange={(e) => setCounted(item.productId, e.target.value === "" ? null : Math.max(0, Number.parseInt(e.target.value, 10) || 0))} className="h-11 w-28 rounded-lg border border-violet-200 px-2 text-center text-base font-bold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50" />
                                </td>
                                <td className={`px-3 py-2.5 text-sm font-bold tabular-nums ${diff < 0 ? "text-rose-600" : diff > 0 ? "text-indigo-600" : "text-slate-400"}`}>{hideSystemDuringCount ? t.counting.hidden : item.skipped || item.counted == null ? "—" : `${diff > 0 ? "+" : ""}${diff}`}</td>
                                <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${hideSystemDuringCount ? STATUS_BADGE[item.skipped ? "skipped" : item.counted == null ? "notCounted" : "match"] : STATUS_BADGE[status]}`}>{hideSystemDuringCount ? hiddenStatusLabel : statusLabel}</span></td>
                                <td className="px-3 py-2.5">
                                  <input value={item.note} disabled={done} aria-label={`${t.col.note} · ${item.name}`} onChange={(e) => setItemNote(item.productId, e.target.value)} className="h-11 w-full rounded-lg border border-violet-200 px-2.5 text-sm leading-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50" />
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {!done ? (
                                    <button type="button" onClick={() => toggleSkipped(item.productId)} className={`inline-flex h-10 items-center rounded-lg px-3 text-xs font-semibold transition ${item.skipped ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"}`}>{item.skipped ? t.action.resume : t.action.skip}</button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* ── Sticky bottom action bar ─────────────────────── */}
                  {!done ? (
                    <div className="sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="font-bold text-violet-700 tabular-nums">{summary.counted}/{summary.total}</span>
                        <span>{t.summary.counted}</span>
                        {summary.short > 0 ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{summary.short} {t.summary.short}</span> : null}
                        {summary.over > 0 ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{summary.over} {t.summary.over}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={saveDraft} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.action.saveDraft}</button>
                        <button type="button" onClick={gotoReview} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700"><ClipboardCheck className="h-4 w-4" />{t.action.review}</button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                /* ── Quick scan mode — left panel + right activity panel ─ */
                <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
                  <div className="space-y-4">
                    {/* Scanner inputs */}
                    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                      <p className="text-sm font-bold text-slate-900">{t.quickScan.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{t.quickScan.hint}</p>

                      <Field label={t.quickScan.barcodeLabel}>
                        <input ref={quickBarcodeRef} value={quickCode} onChange={(e) => setQuickCode(e.target.value)} onKeyDown={handleQuickBarcodeKeyDown} placeholder={t.quickScan.barcodePlaceholder} className={`${inputCls} h-14 text-base font-semibold`} />
                      </Field>

                      <Field label={t.quickScan.countedQtyLabel}>
                        <input ref={quickQtyRef} type="number" min={0} value={quickQty} onChange={(e) => setQuickQty(e.target.value)} onKeyDown={handleQuickQtyKeyDown} placeholder="0" className={`${inputCls} h-14 text-base font-bold`} />
                      </Field>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <button type="button" disabled={!quickFound || quickQty.trim() === ""} onClick={saveQuickCount} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">
                          <Check className="h-4 w-4" />
                          {t.quickScan.save}
                        </button>
                        <button type="button" disabled={!quickFound} onClick={skipQuickItem} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-40">{t.quickScan.skip}</button>
                        <button type="button" onClick={nextQuickItem} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.quickScan.next}</button>
                      </div>

                      {lastQuickSaved ? <p className="mt-3 text-xs font-semibold text-emerald-600">{t.quickScan.lastSaved.replace("{name}", lastQuickSaved)}</p> : null}
                      <p className="mt-3 text-xs text-slate-400">{t.quickScan.focusHint}</p>
                    </div>

                    {/* Product detail result */}
                    {quickFound ? (
                      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.quickScan.productFound}</p>
                        <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                          <p className="text-lg font-bold text-slate-900">{quickFound.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{quickFound.sku || "-"} · {quickFound.barcode || "—"}</p>
                          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{quickFound.location || t.select.unassigned}</p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-violet-100 bg-white p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.col.systemQty}</p>
                              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{active.blindCount ? t.counting.hidden : quickFound.systemQty}</p>
                            </div>
                            <div className="rounded-xl border border-violet-100 bg-white p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.col.countedQty}</p>
                              <p className="mt-1 text-2xl font-black text-violet-700 tabular-nums">{quickQty || "—"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Field label={t.col.note}>
                            <input value={quickFound.note} onChange={(e) => setItemNote(quickFound.productId, e.target.value)} placeholder={t.quickScan.notePlaceholder} className={inputCls} />
                          </Field>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {/* Ready state when no product scanned yet */}
                    {!quickFound ? (
                      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center text-sm text-slate-500">{t.quickScan.ready}</div>
                    ) : null}

                    {/* Recent scans activity log */}
                    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                      <p className="text-sm font-bold text-slate-900">{t.quickScan.recentActivity}</p>
                      {quickScanHistory.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-400">{t.quickScan.ready}</p>
                      ) : (
                        <div className="mt-3 max-h-[400px] space-y-1.5 overflow-auto">
                          {quickScanHistory.map((entry, idx) => (
                            <div key={`${entry.productId}-${idx}`} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${ROW_STATUS_BG[entry.status]}`}>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{entry.name}</p>
                                <p className="text-[11px] text-slate-400">{new Date(entry.time).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US")}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-violet-700 tabular-nums">{entry.qty}</span>
                                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[entry.status]}`}>{t.variance[entry.status]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live summary */}
                    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                      <p className="text-sm font-bold text-slate-900">{t.quickScan.liveSummary}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.summary.counted}</p>
                          <p className="mt-1 text-xl font-black text-violet-700 tabular-nums">{summary.counted}</p>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.summary.remaining}</p>
                          <p className="mt-1 text-xl font-black text-slate-600 tabular-nums">{summary.remaining}</p>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.summary.short}</p>
                          <p className="mt-1 text-xl font-black text-rose-600 tabular-nums">{summary.short}</p>
                        </div>
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.summary.over}</p>
                          <p className="mt-1 text-xl font-black text-indigo-600 tabular-nums">{summary.over}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sticky bottom action bar for quick scan */}
                    <div className="sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="font-bold text-violet-700 tabular-nums">{summary.countedPercent}%</span>
                        <span>{t.summary.progress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={saveDraft} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.action.saveDraft}</button>
                        <button type="button" onClick={gotoReview} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700"><ClipboardCheck className="h-4 w-4" />{t.action.review}</button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          );
        }

        const summaryCards = [
          { label: t.review.itemsIncreased, value: impactSummary.itemsIncreased, tone: "text-indigo-600" },
          { label: t.review.itemsDecreased, value: impactSummary.itemsDecreased, tone: "text-rose-600" },
          { label: t.review.qtyIncrease, value: `+${impactSummary.qtyIncrease}`, tone: "text-indigo-600" },
          { label: t.review.qtyDecrease, value: `-${impactSummary.qtyDecrease}`, tone: "text-rose-600" },
          { label: t.review.netChange, value: `${impactSummary.netChange > 0 ? "+" : ""}${impactSummary.netChange}`, tone: impactSummary.netChange < 0 ? "text-rose-600" : impactSummary.netChange > 0 ? "text-indigo-600" : "text-slate-700" },
          { label: t.review.valueIncrease, value: formatCurrency(impactSummary.valueIncrease), tone: "text-indigo-600" },
          { label: t.review.valueDecrease, value: formatCurrency(impactSummary.valueDecrease), tone: "text-rose-600" },
          { label: t.review.netImpact, value: formatCurrency(impactSummary.netValue), tone: impactSummary.netValue < 0 ? "text-rose-600" : impactSummary.netValue > 0 ? "text-indigo-600" : "text-slate-700" },
        ];

        const detailCards = [
          { label: t.review.sessionName, value: active.name },
          { label: t.review.sessionDate, value: dtf.format(new Date(active.createdAt)) },
          { label: t.review.creator, value: active.createdBy || t.list.unknownUser },
          { label: t.review.completedBy, value: active.completedBy || activeUser || t.list.unknownUser },
          { label: t.review.completedAt, value: active.completedAt ? dtf.format(new Date(active.completedAt)) : "—" },
          { label: t.review.warehouse, value: [active.warehouseName || t.list.allWarehouses, active.zone].filter(Boolean).join(" · ") || t.list.allWarehouses },
          { label: t.review.category, value: active.categoryName || t.list.allCategories },
          { label: t.review.sessionStatus, value: badge.label },
        ];

        const resultCards = [
          { label: t.summary.totalItems, value: summary.total, tone: "text-slate-900" },
          { label: t.summary.counted, value: summary.counted, tone: "text-violet-700" },
          { label: t.summary.matched, value: summary.matched, tone: "text-emerald-600" },
          { label: t.summary.short, value: summary.short, tone: "text-rose-600" },
          { label: t.summary.over, value: summary.over, tone: "text-indigo-600" },
        ];

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{done ? t.review.sessionDetailTitle : t.review.title}</p>
                <p className="text-xs text-slate-500">{done ? t.review.sessionDetailSubtitle : t.review.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={exportSheet} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><Download className="h-4 w-4" />{t.review.exportExcel}</button>
                <button type="button" onClick={exportPdf} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><FileText className="h-4 w-4" />{t.review.exportPdf}</button>
                {done ? (
                  <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">{t.review.printReport}</button>
                ) : null}
                {!done ? (
                  <>
                    <button type="button" onClick={backToCounting} className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"><ArrowLeft className="h-4 w-4" />{t.review.backToCounting}</button>
                    <button type="button" disabled={reviewBlocked || applyTargets.length === 0 || missingReasons > 0} onClick={() => setConfirmApply(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"><ClipboardCheck className="h-4 w-4" />{t.action.apply}</button>
                  </>
                ) : null}
              </div>
            </div>

            {done ? (
              <>
                <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">{t.review.sessionSummary}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {detailCards.map((card) => (
                      <div key={card.label} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{card.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">{t.review.results}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {resultCards.map((card) => (
                      <div key={card.label} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className={`mt-1 text-2xl font-black tabular-nums ${card.tone}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{t.review.inventoryImpact}</p>
                {!done ? (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-1">
                    <button type="button" onClick={() => setReviewDisplayMode("variance")} className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition ${reviewDisplayMode === "variance" ? "bg-violet-600 text-white" : "bg-white text-violet-700"}`}>{t.review.showVarianceOnly}</button>
                    <button type="button" onClick={() => setReviewDisplayMode("all")} className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition ${reviewDisplayMode === "all" ? "bg-violet-600 text-white" : "bg-white text-violet-700"}`}>{t.review.showAllItems}</button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <div key={card.label} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                    <p className={`mt-1 text-xl font-black tabular-nums ${card.tone}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              {impactSummary.missingCostItems > 0 ? <p className="mt-3 text-xs font-medium text-amber-700">{t.review.costUnavailable.replace("{n}", String(impactSummary.missingCostItems))}</p> : null}
            </section>

            {!done && (hasCriticalVariance || hasHighVariance) ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">{t.review.approvalWarning}</p>
              </div>
            ) : null}

            {!done && missingReasons > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{t.review.requiredReason.replace("{n}", String(missingReasons))}</div>
            ) : null}

            <section className="rounded-2xl bg-white shadow-sm">
              <div className="overflow-auto rounded-2xl" style={{ maxHeight: done ? "52vh" : "58vh" }}>
                <table className="w-full min-w-[1320px] table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                  </colgroup>
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-bold">{t.col.product}</th>
                      <th className="px-3 py-3 text-right font-bold">{t.col.systemQty}</th>
                      <th className="px-3 py-3 text-right font-bold">{t.col.countedQty}</th>
                      <th className="px-3 py-3 font-bold">{t.col.variance}</th>
                      <th className="px-3 py-3 font-bold">{t.review.severityLabel}</th>
                      <th className="px-3 py-3 font-bold">{t.col.status}</th>
                      <th className="px-3 py-3 font-bold">{t.review.reason}</th>
                      <th className="px-3 py-3 text-center font-bold">{done ? t.review.adjusted : t.review.applyCol}</th>
                      <th className="px-3 py-3 font-bold">{t.review.timestamp}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewItems.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">{t.review.noVariance}</td></tr>
                    ) : reviewItems.map((item) => {
                      const diff = variance(item);
                      const include = !excludeApply.has(item.productId);
                      const status = rowStatus(item);
                      const statusLabel = status === "match"
                        ? t.variance.match
                        : status === "short"
                          ? t.variance.short
                          : status === "over"
                            ? t.variance.over
                            : status === "skipped"
                              ? t.variance.skipped
                              : t.variance.notCounted;
                      const needsReason = hasVariance(item);
                      const severity = needsReason ? getVarianceSeverity(item) : null;
                      return (
                        <tr key={item.productId} className={`${ROW_STATUS_BG[status]} transition-colors`}>
                          <td className="px-4 py-2.5">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800" title={item.name}>{item.name}</p>
                            <p className="truncate text-[11px] text-slate-400">{item.sku || "-"}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{item.systemQty}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{item.counted ?? "—"}</td>
                          <td className={`px-3 py-2.5 text-sm font-bold tabular-nums ${diff < 0 ? "text-rose-600" : diff > 0 ? "text-indigo-600" : "text-slate-400"}`}>{item.counted == null || item.skipped ? "—" : `${diff > 0 ? "+" : ""}${diff}`}</td>
                          <td className="px-3 py-2.5">
                            {severity ? <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_BADGE[severity]}`}>{t.severity[severity]}</span> : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>{statusLabel}</span></td>
                          <td className="px-3 py-2.5">
                            {done ? (
                              <div>
                                <p className="text-sm font-medium text-slate-700">{reasonText(item) || "—"}</p>
                                {item.note ? <p className="mt-1 text-xs text-slate-400">{item.note}</p> : null}
                              </div>
                            ) : needsReason ? (
                              <div className="space-y-2">
                                <select value={item.varianceReason} onChange={(e) => setVarianceReason(item.productId, e.target.value as VarianceReason)} className="h-11 w-full rounded-lg border border-violet-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                                  <option value="">{t.review.reasonPlaceholder}</option>
                                  {REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{t.review.reasonOptions[reason]}</option>)}
                                </select>
                                {item.varianceReason === "other" ? <input value={item.varianceReasonOther} onChange={(e) => setVarianceReasonOther(item.productId, e.target.value)} placeholder={t.review.otherReasonPlaceholder} className="h-11 w-full rounded-lg border border-violet-200 px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /> : null}
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-slate-500">{t.review.reasonNotRequired}</p>
                                {item.note ? <p className="mt-1 text-xs text-slate-400">{item.note}</p> : null}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {done ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.adjusted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.adjusted ? t.review.adjustedYes : t.review.adjustedNo}</span> : needsReason ? <input type="checkbox" checked={include} aria-label={`${t.review.applyCol} · ${item.name}`} onChange={() => setExcludeApply((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.productId)) next.delete(item.productId); else next.add(item.productId);
                              return next;
                            })} className="h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-400" /> : <span className="text-xs font-semibold text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{done ? (item.adjustedAt ? dtf.format(new Date(item.adjustedAt)) : "—") : (item.countedAt ? dtf.format(new Date(item.countedAt)) : "—")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {done ? (
              <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">{t.review.auditTrail}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{active.auditTrail.length}</span>
                </div>
                <div className="mt-4 overflow-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3 font-bold">{t.col.product}</th>
                        <th className="px-3 py-3 text-right font-bold">{t.col.systemQty}</th>
                        <th className="px-3 py-3 text-right font-bold">{t.col.countedQty}</th>
                        <th className="px-3 py-3 font-bold">{t.col.variance}</th>
                        <th className="px-3 py-3 font-bold">{t.review.reason}</th>
                        <th className="px-3 py-3 font-bold">{t.review.user}</th>
                        <th className="px-3 py-3 font-bold">{t.review.timestamp}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {active.auditTrail.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">{t.review.noAuditTrail}</td></tr>
                      ) : active.auditTrail.map((entry, index) => (
                        <tr key={entry.id} className={index % 2 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{entry.productName}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{entry.systemQty}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-700 tabular-nums">{entry.countedQty}</td>
                          <td className={`px-3 py-2.5 text-sm font-bold tabular-nums ${entry.difference < 0 ? "text-rose-600" : "text-indigo-600"}`}>{entry.difference > 0 ? "+" : ""}{entry.difference}</td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">{entry.reason || "—"}</td>
                          <td className="px-3 py-2.5 text-sm text-slate-600">{entry.user || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{entry.timestamp ? dtf.format(new Date(entry.timestamp)) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        );
      })() : null}

      <ConfirmDialog cancelLabel={t.action.cancel} confirmLabel={isPending ? t.action.applying : t.review.confirmApply} icon={<ClipboardCheck className="h-5 w-5 text-violet-600" />} isOpen={confirmApply} onCancel={() => setConfirmApply(false)} onConfirm={applyCorrection} title={t.action.apply}>
        <div className="space-y-3 text-sm text-slate-600">
          <p>{missingReasons > 0 ? t.review.requiredReason.replace("{n}", String(missingReasons)) : t.review.willUpdate.replace("{n}", String(applyImpactSummary.itemsToUpdate))}</p>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.review.itemsToUpdate}</p><p className="mt-1 text-lg font-black text-slate-900">{applyImpactSummary.itemsToUpdate}</p></div>
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.review.netChange}</p><p className="mt-1 text-lg font-black text-slate-900">{applyImpactSummary.netChange > 0 ? "+" : ""}{applyImpactSummary.netChange}</p></div>
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.review.qtyIncrease}</p><p className="mt-1 text-lg font-black text-indigo-600">+{applyImpactSummary.qtyIncrease}</p></div>
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.review.qtyDecrease}</p><p className="mt-1 text-lg font-black text-rose-600">-{applyImpactSummary.qtyDecrease}</p></div>
          </div>
          <p>{t.review.confirmationHelp}</p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required ? <span className="text-rose-500"> *</span> : null}</label>
      {children}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-slate-800" title={value}>{value}</dd>
    </div>
  );
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-5 flex items-center">
      {labels.map((label, index) => {
        const n = index + 1;
        const state = n < step ? "done" : n === step ? "active" : "todo";
        return (
          <div key={label} className={`flex items-center ${n < labels.length ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${state === "done"
                ? "bg-violet-600 text-white"
                : state === "active"
                  ? "bg-violet-600 text-white ring-4 ring-violet-100"
                  : "bg-slate-100 text-slate-400"}`}>
                {state === "done" ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={`hidden text-sm font-semibold sm:block ${state === "todo" ? "text-slate-400" : "text-slate-800"}`}>{label}</span>
            </div>
            {n < labels.length ? <div className={`mx-2 h-0.5 flex-1 rounded ${n < step ? "bg-violet-400" : "bg-slate-200"}`} /> : null}
          </div>
        );
      })}
    </div>
  );
}
