"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Search, Trash2, X } from "lucide-react";

import { authorizedApiRequest } from "@/services/api";
import { getCurrentStoreId } from "@/lib/store-storage";
import { listProducts } from "@/services/products";
import { createDocument } from "@/services/documents";
import { listShippingAddresses } from "@/services/customers";
import { toast } from "@/components/ui/toast";
import { ScanButton } from "@/components/shared/scan-button";
import type { CreateDocumentPayload, DocumentType } from "@/types/document";
import type { Product } from "@/types/product";
import type { ShippingAddress } from "@/types/customer";

// Sentinel value for the "type the address myself" picker option.
const MANUAL_ADDRESS = "__manual__";

type Customer = {
  id: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  shipping_contact?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_province?: string | null;
  shipping_district?: string | null;
  shipping_postal_code?: string | null;
  delivery_note?: string | null;
  shipping_addresses?: ShippingAddress[];
};

type Dict = {
  createTitle: string;
  createSubtitle: string;
  selectCustomer: string;
  documentDate: string;
  optionalDueDate: string;
  validUntil?: string;
  description: string;
  productSearch: string;
  scanWithCamera: string;
  productNotFound: string;
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
  typeDeliveryOrder?: string;
  selectShippingAddressLabel?: string;
  shippingAddressManual?: string;
  shippingAddressEmpty?: string;
  shippingAddressLoading?: string;
  shippingAddressDefault?: string;
};

