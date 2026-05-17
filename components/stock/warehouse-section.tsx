"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  ChevronDown,
  Download,
  Package,
  Upload,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings2,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";

import {
  addWarehouseProduct,
  createStandaloneWarehouseProduct,
  createWarehouse,
  deleteWarehouse,
  listWarehouseProducts,
  listWarehouses,
  removeWarehouseProduct,
  updateWarehouse,
  updateWarehouseProductQuantity,
} from "@/services/warehouses";
import { listProducts, listProductTypes, listProductUnits } from "@/services/products";
import type {
  AddWarehouseProductInput,
  CreateStandaloneWarehouseProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseProduct,
} from "@/types/warehouse";
import type { Product, ProductType, ProductUnit } from "@/types/product";

type WarehouseSectionDictionary = {
  title: string;
  helper: string;
  empty: string;
  nameLabel: string;
  codeLabel: string;
  addressLabel: string;
  phoneLabel: string;
  contactNameLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  createButton: string;
  editLabel: string;
  deleteLabel: string;
  createTitle: string;
  editTitle: string;
  saveButton: string;
  cancel: string;
  nameRequired: string;
  deleteConfirm: string;
  deleteConfirmTitle: string;
  productsLabel: string;
  addProductLabel: string;
  searchProductLabel: string;
  noProductsLabel: string;
  addLabel: string;
  noProductsInWarehouseLabel: string;
  addStandaloneLabel: string;
  fromStockLabel: string;
  newProductLabel: string;
  standaloneNameLabel: string;
  standaloneSkuLabel: string;
  standaloneBarcodeLabel: string;
  standalonePriceLabel: string;
  standaloneUnitLabel: string;
  standaloneTypeLabel: string;
  standaloneNameRequired: string;
  totalStockLabel: string;
  totalValueLabel: string;
  manageLabel: string;
  exportLabel: string;
  perPageLabel: string;
  prevLabel: string;
  nextLabel: string;
  showingLabel: string;
  fromLabel: string;
  itemsLabel: string;
  barcodeTitle: string;
  printLabel: string;
  closeLabel: string;
  invalidBarcodeLabel: string;
  noBarcodeLabel: string;
  barcodeTooltip: string;
  tableImageCol: string;
  tableDetailsCol: string;
  tableBarcodeCol: string;
  tableCategoryCol: string;
  tablePriceCol: string;
  tableStockCol: string;
  tableActionsCol: string;
  qtyLabel: string;
  saveLabel: string;
  outOfStockLabel: string;
  lowStockLabel: string;
  editQtyTitle: string;
};

type WarehouseSectionProps = {
  dictionary: WarehouseSectionDictionary;
};

type WarehouseFormState = {
  name: string;
  code: string;
  address: string;
  phone: string;
  contact_name: string;
  is_active: boolean;
};

type StandaloneFormState = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  unit_name: string;
  type_name: string;
  quantity: string;
};

const initialFormState: WarehouseFormState = {
  name: "",
  code: "",
  address: "",
  phone: "",
  contact_name: "",
  is_active: true,
};

const initialStandaloneForm: StandaloneFormState = {
  name: "",
  sku: "",
  barcode: "",
  price: "",
  unit_name: "",
  type_name: "",
  quantity: "1",
};