type LineItem = {
  product_id?: string;
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

const TYPE_LABELS: Record<string, keyof Dict> = {
  INVOICE: "typeInvoice", RECEIPT: "typeReceipt", TAX_INVOICE: "typeTaxInvoice",
  QUOTATION: "typeQuotation", BILL: "typeBill", CREDIT_NOTE: "typeCreditNote",
  DELIVERY_ORDER: "typeDeliveryOrder",
};

// Types a user may hand-author here. RECEIPT is excluded — receipts come from POS
// sales, never from this modal.
const CREATABLE_TYPES: DocumentType[] = [
  "INVOICE", "TAX_INVOICE", "QUOTATION", "BILL", "CREDIT_NOTE", "DELIVERY_ORDER",
];

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
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState("");
  const [docDate, setDocDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const [validUntil, setValidUntil] = useState("");
  // Delivery order fields
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryContact, setDeliveryContact] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [invoiceRefNo, setInvoiceRefNo] = useState("");
  const [poRefNo, setPoRefNo] = useState("");
  const [creditTermDays, setCreditTermDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, discount_type: "", discount_value: 0 },
  ]);
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const productWrapperRef = useRef<HTMLDivElement>(null);
  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the customer we've already auto-applied a default address for, so the
  // auto-apply effect fires once per customer (and never clobbers manual edits).
  const appliedCustomerRef = useRef<string>("");

  useEffect(() => { setStoreId(getCurrentStoreId()); }, []);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers-simple", storeId],
    queryFn: async () => {
      const res = await authorizedApiRequest<Customer[]>(`/api/stores/${storeId}/customers`);
      return res.data;
    },
    enabled: !!storeId,
  });

  // The customer LIST endpoint does not embed shipping_addresses (only the detail
  // endpoint does), so fetch the selected customer's saved delivery addresses
  // on-demand. Only needed when authoring a Delivery Order.
  const { data: shippingAddrs = [], isLoading: addrsLoading } = useQuery<ShippingAddress[]>({
    queryKey: ["customer-shipping-addresses", storeId, customerId],
    queryFn: async () => (await listShippingAddresses(customerId)).data ?? [],
    enabled: !!storeId && !!customerId && docType === "DELIVERY_ORDER",
  });

  const { data: productsRaw = [] } = useQuery<Product[]>({
    queryKey: ["products-for-doc", storeId],
    queryFn: async () => {
      const res = await listProducts({ limit: 500 });
      return Array.isArray(res.data) ? res.data : ((res.data as { items: Product[] }).items ?? []);
    },
    enabled: !!storeId,
  });

  const filteredProducts = (() => {
    const kw = productSearch.trim().toLowerCase();
    const list = kw
      ? productsRaw.filter((p) =>
          p.name?.toLowerCase().includes(kw) ||
          (p.sku ?? "").toLowerCase().includes(kw) ||
          (p.barcode ?? "").toLowerCase().includes(kw),
        )
      : [...productsRaw];
    return list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "th"));
  })();

  // One-line summary of a saved address (for option labels + preview).
  function addrSummary(a: ShippingAddress): string {
    return [a.address, a.sub_district, a.district, a.province, a.postal_code]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
  }

  // Fills the Delivery Order block from a saved shipping address.
  function applyShippingAddress(addr: ShippingAddress, c: Customer) {
    if (addr.use_customer_address) {
      setDeliveryContact(c.full_name || "");
      setDeliveryPhone(c.phone?.trim() || "");
      setDeliveryAddress(c.address?.trim() || "");
    } else {
      setDeliveryContact(addr.recipient_name || c.full_name || "");
      setDeliveryPhone(addr.recipient_phone || c.phone?.trim() || "");
      setDeliveryAddress(addrSummary(addr) || c.address?.trim() || "");
      if (addr.note) setNotes((prev) => (prev.trim() ? prev : addr.note));
    }
  }

  // Falls back to the customer's legacy single shipping profile / main address.
  function applyLegacyShipping(c: Customer) {
    const shipAddr = [c.shipping_address, c.shipping_district, c.shipping_province, c.shipping_postal_code]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
    setDeliveryContact(c.shipping_contact?.trim() || c.full_name || "");
    setDeliveryPhone(c.shipping_phone?.trim() || c.phone?.trim() || "");
    setDeliveryAddress(shipAddr || c.address?.trim() || "");
    const note = c.delivery_note?.trim();
    if (note) setNotes((prev) => (prev.trim() ? prev : note));
  }

  // User picks an address from the dropdown. MANUAL keeps the current fields so the
  // user can type a one-off address.
  function handleShippingAddressPick(addrId: string) {
    setSelectedShippingAddressId(addrId);
    if (addrId === MANUAL_ADDRESS) return;
    const c = customers.find((x) => x.id === customerId);
    const addr = shippingAddrs.find((a) => a.id === addrId);
    if (addr && c) applyShippingAddress(addr, c);
  }

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    setSelectedShippingAddressId("");
    // Allow the auto-apply effect to run again for the newly chosen customer.
    appliedCustomerRef.current = "";
    if (docType === "DELIVERY_ORDER") {
      // Clear stale delivery fields; the effect refills once addresses load.
      setDeliveryContact("");
      setDeliveryPhone("");
      setDeliveryAddress("");
    }
  }

  // Once the selected customer's saved addresses have loaded, auto-apply the default
  // (or first) address — exactly once per customer, so manual edits aren't clobbered.
  useEffect(() => {
    if (docType !== "DELIVERY_ORDER" || !customerId || addrsLoading) return;
    if (appliedCustomerRef.current === customerId) return;
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    appliedCustomerRef.current = customerId;
    if (shippingAddrs.length > 0) {
      const def = shippingAddrs.find((a) => a.is_default) ?? shippingAddrs[0];
      setSelectedShippingAddressId(def.id);
      applyShippingAddress(def, c);
    } else {
      applyLegacyShipping(c);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddrs, addrsLoading, customerId, docType]);

  function addProductToItems(product: Product) {
    const price = Number(product.effective_price ?? product.base_price ?? 0);
    setItems((prev) => {
      // ถ้ามี product_id นี้อยู่แล้ว → เพิ่ม qty แทน
      const existing = prev.findIndex((it) => it.product_id === product.id);
      if (existing !== -1) {
        return prev.map((it, idx) =>
          idx === existing ? { ...it, quantity: it.quantity + 1 } : it,
        );
      }
      // ถ้า row สุดท้ายว่าง → แทนที่
      const last = prev[prev.length - 1];
      if (last && !last.description && last.unit_price === 0) {
        return prev.slice(0, -1).concat({
          product_id: product.id,
          description: product.name,
          quantity: 1,
          unit_price: price,
          discount_type: "",
          discount_value: 0,
        });
      }
      return [...prev, {
        product_id: product.id,
        description: product.name,
        quantity: 1,
        unit_price: price,
        discount_type: "",
        discount_value: 0,
      }];
    });
    setProductSearch("");
    setShowProductList(false);
  }

  // Resolve a typed or scanned code to an exact SKU/barcode match and add it. Shared by
  // the search field (Enter) and the camera scanner; addProductToItems clears the search.
  function addByCode(raw: string): boolean {
    const code = raw.trim().toLowerCase();
    if (!code) return false;
    const found = productsRaw.find(
      (p) => (p.barcode ?? "").toLowerCase() === code || (p.sku ?? "").toLowerCase() === code,
    );
    if (!found) return false;
    addProductToItems(found);
    return true;
  }

  // Barcode scanner listener
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === "Enter" && barcodeBuffer.current.length > 2) {
        const code = barcodeBuffer.current.trim().toLowerCase();
        const found = productsRaw.find(
          (p) => (p.barcode ?? "").toLowerCase() === code || (p.sku ?? "").toLowerCase() === code,
        );
        if (found) addProductToItems(found);
        barcodeBuffer.current = "";
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsRaw]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") triggerClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productWrapperRef.current && !productWrapperRef.current.contains(e.target as Node)) {
        setShowProductList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function triggerClose() { setIsClosing(true); }
  function handleAnimEnd() { if (isClosing) onClose(); }

  const hasProducts = items.some((it) => it.description !== "" || it.unit_price > 0);

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
      valid_until: validUntil || undefined,
      delivery_date: deliveryDate || undefined,
      delivery_address: deliveryAddress || undefined,
      delivery_contact: deliveryContact || undefined,
      delivery_phone: deliveryPhone || undefined,
      invoice_ref_no: invoiceRefNo || undefined,
      po_ref_no: poRefNo || undefined,
      credit_term_days: creditTermDays || undefined,
      vat_rate: vatEnabled ? 7 : 0,
      notes: notes || undefined,
      items: items.map((it) => ({
        product_id: it.product_id,
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
          style={{ fontSize: "101.5%" }}
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
            <div className="hidden items-center gap-1 rounded-lg bg-violet-700/50 p-1 md:flex">
              {CREATABLE_TYPES.map((t) => (
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
                {CREATABLE_TYPES.map((t) => (
                  <option key={t} value={t}>{d[TYPE_LABELS[t]] as string}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.selectCustomer}
                </label>
                <select
                  className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">— {d.selectCustomer} —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Shipping address picker — pick from the customer's saved delivery
                  addresses (fetched on-demand). Always shown for a Delivery Order once
                  a customer is chosen. */}
              {docType === "DELIVERY_ORDER" && customerId && (() => {
                const selectedAddr = shippingAddrs.find((a) => a.id === selectedShippingAddressId);
                return (
                  <div className="md:col-span-3">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {d.selectShippingAddressLabel ?? "เลือกที่อยู่จัดส่ง"}
                    </label>
                    {addrsLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-2.5 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                        {d.shippingAddressLoading ?? "กำลังโหลดที่อยู่จัดส่ง..."}
                      </div>
                    ) : (
                      <>
                        <select
                          className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          value={selectedShippingAddressId || MANUAL_ADDRESS}
                          onChange={(e) => handleShippingAddressPick(e.target.value)}
                        >
                          {shippingAddrs.map((a) => (
                            <option key={a.id} value={a.id}>
                              {(a.label || a.recipient_name || addrSummary(a) || "ที่อยู่จัดส่ง")}
                              {a.is_default ? `  ★ ${d.shippingAddressDefault ?? "ค่าเริ่มต้น"}` : ""}
                            </option>
                          ))}
                          <option value={MANUAL_ADDRESS}>
                            {d.shippingAddressManual ?? "✏️ กรอกที่อยู่เอง"}
                          </option>
                        </select>

                        {shippingAddrs.length === 0 && (
                          <p className="mt-1.5 text-xs text-amber-600">
                            {d.shippingAddressEmpty ??
                              "ลูกค้านี้ยังไม่มีที่อยู่จัดส่งที่บันทึกไว้ — กรอกด้านล่างได้เลย หรือเพิ่มในเมนูลูกค้า"}
                          </p>
                        )}

                        {/* Read-only preview of the chosen saved address */}
                        {selectedAddr && selectedShippingAddressId !== MANUAL_ADDRESS && (
                          <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {selectedAddr.recipient_name || "—"}
                              </span>
                              {selectedAddr.recipient_phone && (
                                <span className="nums text-xs text-slate-500">{selectedAddr.recipient_phone}</span>
                              )}
                              {selectedAddr.is_default && (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                  ★ {d.shippingAddressDefault ?? "ค่าเริ่มต้น"}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 leading-relaxed text-slate-600">
                              {selectedAddr.use_customer_address
                                ? (customers.find((x) => x.id === customerId)?.address?.trim() || "—")
                                : (addrSummary(selectedAddr) || "—")}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

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

              {docType === "QUOTATION" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {d.validUntil ?? "ยืนราคาถึง"}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              )}

              {docType === "DELIVERY_ORDER" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    วันที่จัดส่ง
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Delivery Order specific fields */}
            {docType === "DELIVERY_ORDER" && (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    สถานที่จัดส่ง
                  </label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="ที่อยู่จัดส่ง"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ผู้ติดต่อ
                  </label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="ชื่อผู้ติดต่อ"
                    value={deliveryContact}
                    onChange={(e) => setDeliveryContact(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="0XX-XXX-XXXX"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    อ้างอิงใบแจ้งหนี้ (Invoice Ref.)
                  </label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="INV-xxxx"
                    value={invoiceRefNo}
                    onChange={(e) => setInvoiceRefNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    เลขที่ใบสั่งซื้อ (PO No.)
                  </label>
                  <input
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="PO-xxxx"
                    value={poRefNo}
                    onChange={(e) => setPoRefNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    เครดิต (วัน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="0"
                    value={creditTermDays || ""}
                    onChange={(e) => setCreditTermDays(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Product search + barcode + camera */}
            <div className="relative mt-4" ref={productWrapperRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={productSearchRef}
                    className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder={d.productSearch}
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductList(true); }}
                    onFocus={() => setShowProductList(true)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      // Exact scan/SKU hit adds directly; otherwise add the top match.
                      if (addByCode(productSearch)) return;
                      if (filteredProducts[0]) addProductToItems(filteredProducts[0]);
                    }}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => { setProductSearch(""); setShowProductList(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ScanButton
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 transition-colors hover:border-violet-300 hover:bg-violet-50"
                  onScan={(code) => {
                    if (!addByCode(code)) { setProductSearch(code); setShowProductList(true); }
                  }}
                  title={d.scanWithCamera}
                />
              </div>
              {showProductList && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-violet-100 bg-white shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">{d.productNotFound}</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToItems(p)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-violet-50"
                      >
                        <div>
                          <span className="font-medium text-slate-800">{p.name}</span>
                          {p.sku && <span className="ml-2 text-xs text-slate-400">{p.sku}</span>}
                        </div>
                        <span className="nums text-sm font-semibold text-violet-700">
                          ฿{Number(p.effective_price ?? p.base_price ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Line items */}
            <div className={`mt-3 transition-opacity duration-200 ${!hasProducts ? "pointer-events-none opacity-40" : ""}`}>
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
                          {item.product_id ? (
                            <span className="block truncate px-2.5 py-1.5 text-sm font-medium text-slate-700">{item.description}</span>
                          ) : (
                            <input
                              className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              placeholder={d.description}
                              value={item.description}
                              onChange={(e) => updateItem(i, "description", e.target.value)}
                            />
                          )}
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
                          {item.product_id ? (
                            <span className="block px-2.5 py-1.5 text-right nums text-sm font-medium text-slate-700">
                              {item.unit_price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <input
                              type="number" min={0} step="0.01"
                              className="w-full rounded-lg border border-violet-200 px-2.5 py-1.5 text-right nums text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              value={item.unit_price}
                              onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right nums text-sm font-semibold text-slate-800">
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

            {/* Totals + VAT + Notes */}
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
                  <span className="nums">{fmt(subtotal)}</span>
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
                    <span className="nums">{fmt(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-violet-100 pt-2 font-semibold text-slate-800">
                  <span>{d.total}</span>
                  <span className="nums text-violet-700">{fmt(total)}</span>
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