// Combobox: text input with filtered dropdown
function ComboBoxSelect<T>({
  options,
  value,
  onChange,
  placeholder,
  getLabel,
  getKey,
  noResultsLabel = "ไม่พบรายการ",
}: {
  options: T[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
  noResultsLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, search, getLabel]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        value={search}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {open && options.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">{noResultsLabel}</div>
          ) : (
            filtered.map((item) => (
              <button
                key={getKey(item)}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                  getLabel(item) === value ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700"
                }`}
                onClick={() => {
                  onChange(getLabel(item));
                  setSearch(getLabel(item));
                  setOpen(false);
                }}
                type="button"
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WarehouseSection({ dictionary }: WarehouseSectionProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarehouseFormState>(initialFormState);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selected warehouse
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  // Add product panel
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addMode, setAddMode] = useState<"stock" | "standalone">("stock");
  const [productSearch, setProductSearch] = useState("");
  const [addingProductIds, setAddingProductIds] = useState<Set<string>>(new Set());
  const [addProductQuantity, setAddProductQuantity] = useState(1);
  const [addError, setAddError] = useState("");

  // Standalone form
  const [standaloneForm, setStandaloneForm] = useState<StandaloneFormState>(initialStandaloneForm);
  const [isStandaloneSaving, setIsStandaloneSaving] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline edit quantity
  const [editingQty, setEditingQty] = useState<{[key: string]: boolean}>({});
  const [editingQtyValues, setEditingQtyValues] = useState<{[key: string]: string}>({});

  const startQtyEdit = useCallback((wp: WarehouseProduct) => {
    setEditingQty((prev) => ({ ...prev, [wp.product_id]: true }));
    setEditingQtyValues((prev) => ({ ...prev, [wp.product_id]: String(wp.quantity) }));
  }, []);

  const cancelQtyEdit = useCallback((productId: string) => {
    setEditingQty((prev) => ({ ...prev, [productId]: false }));
    setEditingQtyValues((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const confirmQtyEdit = useCallback(
    async (productId: string) => {
      if (!selectedWarehouseId) return;
      const value = editingQtyValues[productId];
      const quantity = parseInt(value ?? "", 10);
      if (isNaN(quantity) || quantity < 0) return;

      try {
        await updateWarehouseProductQuantity(selectedWarehouseId, productId, quantity);
        await queryClient.invalidateQueries({ queryKey: ["warehouse-products", selectedWarehouseId] });
        cancelQtyEdit(productId);
      } catch {
        // Error handled silently
      }
    },
    [selectedWarehouseId, editingQtyValues, queryClient, cancelQtyEdit],
  );

  // Barcode preview
  const [previewSku, setPreviewSku] = useState<string | null>(null);

  function generateBarcodeSvg(sku: string): string {
    const normalized = sku.trim().toUpperCase();
    const code128Patterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312",
      "132212","221213","221312","231212","112232","122132","122231","113222",
      "123122","123221","223211","221132","221231","213212","223112","312131",
      "311222","321122","321221","312212","322112","322211","212123","212321",
      "232121","111323","131123","131321","112313","132113","132311","211313",
      "231113","231311","112133","112331","132131","113123","113321","133121",
      "313121","211331","231131","213113","213311","213131","311123","311321",
      "331121","312113","312311","332111","314111","221411","431111","111224",
      "111422","121124","121421","141122","141221","112214","112412","122114",
      "122411","142112","142211","241211","221114","413111","241112","134111",
      "111242","121142","121241","114212","124112","124211","411212","421112",
      "421211","212141","214121","412121","111143","111341","131141","114113",
      "114311","411113","411311","113141","114131","311141","411131","211412",
      "211214","211232","2331112",
    ];

    const encodedValues = encodeCode128B(normalized);
    if (!encodedValues) return "";

    const moduleWidth = 2;
    const quietZone = 20;
    const barTop = 16;
    const barHeight = 92;
    let x = quietZone;
    let bars = "";

    for (const encodedValue of encodedValues) {
      const pattern = code128Patterns[encodedValue];
      if (!pattern) return "";

      let isBar = true;
      for (const unitChar of pattern) {
        const unit = Number(unitChar);
        const width = unit * moduleWidth;
        if (isBar) {
          bars += `<rect x="${x}" y="${barTop}" width="${width}" height="${barHeight}" fill="#0f172a" />`;
        }
        x += width;
        isBar = !isBar;
      }
    }

    const totalWidth = x + quietZone;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="146" viewBox="0 0 ${totalWidth} 146" role="img" aria-label="barcode">
        <rect width="${totalWidth}" height="146" fill="white"/>
        ${bars}
        <text x="${totalWidth / 2}" y="132" text-anchor="middle" font-family="monospace" font-size="14" fill="#0f172a">${normalized}</text>
      </svg>
    `.trim();
  }

  const previewBarcodeSvg = useMemo(() => {
    if (!previewSku) return "";
    return generateBarcodeSvg(previewSku);
  }, [previewSku]);

  function encodeCode128B(text: string): number[] | null {
    const code128B = {
      " ": 0, "!": 1, "\"": 2, "#": 3, "$": 4, "%": 5, "&": 6, "'": 7, "(": 8, ")": 9,
      "*": 10, "+": 11, ",": 12, "-": 13, ".": 14, "/": 15, "0": 16, "1": 17, "2": 18, "3": 19,
      "4": 20, "5": 21, "6": 22, "7": 23, "8": 24, "9": 25, ":": 26, ";": 27, "<": 28, "=": 29,
      ">": 30, "?": 31, "@": 32, "A": 33, "B": 34, "C": 35, "D": 36, "E": 37, "F": 38, "G": 39,
      "H": 40, "I": 41, "J": 42, "K": 43, "L": 44, "M": 45, "N": 46, "O": 47, "P": 48, "Q": 49,
      "R": 50, "S": 51, "T": 52, "U": 53, "V": 54, "W": 55, "X": 56, "Y": 57, "Z": 58, "[": 59,
      "\\": 60, "]": 61, "^": 62, "_": 63, "`": 64, "a": 65, "b": 66, "c": 67, "d": 68, "e": 69,
      "f": 70, "g": 71, "h": 72, "i": 73, "j": 74, "k": 75, "l": 76, "m": 77, "n": 78, "o": 79,
      "p": 80, "q": 81, "r": 82, "s": 83, "t": 84, "u": 85, "v": 86, "w": 87, "x": 88, "y": 89,
      "z": 90, "{": 91, "|": 92, "}": 93, "~": 94, "DEL": 95, "FNC3": 96, "FNC2": 97, "SHIFT": 98, "CODE_C": 99,
      "CODE_B": 100, "FNC4": 101, "FNC1": 102, "START_A": 103, "START_B": 104, "START_C": 105, "STOP": 106,
    } as Record<string, number>;

    const values: number[] = [];
    for (const char of text) {
      const code = code128B[char];
      if (code === undefined) return null;
      values.push(code);
    }
    if (values.length === 0) return null;

    const startCode = 104; // Code B
    let checksum = startCode;
    for (let i = 0; i < values.length; i++) {
      checksum += values[i] * (i + 1);
    }
    checksum = checksum % 103;
    values.unshift(startCode);
    values.push(checksum);
    values.push(106); // Stop

    return values;
  }

  function printBarcode(svgContent: string, sku: string | null) {
    if (!svgContent || !sku) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const printWindow = window.open(
      "",
      "barcode-print",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print Barcode</title>
  <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .barcode-grid { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px; }
  .barcode-item { text-align: center; }
  .barcode-label { font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 4px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barcode-item img { display: block; max-width: none; height: auto; }
  .barcode-fallback { font-family: monospace; font-size: 13px; color: #64748b; padding: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="barcode-grid">
    <div class="barcode-item">
      <div class="barcode-label">${sku}</div>
      <img src="data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}" alt="barcode" />
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  // Manage warehouses modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });

  const warehouses = warehousesData?.data ?? [];

  // Auto-select first warehouse
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // Fetch products in selected warehouse
  const { data: warehouseProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ["warehouse-products", selectedWarehouseId],
    queryFn: () => listWarehouseProducts(selectedWarehouseId),
    enabled: !!selectedWarehouseId,
  });

  // Fetch all store products for adding
  const { data: allProductsData } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => listProducts({ limit: 200 }),
    enabled: showAddProduct && addMode === "stock",
  });

  const { data: productTypesData } = useQuery({
    queryKey: ["product-types"],
    queryFn: () => listProductTypes(),
    enabled: showAddProduct && addMode === "standalone",
  });

  const { data: productUnitsData } = useQuery({
    queryKey: ["product-units"],
    queryFn: () => listProductUnits(),
    enabled: showAddProduct && addMode === "standalone",
  });

  const productTypes: ProductType[] = productTypesData?.data ?? [];
  const productUnits: ProductUnit[] = productUnitsData?.data ?? [];

  // Warehouse pagination state (client-side)
  const [whPage, setWhPage] = useState(1);
  const [whPageSize, setWhPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("warehouse-page-size");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([5, 10, 15, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 5;
  });

  const warehouseProducts = warehouseProductsData?.data ?? [];
  const whTotal = warehouseProducts.length;
  const whTotalPages = Math.max(Math.ceil(whTotal / whPageSize), 1);
  const whStart = (whPage - 1) * whPageSize;
  const whEnd = whStart + whPageSize;
  const whPageProducts = warehouseProducts.slice(whStart, whEnd);
  const allProducts: Product[] = allProductsData?.data
    ? Array.isArray(allProductsData.data)
      ? allProductsData.data
      : (allProductsData.data as any)?.items ?? []
    : [];

  const productIdsInWarehouse = new Set(warehouseProducts.map((wp) => wp.product_id));
  const excludeIds = useMemo(
    () => new Set([...productIdsInWarehouse, ...addingProductIds]),
    [productIdsInWarehouse, addingProductIds],
  );
  const availableProducts = allProducts.filter((p) => !excludeIds.has(p.id));
  const filteredAvailable = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())),
  );

  const totalUnits = warehouseProducts.reduce((sum, wp) => sum + wp.quantity, 0);
  const totalValue = warehouseProducts.reduce((sum, wp) => sum + ((wp.product_price || wp.standalone_price || 0) * wp.quantity), 0);

  const isFormValid = form.name.trim().length > 0;

  // Reset add product panel
  const resetAddPanel = useCallback(() => {
    setShowAddProduct(false);
    setAddMode("stock");
    setProductSearch("");
    setAddingProductIds(new Set());
    setAddError("");
    setStandaloneForm(initialStandaloneForm);
    setIsStandaloneSaving(false);
  }, []);

  // Warehouse CRUD
  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setEditingId(null);
    setError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback(
    (warehouse: Warehouse) => {
      setForm({
        name: warehouse.name,
        code: warehouse.code ?? "",
        address: warehouse.address ?? "",
        phone: warehouse.phone ?? "",
        contact_name: warehouse.contact_name ?? "",
        is_active: warehouse.is_active,
      });
      setEditingId(warehouse.id);
      setError("");
      setIsModalOpen(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!isFormValid) {
      setError(dictionary.nameRequired);
      return;
    }

    startTransition(async () => {
      try {
        setError("");

        if (editingId) {
          const input: UpdateWarehouseInput = {
            name: form.name,
            code: form.code || undefined,
            address: form.address || undefined,
            phone: form.phone || undefined,
            contact_name: form.contact_name || undefined,
            is_active: form.is_active,
          };
          await updateWarehouse(editingId, input);
        } else {
          const input: CreateWarehouseInput = {
            name: form.name,
            code: form.code || undefined,
            address: form.address || undefined,
            phone: form.phone || undefined,
            contact_name: form.contact_name || undefined,
            is_active: form.is_active,
          };
          await createWarehouse(input);
        }

        await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
        setIsModalOpen(false);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : dictionary.nameRequired);
      }
    });
  }, [isFormValid, editingId, form, queryClient, resetForm, dictionary]);

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        try {
          await deleteWarehouse(id);
          await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
          if (selectedWarehouseId === id) {
            setSelectedWarehouseId("");
          }
          setDeleteConfirmId(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : dictionary.nameRequired);
        }
      });
    },
    [queryClient, dictionary.nameRequired, selectedWarehouseId],
  );

  const isStandaloneFormValid = standaloneForm.name.trim().length > 0;

  const handleStandaloneSave = useCallback(async () => {
    if (!selectedWarehouse || !isStandaloneFormValid) {
      setAddError(dictionary.standaloneNameRequired);
      return;
    }

    setIsStandaloneSaving(true);
    setAddError("");

    try {
      const input: CreateStandaloneWarehouseProductInput = {
        name: standaloneForm.name.trim(),
        sku: standaloneForm.sku.trim() || undefined,
        barcode: standaloneForm.barcode.trim() || undefined,
        price: standaloneForm.price ? parseFloat(standaloneForm.price) || 0 : 0,
        unit_name: standaloneForm.unit_name.trim() || undefined,
        type_name: standaloneForm.type_name.trim() || undefined,
        quantity: Math.max(0, parseInt(standaloneForm.quantity || "1", 10) || 0),
      };
      await createStandaloneWarehouseProduct(selectedWarehouse.id, input);
      await queryClient.invalidateQueries({
        queryKey: ["warehouse-products", selectedWarehouse.id],
      });
      setStandaloneForm(initialStandaloneForm);
    } catch (err: any) {
      setAddError(err?.message || "Failed to add product");
    } finally {
      setIsStandaloneSaving(false);
    }
  }, [selectedWarehouse, standaloneForm, isStandaloneFormValid, queryClient, dictionary.standaloneNameRequired]);

  const handleAddProduct = useCallback(
    async (productId: string) => {
      if (!selectedWarehouse || addingProductIds.has(productId)) return;

      setAddError("");
      setAddingProductIds((prev) => new Set(prev).add(productId));

      try {
        const input: AddWarehouseProductInput = { product_id: productId, quantity: addProductQuantity };
        await addWarehouseProduct(selectedWarehouse.id, input);
        await queryClient.invalidateQueries({
          queryKey: ["warehouse-products", selectedWarehouse.id],
        });
      } catch (err: any) {
        setAddError(err?.message || "Failed to add product");
        setAddingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [selectedWarehouse, addingProductIds, addProductQuantity, queryClient],
  );

  const handleRemoveProduct = useCallback(
    async (productId: string) => {
      if (!selectedWarehouseId) return;
      try {
        await removeWarehouseProduct(selectedWarehouseId, productId);
        // Optimistically remove from cache immediately
        queryClient.setQueryData<{ data: WarehouseProduct[] }>(
          ["warehouse-products", selectedWarehouseId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.filter((wp) => wp.product_id !== productId),
            };
          },
        );
        await queryClient.refetchQueries({
          queryKey: ["warehouse-products", selectedWarehouseId],
        });
      } catch {
        // Error handled silently - refetch to reconcile
        await queryClient.refetchQueries({
          queryKey: ["warehouse-products", selectedWarehouseId],
        });
      }
    },
    [selectedWarehouseId, queryClient],
  );

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border-b-2 border-blue-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.productsLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">
            {warehouseProducts.length}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-amber-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.totalStockLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {totalUnits.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border-b-2 border-emerald-200 bg-white p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dictionary.totalValueLabel}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">
            ฿{totalValue.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Warehouse Selector + Actions */}
      <section className="rounded-xl bg-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WarehouseIcon className="h-5 w-5 text-slate-500" />
            {warehousesLoading ? (
              <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
            ) : (
              <div className="relative">
                <select
                  className="min-w-[220px] appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => {
                    setSelectedWarehouseId(e.target.value);
                    setWhPage(1);
                    resetAddPanel();
                  }}
                  value={selectedWarehouseId}
                >
                  {warehouses.length === 0 && (
                    <option value="">{dictionary.empty}</option>
                  )}
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.code ? ` (${w.code})` : ""}{!w.is_active ? ` — ${dictionary.inactiveLabel}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={!selectedWarehouse}
              onClick={() => {
                setShowAddProduct(true);
                setProductSearch("");
              }}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {dictionary.addProductLabel}
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setIsManageModalOpen(true)}
              type="button"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {dictionary.manageLabel}
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={selectedIds.size === 0}
              onClick={() => {
                const selectedProducts = warehouseProducts.filter((wp) => selectedIds.has(wp.product_id));
                if (selectedProducts.length === 0) return;
                const rows = selectedProducts.map((wp) => [
                  wp.product_name || wp.standalone_name || '',
                  wp.product_sku || wp.standalone_sku || '',
                  wp.product_barcode || wp.standalone_barcode || '',
                  wp.product_type_name || wp.standalone_type_name || '',
                  (wp.product_price || wp.standalone_price || 0).toString(),
                  String(wp.quantity),
                ]);
                const header = [['ชื่อ', 'SKU', 'บาร์โค้ด', 'หมวดหมู่', 'ราคา', 'จำนวน']];
                const csv = [...header, ...rows]
                  .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
                  .join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'warehouse-products.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              {dictionary.exportLabel}
            </button>
          </div>
        </div>

        {/* Add Product Panel */}
        {showAddProduct && selectedWarehouse && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            {/* Mode Tabs */}
            <div className="mb-4 flex gap-2">
              <button
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  addMode === "stock"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setAddMode("stock")}
                type="button"
              >
                {dictionary.fromStockLabel}
              </button>
              <button
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  addMode === "standalone"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setAddMode("standalone")}
                type="button"
              >
                {dictionary.newProductLabel}
              </button>
            </div>

            {addMode === "stock" ? (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={dictionary.searchProductLabel}
                    value={productSearch}
                  />
                </div>
                <div className="mb-3 flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-600">{dictionary.qtyLabel}:</label>
                  <input
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-center outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    min={0}
                    onChange={(e) => setAddProductQuantity(Math.max(0, Number(e.target.value) || 0))}
                    type="number"
                    value={addProductQuantity}
                  />
                  <button
                    className="ml-auto rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-slate-600"
                    onClick={resetAddPanel}
                    type="button"
                  >
                    {dictionary.cancel}
                  </button>
                </div>
                {addError && (
                  <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    {addError}
                  </div>
                )}
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {filteredAvailable.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">
                      {dictionary.noProductsLabel}
                    </p>
                  ) : (
                    filteredAvailable.map((product) => (
                      <button
                        key={product.id}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:bg-blue-50"
                        onClick={() => handleAddProduct(product.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {product.image_url ? (
                              <img
                                alt={product.name}
                                className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                                src={product.image_url}
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                                {product.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="block truncate font-medium text-slate-700">
                              {product.name}
                            </span>
                            {product.sku && (
                              <span className="block truncate text-xs text-slate-400">
                                {product.sku}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-blue-600">
                          {addingProductIds.has(product.id) ? (
                            <svg aria-hidden="true" className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                            </svg>
                          ) : (
                            dictionary.addLabel
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Standalone product form */
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Name (required) */}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneNameLabel}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-700">required</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={dictionary.standaloneNameLabel}
                      value={standaloneForm.name}
                    />
                  </label>

                  {/* SKU */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneSkuLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, sku: e.target.value }))}
                      placeholder={dictionary.standaloneSkuLabel}
                      value={standaloneForm.sku}
                    />
                  </label>

                  {/* Barcode */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneBarcodeLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, barcode: e.target.value }))}
                      placeholder={dictionary.standaloneBarcodeLabel}
                      value={standaloneForm.barcode}
                    />
                  </label>

                  {/* Price */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standalonePriceLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      min={0}
                      step="0.01"
                      value={standaloneForm.price}
                    />
                  </label>

                  {/* Unit */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneUnitLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <ComboBoxSelect
                      getKey={(u: ProductUnit) => u.id}
                      getLabel={(u: ProductUnit) => u.name}
                      onChange={(v) => setStandaloneForm((prev) => ({ ...prev, unit_name: v }))}
                      options={productUnits}
                      placeholder={dictionary.standaloneUnitLabel}
                      value={standaloneForm.unit_name}
                    />
                  </label>

                  {/* Category/Type */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.standaloneTypeLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <ComboBoxSelect
                      getKey={(t: ProductType) => t.id}
                      getLabel={(t: ProductType) => t.name}
                      onChange={(v) => setStandaloneForm((prev) => ({ ...prev, type_name: v }))}
                      options={productTypes}
                      placeholder={dictionary.standaloneTypeLabel}
                      value={standaloneForm.type_name}
                    />
                  </label>

                  {/* Quantity */}
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span>{dictionary.qtyLabel}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">optional</span>
                    </span>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setStandaloneForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      min={0}
                      type="number"
                      value={standaloneForm.quantity}
                    />
                  </label>
                </div>

                {addError && (
                  <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    {addError}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-slate-600"
                    onClick={resetAddPanel}
                    type="button"
                  >
                    {dictionary.cancel}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800 disabled:bg-blue-400"
                    disabled={!isStandaloneFormValid || isStandaloneSaving}
                    onClick={handleStandaloneSave}
                    type="button"
                  >
                    {isStandaloneSaving ? (
                      <>
                        <svg aria-hidden="true" className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                        </svg>
                        <span>{dictionary.saveButton}</span>
                      </>
                    ) : (
                      dictionary.addStandaloneLabel
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Products Table */}
      {!selectedWarehouse ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16">
          <WarehouseIcon className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{dictionary.empty}</p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800"
            onClick={openCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.createButton}
          </button>
        </div>
      ) : productsLoading ? (
        <div className="rounded-2xl bg-white p-12 text-center">
          <span className="inline-flex items-center gap-3 text-sm text-slate-500">
            <svg aria-hidden="true" className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            <span className="animate-pulse">{dictionary.helper}...</span>
          </span>
        </div>
      ) : whTotal === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16">
          <Boxes className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{dictionary.noProductsInWarehouseLabel}</p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-800"
            onClick={() => {
              setShowAddProduct(true);
              setProductSearch("");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {dictionary.addProductLabel}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
                <th className="w-[5%] px-4 py-4 text-center font-bold">
                  <input
                    aria-label="Select all"
                    checked={whPageProducts.length > 0 && selectedIds.size === warehouseProducts.length}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                    onChange={() => {
                      if (selectedIds.size === warehouseProducts.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(whPageProducts.map((wp) => wp.product_id)));
                      }
                    }}
                    type="checkbox"
                  />
                </th>
                <th className="w-[10%] px-6 py-4 text-center font-bold">{dictionary.tableImageCol}</th>
                <th className="w-[25%] px-6 py-4 font-bold">{dictionary.tableDetailsCol}</th>
                <th className="w-[13%] px-6 py-4 font-bold">{dictionary.tableBarcodeCol}</th>
                <th className="w-[14%] px-6 py-4 font-bold">{dictionary.tableCategoryCol}</th>
                <th className="w-[10%] px-6 py-4 font-bold">{dictionary.tablePriceCol}</th>
                <th className="w-[8%] px-2 py-4 font-bold">{dictionary.tableStockCol}</th>
                <th className="w-[15%] px-6 py-4 text-right font-bold">{dictionary.tableActionsCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {whPageProducts.map((wp, index) => (
                <tr
                  key={wp.id}
                  className={`${index % 2 === 1 ? "bg-slate-50/50" : "bg-white"} group transition hover:bg-slate-50`}
                >
                  <td className="px-4 py-4 text-center">
                    <input
                      aria-label={`Select ${wp.product_name}`}
                      checked={selectedIds.has(wp.product_id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(wp.product_id)) {
                          next.delete(wp.product_id);
                        } else {
                          next.add(wp.product_id);
                        }
                        setSelectedIds(next);
                      }}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {wp.image_url ? (
                      <img
                        alt={wp.product_name}
                        className="mx-auto h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-inner"
                        loading="lazy"
                        src={wp.image_url}
                      />
                    ) : (
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shadow-inner">
                        {(wp.product_name || wp.standalone_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex min-w-0 flex-col">
                      <span
                        className="overflow-hidden break-all text-sm font-bold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                        title={wp.product_name || wp.standalone_name}
                      >
                        {wp.product_name || wp.standalone_name || "-"}
                      </span>
                      {(wp.product_sku || wp.standalone_sku) ? (
                        <span className="mt-0.5 truncate text-xs text-slate-400" title={wp.product_sku || wp.standalone_sku}>
                          {wp.product_sku || wp.standalone_sku}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <span className="block truncate font-mono" title={wp.product_barcode || wp.standalone_barcode || "-"}>
                      {wp.product_barcode || wp.standalone_barcode || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="block truncate rounded px-2 py-1 text-[11px] font-bold uppercase text-blue-800"
                      title={wp.product_type_name || wp.standalone_type_name || "-"}
                    >
                      {wp.product_type_name || wp.standalone_type_name || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-700">
                    {(wp.product_price || wp.standalone_price || 0) > 0
                      ? `฿${((wp.product_price || wp.standalone_price) || 0).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex flex-col">
                      {editingQty[wp.product_id] ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            className="w-16 rounded-lg border border-blue-400 px-2 py-1 text-sm font-semibold text-center outline-none ring-2 ring-blue-100 transition-all duration-200"
                            min={0}
                            onChange={(e) =>
                              setEditingQtyValues((prev) => ({ ...prev, [wp.product_id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmQtyEdit(wp.product_id);
                              if (e.key === "Escape") cancelQtyEdit(wp.product_id);
                            }}
                            type="number"
                            value={editingQtyValues[wp.product_id] ?? String(wp.quantity)}
                          />
                        </div>
                      ) : (
                        <>
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                              (wp.product_quantity ?? wp.quantity) <= 0
                                ? "text-rose-700"
                                : wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock
                                  ? "text-amber-700"
                                  : "text-slate-900"
                            }`}
                          >
                            {(wp.product_quantity ?? wp.quantity) <= 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                <X className="h-3.5 w-3.5" />
                                {dictionary.outOfStockLabel}
                              </span>
                            ) : (
                              <>
                                {wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock ? (
                                  <AlertTriangle
                                    aria-label={dictionary.lowStockLabel}
                                    className="h-4 w-4 text-amber-500"
                                  />
                                ) : null}
                                <span>
                                  {wp.product_max_stock != null
                                    ? `${wp.quantity} / ${wp.product_max_stock}`
                                    : wp.quantity}
                                  {wp.product_unit_name || wp.standalone_unit_name ? ` ${wp.product_unit_name || wp.standalone_unit_name}` : ""}
                                </span>
                              </>
                            )}
                          </span>
                          {(wp.product_min_stock != null && wp.product_min_stock > 0) || wp.product_max_stock != null ? (
                            <span
                              className={`mt-0.5 text-[11px] ${
                                (wp.product_quantity ?? wp.quantity) <= 0
                                  ? "text-rose-400"
                                  : wp.product_min_stock != null && wp.product_min_stock > 0 && wp.quantity <= wp.product_min_stock
                                    ? "text-amber-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {wp.product_min_stock != null && wp.product_min_stock > 0 ? `Min ${wp.product_min_stock}` : ""}
                              {wp.product_min_stock != null && wp.product_min_stock > 0 && wp.product_max_stock != null ? " / " : ""}
                              {wp.product_max_stock != null ? `Max ${wp.product_max_stock}` : ""}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingQty[wp.product_id] ? (
                        <>
                          <button
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                            onClick={() => confirmQtyEdit(wp.product_id)}
                            type="button"
                          >
                            {dictionary.saveLabel}
                          </button>
                          <button
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                            onClick={() => cancelQtyEdit(wp.product_id)}
                            type="button"
                          >
                            {dictionary.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            disabled={!(wp.product_barcode || wp.standalone_barcode)}
                            onClick={() => setPreviewSku(wp.product_barcode || wp.standalone_barcode || null)}
                            title={dictionary.barcodeTooltip}
                            type="button"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => startQtyEdit(wp)}
                            title={dictionary.editQtyTitle}
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                            onClick={() => handleRemoveProduct(wp.product_id)}
                            title={dictionary.deleteLabel}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {whTotal > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{dictionary.showingLabel} {whStart + 1}-{Math.min(whEnd, whTotal)} {dictionary.fromLabel} {whTotal} {dictionary.itemsLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500" htmlFor="wh-page-size">{dictionary.perPageLabel}</label>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300"
                id="wh-page-size"
                onChange={(e) => {
                  setWhPageSize(Number(e.target.value));
                  setWhPage(1);
                  localStorage.setItem("warehouse-page-size", e.target.value);
                }}
                value={whPageSize}
              >
                {[5, 10, 15, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={whPage <= 1}
                onClick={() => setWhPage((p) => Math.max(p - 1, 1))}
                type="button"
              >
                {dictionary.prevLabel}
              </button>
              {(() => {
                const startPage = Math.max(whPage - 2, 1);
                const endPage = Math.min(startPage + 4, whTotalPages);
                const pages = [];
                for (let i = startPage; i <= endPage; i++) pages.push(i);
                return pages.map((page) => (
                  <button
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      page === whPage
                        ? "bg-blue-700 text-white"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                    key={page}
                    onClick={() => setWhPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ));
              })()}
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={whPage >= whTotalPages}
                onClick={() => setWhPage((p) => Math.min(p + 1, whTotalPages))}
                type="button"
              >
                {dictionary.nextLabel}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Barcode Preview Modal */}
      {previewSku ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {dictionary.barcodeTitle}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  onClick={() => printBarcode(previewBarcodeSvg, previewSku)}
                  type="button"
                >
                  <Printer className="h-4 w-4" />
                  {dictionary.printLabel}
                </button>
                <button
                  aria-label={dictionary.closeLabel}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setPreviewSku(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              {previewBarcodeSvg ? (
                <img
                  alt={`${dictionary.barcodeTooltip} ${previewSku}`}
                  className="mx-auto h-auto max-w-full"
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(previewBarcodeSvg)}`}
                />
              ) : (
                <p className="text-center text-sm text-slate-500">
                  {previewSku?.trim()
                    ? dictionary.invalidBarcodeLabel
                    : dictionary.noBarcodeLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Create/Edit Warehouse Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45"
          onClick={() => { setIsModalOpen(false); resetForm(); }}
        >
          <div
            className="h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                {editingId ? dictionary.editTitle : dictionary.createTitle}
              </p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                {editingId ? dictionary.editTitle : dictionary.createTitle}
              </h2>
            </div>

            <div className="h-[calc(90vh-108px)] overflow-y-auto p-6">
              <div className="flex items-center justify-end">
                <button
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  type="button"
                >
                  {dictionary.cancel}
                </button>
              </div>

              <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900">{dictionary.nameLabel}</h3>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.nameLabel}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">required</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder={dictionary.nameLabel}
                          value={form.name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.codeLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                          placeholder={dictionary.codeLabel}
                          value={form.code}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.phoneLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder={dictionary.phoneLabel}
                          value={form.phone}
                        />
                      </label>
                    </div>
                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.contactNameLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                          placeholder={dictionary.contactNameLabel}
                          value={form.contact_name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span>{dictionary.addressLabel}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">optional</span>
                        </span>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                          placeholder={dictionary.addressLabel}
                          rows={3}
                          value={form.address}
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <span className="text-sm font-medium text-slate-700">{dictionary.activeLabel}</span>
                    <button
                      aria-checked={form.is_active}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        form.is_active ? "bg-blue-700" : "bg-slate-300"
                      }`}
                      onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                      role="switch"
                      type="button"
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        form.is_active ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </label>
                </section>

                {error && (
                  <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4">
                  <p className="max-w-xl text-sm text-slate-500">{editingId ? dictionary.editTitle : dictionary.createTitle}</p>
                  <div className="flex justify-end gap-3">
                    <button
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => { setIsModalOpen(false); resetForm(); }}
                      type="button"
                    >
                      {dictionary.cancel}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-400"
                      disabled={!isFormValid || isPending}
                      type="submit"
                    >
                      {isPending ? (
                        <>
                          <svg aria-hidden="true" className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-90" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                          </svg>
                          <span>{dictionary.saveButton}</span>
                        </>
                      ) : (
                        dictionary.saveButton
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Warehouses Modal */}
      {isManageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45"
          onClick={() => setIsManageModalOpen(false)}
        >
          <div
            className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                  {dictionary.title}
                </p>
                <h3 className="mt-1 text-xl font-bold">{dictionary.title}</h3>
                <p className="mt-0.5 text-sm text-white/80">{warehouses.length} {dictionary.productsLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/30"
                  onClick={openCreateModal}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {dictionary.createButton}
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/20"
                  onClick={() => setIsManageModalOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <WarehouseIcon className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">{dictionary.empty}</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500">
                      <th className="w-[28%] rounded-l-lg px-4 py-3 font-bold">{dictionary.nameLabel}</th>
                      <th className="w-[16%] px-4 py-3 font-bold">{dictionary.codeLabel}</th>
                      <th className="w-[18%] px-4 py-3 font-bold">{dictionary.phoneLabel}</th>
                      <th className="w-[20%] px-4 py-3 font-bold">{dictionary.contactNameLabel}</th>
                      <th className="w-[8%] px-4 py-3 text-center font-bold">Status</th>
                      <th className="w-[10%] rounded-r-lg px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warehouses.map((warehouse, wi) => (
                      <tr key={warehouse.id} className={`${wi % 2 === 1 ? "bg-slate-50/50" : "bg-white"} transition hover:bg-slate-50`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <WarehouseIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate text-sm font-medium text-slate-900">{warehouse.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{warehouse.code ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{warehouse.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{warehouse.contact_name ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            warehouse.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}>
                            {warehouse.is_active ? dictionary.activeLabel : dictionary.inactiveLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => { setIsManageModalOpen(false); openEditModal(warehouse); }}
                              title={dictionary.editLabel}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {deleteConfirmId === warehouse.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  className="inline-flex h-6 items-center rounded-lg bg-red-600 px-2 text-[10px] font-semibold text-white transition hover:bg-red-700"
                                  onClick={() => handleDelete(warehouse.id)}
                                  type="button"
                                >
                                  {dictionary.deleteConfirm}
                                </button>
                                <button
                                  className="inline-flex h-6 items-center rounded-lg bg-slate-100 px-2 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200"
                                  onClick={() => setDeleteConfirmId(null)}
                                  type="button"
                                >
                                  {dictionary.cancel}
                                </button>
                              </div>
                            ) : (
                              <button
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                onClick={() => setDeleteConfirmId(warehouse.id)}
                                title={dictionary.deleteLabel}
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
